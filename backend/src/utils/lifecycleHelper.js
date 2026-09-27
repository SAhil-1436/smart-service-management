const TicketHistory = require('../models/TicketHistory');

// Allowed status lifecycle transitions map
const ALLOWED_TRANSITIONS = {
  PENDING: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'], // Retained for backwards compatibility
  ASSIGNED: ['IN_PROGRESS', 'PENDING', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'ASSIGNED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: []
};

/**
 * Validate if status transition from currentStatus to newStatus is allowed
 */
const isValidTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
};

/**
 * Automatically log an audit trail entry in TicketHistory collection
 */
const logTicketHistory = async ({ ticketId, action, previousValue = '', newValue = '', changedBy }) => {
  try {
    await TicketHistory.create({
      ticketId,
      action,
      previousValue: String(previousValue || ''),
      newValue: String(newValue || ''),
      changedBy
    });
  } catch (err) {
    console.error('[TicketHistory Error] Failed to log audit trail:', err.message);
  }
};

module.exports = {
  isValidTransition,
  logTicketHistory,
  ALLOWED_TRANSITIONS
};
