const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  addComment,
  getCustomerHistory
} = require('../controllers/ticketController');
const {
  assignTicket,
  updateTicketStatus,
  rejectTicket,
  flagTicket,
  reviewFlaggedTicket,
  updateAdminFollowUp
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All ticket routes require authentication

router.route('/')
  .get(getTickets)
  .post(authorize('USER'), createTicket); // Only USER role is permitted to create service tickets

// Customer History Route (accessible to Staff, Admin, and the Customer themselves)
router.get('/customer/:customerId/history', getCustomerHistory);

router.route('/:id')
  .get(getTicketById)
  .put(updateTicket)
  .delete(authorize('ADMIN'), deleteTicket);

router.put('/:id/assign', authorize('STAFF', 'ADMIN'), assignTicket);
router.put('/:id/status', updateTicketStatus);
router.put('/:id/reject', authorize('STAFF', 'ADMIN'), rejectTicket);

// Staff Escalation & Flagging Route
router.put('/:id/flag', authorize('STAFF', 'ADMIN'), flagTicket);

// Admin Review & Decision Route
router.put('/:id/admin-review', authorize('ADMIN'), reviewFlaggedTicket);

// Admin Personal Follow-Up Route
router.put('/:id/admin-followup', authorize('ADMIN'), updateAdminFollowUp);

router.post('/:id/comments', addComment);

module.exports = router;

