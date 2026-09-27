const asyncHandler = require('express-async-handler');
const Ticket = require('../models/Ticket');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { isValidTransition, logTicketHistory } = require('../utils/lifecycleHelper');

/**
 * @desc    Get tickets assigned to the logged in staff member
 * @route   GET /api/staff/tickets
 * @access  Private (STAFF, ADMIN)
 */
const getStaffTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ assignedTo: req.user._id })
    .populate('createdBy', 'name email role')
    .sort({ updatedAt: -1 });

  sendSuccess(res, tickets, `Retrieved ${tickets.length} tickets assigned to staff`);
});

/**
 * @desc    Assign ticket to staff member (or self-claim by staff)
 * @route   PUT /api/tickets/:id/assign
 * @access  Private (STAFF self-claim, ADMIN reassign)
 */
const assignTicket = asyncHandler(async (req, res) => {
  const { staffId } = req.body;
  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return sendError(res, 'Ticket not found', 404);
  }

  const prevStaffId = ticket.assignedTo ? ticket.assignedTo.toString() : 'Unassigned';
  const targetStaffId = req.body.staffId || req.body.assignedTo || req.user._id;

  ticket.assignedTo = targetStaffId;

  // Controlled status transition: When assigned to staff, set status to ASSIGNED
  const prevStatus = ticket.status;
  ticket.status = 'ASSIGNED';

  const updatedTicket = await ticket.save();
  const populated = await Ticket.findById(updatedTicket._id)
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role');

  // Log Audit Trail History Records
  await logTicketHistory({
    ticketId: ticket._id,
    action: 'STAFF_ASSIGNED',
    previousValue: prevStaffId,
    newValue: populated.assignedTo?.name || targetStaffId,
    changedBy: req.user._id
  });

  if (prevStatus !== ticket.status) {
    await logTicketHistory({
      ticketId: ticket._id,
      action: 'STATUS_CHANGED',
      previousValue: prevStatus,
      newValue: ticket.status,
      changedBy: req.user._id
    });
  }

  sendSuccess(res, populated, 'Ticket assigned successfully');
});

/**
 * @desc    Update ticket status (PENDING -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED)
 * @route   PUT /api/tickets/:id/status
 * @access  Private (STAFF, ADMIN, Ticket Owner for CLOSED)
 */
/**
 * @desc    Update ticket status (PENDING -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED)
 * @route   PUT /api/tickets/:id/status
 * @access  Private (STAFF, ADMIN, Ticket Owner for CLOSED / REOPEN)
 */
const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status, resolutionNotes, reopenedReason } = req.body;
  const validStatuses = ['PENDING', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  if (!status || !validStatuses.includes(status)) {
    return sendError(res, 'Please provide a valid status (PENDING, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED)', 400);
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return sendError(res, 'Ticket not found', 404);
  }

  // Authorization check
  const isOwner = ticket.createdBy.toString() === req.user._id.toString();
  const isStaffOrAdmin = ['STAFF', 'ADMIN'].includes(req.user.role);

  if (!isOwner && !isStaffOrAdmin) {
    return sendError(res, 'Not authorized to change ticket status', 403);
  }

  // Enforce controlled sequential status transitions
  if (!isValidTransition(ticket.status, status)) {
    return sendError(
      res,
      `Invalid status transition from '${ticket.status}' to '${status}'. Expected sequential lifecycle order.`,
      400
    );
  }

  // Business Rule: Staff cannot close ticket on customer's behalf in normal satisfaction flow
  if (status === 'CLOSED' && req.user.role === 'STAFF') {
    return sendError(res, 'Staff members cannot close tickets. The customer must confirm resolution satisfaction, or an administrator must conduct review.', 403);
  }

  // Customers can only transition from RESOLVED to CLOSED (Satisfaction) or back to IN_PROGRESS (Request Further Assistance)
  if (isOwner && !isStaffOrAdmin) {
    if (ticket.status !== 'RESOLVED' || !['CLOSED', 'IN_PROGRESS'].includes(status)) {
      return sendError(res, 'Customers can only accept resolution to close the ticket or request further assistance.', 403);
    }
  }

  // Requirement when marking as RESOLVED: resolutionNotes are mandatory
  if (status === 'RESOLVED') {
    if (!resolutionNotes || !resolutionNotes.trim()) {
      return sendError(res, 'Resolution notes explaining the solution are required when marking a ticket as RESOLVED', 400);
    }
    ticket.resolutionNotes = resolutionNotes.trim();
    ticket.resolvedAt = new Date();
  }

  // Handle User Acceptance & Closure
  if (status === 'CLOSED') {
    ticket.closedAt = new Date();
    ticket.closedBy = req.user._id;
    if (isOwner) {
      ticket.userSatisfaction = 'SATISFIED';
    }
  }

  // Handle User Requesting Further Assistance (RESOLVED -> IN_PROGRESS)
  if (ticket.status === 'RESOLVED' && status === 'IN_PROGRESS') {
    ticket.userSatisfaction = 'UNSATISFIED';
    ticket.reopenedReason = (reopenedReason || req.body.reason || 'Customer requested further assistance').trim();
  }

  const prevStatus = ticket.status;
  ticket.status = status;

  const updatedTicket = await ticket.save();
  const populated = await Ticket.findById(updatedTicket._id)
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('closedBy', 'name email role');

  // Log Audit Trail History
  if (ticket.status === 'RESOLVED') {
    await logTicketHistory({
      ticketId: ticket._id,
      action: 'TICKET_RESOLVED',
      previousValue: prevStatus,
      newValue: ticket.resolutionNotes,
      changedBy: req.user._id
    });
  } else if (status === 'CLOSED') {
    await logTicketHistory({
      ticketId: ticket._id,
      action: isOwner ? 'RESOLUTION_ACCEPTED' : 'TICKET_CLOSED',
      previousValue: prevStatus,
      newValue: 'CLOSED',
      changedBy: req.user._id
    });
  } else if (prevStatus === 'RESOLVED' && status === 'IN_PROGRESS') {
    await logTicketHistory({
      ticketId: ticket._id,
      action: 'FURTHER_ASSISTANCE_REQUESTED',
      previousValue: 'RESOLVED',
      newValue: ticket.reopenedReason,
      changedBy: req.user._id
    });
  } else {
    await logTicketHistory({
      ticketId: ticket._id,
      action: 'STATUS_CHANGED',
      previousValue: prevStatus,
      newValue: status,
      changedBy: req.user._id
    });
  }

  sendSuccess(res, populated, `Ticket status updated to ${status}`);
});

