const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const StaffVerification = require('../models/StaffVerification');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @desc    Get admin dashboard stats & overall system summary
 * @route   GET /api/admin/dashboard
 * @access  Private (ADMIN)
 */
const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments({ role: 'USER' });
  const totalStaff = await User.countDocuments({ role: 'STAFF' });
  const totalAdmins = await User.countDocuments({ role: 'ADMIN' });

  const totalTickets = await Ticket.countDocuments();
  const openTickets = await Ticket.countDocuments({ status: 'OPEN' });
  const inProgressTickets = await Ticket.countDocuments({ status: 'IN_PROGRESS' });
  const resolvedTickets = await Ticket.countDocuments({ status: 'RESOLVED' });
  const closedTickets = await Ticket.countDocuments({ status: 'CLOSED' });
  const unassignedTickets = await Ticket.countDocuments({ assignedTo: null });
  const flaggedTickets = await Ticket.countDocuments({ adminReviewRequired: true });
  const followUpTickets = await Ticket.countDocuments({ adminFollowUpRequired: true });

  sendSuccess(res, {
    users: {
      total: totalUsers + totalStaff + totalAdmins,
      clients: totalUsers,
      staff: totalStaff,
      admins: totalAdmins
    },
    tickets: {
      total: totalTickets,
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      closed: closedTickets,
      unassigned: unassignedTickets,
      flagged: flaggedTickets,
      followUp: followUpTickets
    }
  }, 'Admin dashboard metrics retrieved successfully');
});

/**
 * @desc    Get detailed analytical data (by status, category, priority, resolution times)
 * @route   GET /api/admin/analytics
 * @access  Private (ADMIN)
 */
const getAnalyticsData = asyncHandler(async (req, res) => {
  const { range } = req.query;
  let dateThreshold = null;
  const now = new Date();

  if (range === 'day') {
    dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (range === 'week') {
    dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === 'month') {
    dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const matchStage = dateThreshold ? { $match: { createdAt: { $gte: dateThreshold } } } : null;

  // Build Aggregation Pipelines
  const buildPipeline = (extraStages = []) => {
    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);
    pipeline.push(...extraStages);
    return pipeline;
  };

  // 1. Category Distribution
  const categoryStats = await Ticket.aggregate(buildPipeline([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]));

  // 2. Priority Distribution
  const priorityStats = await Ticket.aggregate(buildPipeline([
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]));

  // 3. Status Distribution
  const statusStats = await Ticket.aggregate(buildPipeline([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]));

  // 4. Staff Workload Distribution
  const staffWorkload = await Ticket.aggregate(buildPipeline([
    { $match: { assignedTo: { $ne: null } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
    { $unwind: '$staff' },
    { $project: { name: '$staff.name', email: '$staff.email', count: 1 } }
  ]));

  // 5. Average Resolution Time (in Hours)
  const resolvedFilter = { status: { $in: ['RESOLVED', 'CLOSED'] } };
  if (dateThreshold) {
    resolvedFilter.createdAt = { $gte: dateThreshold };
  }
  const resolvedTickets = await Ticket.find(resolvedFilter);

  let avgResolutionHours = 0;
  if (resolvedTickets.length > 0) {
    const totalDurationMs = resolvedTickets.reduce((acc, t) => {
      return acc + (new Date(t.updatedAt) - new Date(t.createdAt));
    }, 0);
    avgResolutionHours = Math.round((totalDurationMs / (1000 * 60 * 60 * resolvedTickets.length)) * 10) / 10;
  }

  sendSuccess(res, {
    range: range || 'all',
    byCategory: categoryStats.map((c) => ({ category: c._id, count: c.count })),
    byPriority: priorityStats.map((p) => ({ priority: p._id, count: p.count })),
    byStatus: statusStats.map((s) => ({ status: s._id, count: s.count })),
    staffWorkload,
    resolutionMetrics: {
      resolvedCount: resolvedTickets.length,
      averageResolutionHours: avgResolutionHours
    }
  }, 'Analytics metrics calculated successfully');
});

/**
 * @desc    Get list of all registered users
 * @route   GET /api/admin/users
 * @access  Private (ADMIN)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 });

  sendSuccess(res, users, `Retrieved ${users.length} users`);
});

/**
 * @desc    Update user role (USER <-> STAFF <-> ADMIN)
 * @route   PUT /api/admin/users/:id/role
 * @access  Private (ADMIN)
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || !['USER', 'STAFF'].includes(role)) {
    return sendError(res, 'Administrator roles are fixed to the primary system administrator. Roles can only be updated between USER and STAFF.', 400);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return sendError(res, 'User account not found', 404);
  }

  // Prevent modifying primary admin's role
  if (user.role === 'ADMIN') {
    return sendError(res, 'The primary system administrator role cannot be altered.', 400);
  }

  // Business Rule: Ordinary users cannot be casually promoted to STAFF without completed credential verification
  if (role === 'STAFF') {
    const approvedVerif = await StaffVerification.findOne({ user: user._id, status: 'APPROVED' });
    if (!approvedVerif) {
      return sendError(
        res,
        'Staff role elevation requires completed credential verification. Please review and approve the staff application under Staff Verifications.',
        400
      );
    }
  }

  user.role = role;
  await user.save();

  sendSuccess(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }, `User role updated to ${role} successfully`);
});

/**
 * @desc    Get complete user profile, ticket history and metrics for Admin
 * @route   GET /api/admin/users/:id/history
 * @access  Private (ADMIN)
 */
const getUserHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return sendError(res, 'User account not found', 404);
  }

  const tickets = await Ticket.find({ createdBy: user._id })
    .populate('assignedTo', 'name email role')
    .sort({ createdAt: -1 });

  const verification = user.role === 'STAFF' || user.status === 'PENDING_VERIFICATION'
    ? await StaffVerification.findOne({ user: user._id })
    : null;

  const summary = {
    total: tickets.length,
    open: tickets.filter((t) => ['PENDING', 'OPEN', 'ASSIGNED'].includes(t.status)).length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
    closed: tickets.filter((t) => t.status === 'CLOSED').length
  };

  sendSuccess(res, {
    user,
    summary,
    verification,
    recentTickets: tickets.slice(0, 5),
    allTickets: tickets
  }, 'User profile and history retrieved successfully');
});

