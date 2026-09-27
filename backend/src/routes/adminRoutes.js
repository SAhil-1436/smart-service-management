const express = require('express');
const router = express.Router();
const {
  getAdminDashboardStats,
  getAnalyticsData,
  getAllUsers,
  getUserHistory,
  updateUserRole,
  updateUserStatus,
  getStaffVerifications,
  reviewStaffVerification,
  downloadStaffIdCard
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('ADMIN'));

router.get('/dashboard', getAdminDashboardStats);
router.get('/analytics', getAnalyticsData);
router.get('/users', getAllUsers);
router.get('/users/:id/history', getUserHistory);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', updateUserStatus);

// Staff Verification Management Routes
router.get('/staff-verifications', getStaffVerifications);
router.put('/staff-verifications/:id/review', reviewStaffVerification);
router.get('/staff-verifications/:id/document', downloadStaffIdCard);

module.exports = router;