/**
 * @desc    Reject assigned ticket by staff member
 * @route   PUT /api/tickets/:id/reject or PUT /api/staff/tickets/:id/reject
 * @access  Private (STAFF assigned to ticket, ADMIN)
 */
const rejectTicket = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const rejectionReason = (reason || '').trim();

  if (!rejectionReason) {
    return sendError(res, 'Please provide a reason for rejecting the assigned ticket', 400);
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return sendError(res, 'Ticket not found', 404);
  }

  if (ticket.status !== 'ASSIGNED' && !ticket.assignedTo) {
    return sendError(res, 'Only currently assigned tickets can be rejected', 400);
  }

  // Authorization check: Must be the assigned staff member or an ADMIN
  const isAssignedStaff = ticket.assignedTo && ticket.assignedTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isAssignedStaff && !isAdmin) {
    return sendError(res, 'Not authorized: You can only reject tickets assigned to you', 403);
  }

  const prevStaffName = req.user.name || 'Assigned Staff';
  const prevStatus = ticket.status;

  // Return ticket to unassigned PENDING queue
  ticket.assignedTo = null;
  ticket.status = 'PENDING';
  ticket.rejectionReason = rejectionReason;

  const updatedTicket = await ticket.save();
  const populated = await Ticket.findById(updatedTicket._id)
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role');

  // Log rejection in TicketHistory audit trail
  await logTicketHistory({
    ticketId: ticket._id,
    action: 'TICKET_REJECTED',
    previousValue: prevStaffName,
    newValue: `Unassigned (Reason: ${rejectionReason})`,
    changedBy: req.user._id
  });

  if (prevStatus !== 'PENDING') {
    await logTicketHistory({
      ticketId: ticket._id,
      action: 'STATUS_CHANGED',
      previousValue: prevStatus,
      newValue: 'PENDING',
      changedBy: req.user._id
    });
  }

  sendSuccess(res, populated, 'Ticket rejected and returned to unassigned queue');
});

/**
 * @desc    Flag ticket for administrative review (Repeated / duplicate / complex issue)
 * @route   PUT /api/tickets/:id/flag
 * @access  Private (STAFF assigned, ADMIN)
 */
const flagTicket = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const flagReason = (reason || '').trim();

  if (!flagReason) {
    return sendError(res, 'Please provide a clear reason for flagging this ticket for admin review', 400);
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return sendError(res, 'Ticket not found', 404);
  }

  const isAssignedStaff = ticket.assignedTo && ticket.assignedTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isAssignedStaff && !isAdmin) {
    return sendError(res, 'Not authorized: Only assigned staff or administrators can flag tickets for review', 403);
  }

  ticket.adminReviewRequired = true;
  ticket.adminReviewReason = flagReason;
  ticket.flaggedBy = req.user._id;
  ticket.flaggedAt = new Date();

  const updatedTicket = await ticket.save();
  const populated = await Ticket.findById(updatedTicket._id)
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('flaggedBy', 'name email role');

  await logTicketHistory({
    ticketId: ticket._id,
    action: 'FLAGGED_FOR_ADMIN_REVIEW',
    previousValue: 'Normal Support Queue',
    newValue: flagReason,
    changedBy: req.user._id
  });

  sendSuccess(res, populated, 'Ticket has been flagged for administrative review');
});