/**
 * @desc    Update user status (ACTIVE <-> INACTIVE)
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (ADMIN)
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return sendError(res, 'Please provide a valid status (ACTIVE, INACTIVE)', 400);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return sendError(res, 'User account not found', 404);
  }

  // Prevent admin from deactivating their own active session account
  if (user._id.toString() === req.user._id.toString() && status === 'INACTIVE') {
    return sendError(res, 'You cannot deactivate your own active administrator account', 400);
  }

  user.status = status;
  await user.save();

  sendSuccess(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  }, `User status updated to ${status} successfully`);
});

/**
 * @desc    Get all staff verification requests
 * @route   GET /api/admin/staff-verifications
 * @access  Private (ADMIN)
 */
const getStaffVerifications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? { status } : {};

  const verifications = await StaffVerification.find(filter)
    .populate('user', 'name email status role createdAt')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  sendSuccess(res, verifications, `Retrieved ${verifications.length} staff verification requests`);
});

/**
 * @desc    Review staff verification request (APPROVE or REJECT)
 * @route   PUT /api/admin/staff-verifications/:id/review
 * @access  Private (ADMIN)
 */
const reviewStaffVerification = asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return sendError(res, 'Please provide a valid review status: APPROVED or REJECTED', 400);
  }

  const verification = await StaffVerification.findById(req.params.id);
  if (!verification) {
    return sendError(res, 'Staff verification record not found', 404);
  }

  const user = await User.findById(verification.user);
  if (!user) {
    return sendError(res, 'Associated user account not found', 404);
  }

  verification.status = status;
  verification.reviewedBy = req.user._id;
  verification.reviewedAt = new Date();

  if (status === 'APPROVED') {
    verification.rejectionReason = '';
    user.role = 'STAFF';
    user.status = 'ACTIVE';
  } else {
    verification.rejectionReason = (rejectionReason || 'Staff application not approved by administrator').trim();
    user.status = 'REJECTED';
  }

  await verification.save();
  await user.save();

  sendSuccess(res, {
    verification,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  }, `Staff application has been ${status.toLowerCase()} successfully`);
});

/**
 * @desc    Securely download/view staff verification ID card
 * @route   GET /api/admin/staff-verifications/:id/document
 * @access  Private (ADMIN)
 */
const downloadStaffIdCard = asyncHandler(async (req, res) => {
  const verification = await StaffVerification.findById(req.params.id);
  if (!verification || !verification.idCardPath) {
    return sendError(res, 'Verification document record not found', 404);
  }

  if (!fs.existsSync(verification.idCardPath)) {
    return sendError(res, 'Verification document file is not found on disk', 404);
  }

  if (verification.idCardMimeType) {
    res.setHeader('Content-Type', verification.idCardMimeType);
  }
  res.setHeader('Content-Disposition', `inline; filename="${verification.idCardOriginalName}"`);
  const fileStream = fs.createReadStream(verification.idCardPath);
  fileStream.pipe(res);
});

module.exports = {
  getAdminDashboardStats,
  getAnalyticsData,
  getAllUsers,
  getUserHistory,
  updateUserRole,
  updateUserStatus,
  getStaffVerifications,
  reviewStaffVerification,
  downloadStaffIdCard
};