/**
 * @desc    Admin review and decision on flagged ticket
 * @route   PUT /api/tickets/:id/admin-review
 * @access  Private (ADMIN only)
 */
const reviewFlaggedTicket = asyncHandler(async (req, res) => {
  const { decision, adminNotes, closureReason } = req.body;
  const validDecisions = ['CONTINUE_SUPPORT', 'CLOSE_TICKET', 'REQUIRE_FOLLOWUP'];

  if (!decision || !validDecisions.includes(decision)) {
    return sendError(res, 'Please provide a valid decision: CONTINUE_SUPPORT, CLOSE_TICKET, or REQUIRE_FOLLOWUP', 400);
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return sendError(res, 'Ticket not found', 404);
  }

  const prevStatus = ticket.status;

  if (decision === 'CONTINUE_SUPPORT') {
    ticket.adminReviewRequired = false;
    ticket.adminReviewReason = '';
    if (adminNotes) ticket.adminNotes = adminNotes.trim();

    await logTicketHistory({
      ticketId: ticket._id,
      action: 'ADMIN_REVIEW_COMPLETED',
      previousValue: 'Flagged for Review',
      newValue: `Continued Normal Support: ${adminNotes || 'No notes provided'}`,
      changedBy: req.user._id
    });
  } else if (decision === 'CLOSE_TICKET') {
    ticket.status = 'CLOSED';
    ticket.closedBy = req.user._id;
    ticket.closedAt = new Date();
    ticket.adminReviewRequired = false;
    if (closureReason || adminNotes) {
      ticket.resolutionNotes = (closureReason || adminNotes).trim();
    }

    await logTicketHistory({
      ticketId: ticket._id,
      action: 'ADMIN_CLOSED_TICKET',
      previousValue: prevStatus,
      newValue: `Administrative Closure: ${closureReason || adminNotes || 'Closed after review'}`,
      changedBy: req.user._id
    });
  } else if (decision === 'REQUIRE_FOLLOWUP') {
    ticket.adminReviewRequired = false;
    ticket.adminFollowUpRequired = true;
    ticket.adminFollowUpReason = (adminNotes || ticket.adminReviewReason || 'Admin personal follow-up required').trim();
    ticket.assignedAdmin = req.user._id;
    ticket.adminFollowUpAt = new Date();
    ticket.adminNotes = (adminNotes || '').trim();

    await logTicketHistory({
      ticketId: ticket._id,
      action: 'ADMIN_FOLLOWUP_REQUIRED',
      previousValue: 'Flagged for Review',
      newValue: ticket.adminFollowUpReason,
      changedBy: req.user._id
    });
  }

  const updatedTicket = await ticket.save();
  const populated = await Ticket.findById(updatedTicket._id)
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('closedBy', 'name email role');

  sendSuccess(res, populated, `Administrative review completed: ${decision}`);
});

/**
 * @desc    Mark or update admin personal follow-up on a ticket
 * @route   PUT /api/tickets/:id/admin-followup
 * @access  Private (ADMIN only)
 */
const updateAdminFollowUp = asyncHandler(async (req, res) => {
  const { followUpRequired, reason, adminNotes } = req.body;

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return sendError(res, 'Ticket not found', 404);
  }

  const isRequired = followUpRequired !== undefined ? Boolean(followUpRequired) : true;
  ticket.adminFollowUpRequired = isRequired;

  if (isRequired) {
    ticket.adminFollowUpReason = (reason || ticket.adminFollowUpReason || 'Administrative follow-up scheduled').trim();
    ticket.assignedAdmin = req.user._id;
    ticket.adminFollowUpAt = new Date();
    if (adminNotes) ticket.adminNotes = adminNotes.trim();

    await logTicketHistory({
      ticketId: ticket._id,
      action: 'ADMIN_FOLLOWUP_REQUIRED',
      previousValue: 'Normal Support',
      newValue: ticket.adminFollowUpReason,
      changedBy: req.user._id
    });
  } else {
    ticket.adminFollowUpReason = '';
    ticket.adminFollowUpAt = null;

    await logTicketHistory({
      ticketId: ticket._id,
      action: 'ADMIN_FOLLOWUP_RESOLVED',
      previousValue: 'Follow-up Active',
      newValue: 'Follow-up completed / cleared',
      changedBy: req.user._id
    });
  }

  const updatedTicket = await ticket.save();
  const populated = await Ticket.findById(updatedTicket._id)
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('assignedAdmin', 'name email role');

  sendSuccess(res, populated, isRequired ? 'Admin follow-up has been marked as required' : 'Admin follow-up marked as completed');
});

module.exports = {
  getStaffTickets,
  assignTicket,
  updateTicketStatus,
  rejectTicket,
  flagTicket,
  reviewFlaggedTicket,
  updateAdminFollowUp
};

