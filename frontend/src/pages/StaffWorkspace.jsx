import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navigation from '../components/Navigation';
import {
  CheckSquare,
  UserCheck,
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
  UserPlus,
  FileText,
  Check,
  X,
  Building,
  MapPin,
  Flag,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

export default function StaffWorkspace() {
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const navigate = useNavigate();

  // Resolution Notes Modal State
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // Ticket Rejection Modal State
  const [rejectingTicket, setRejectingTicket] = useState(null);
  const [rejectionCategory, setRejectionCategory] = useState('Not my department');
  const [customRejectionDetails, setCustomRejectionDetails] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Flag for Admin Review Modal State (Part 6)
  const [flaggingTicket, setFlaggingTicket] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

  useEffect(() => {
    fetchStaffWorkqueue();
  }, []);

  const fetchStaffWorkqueue = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch assigned tickets for logged in staff
      const assignedRes = await api.get('/staff/tickets');
      if (assignedRes.data.success) {
        setAssignedTickets(assignedRes.data.data);
      }

      // 2. Fetch unassigned tickets queue (PENDING or OPEN)
      const pendingRes = await api.get('/tickets?status=PENDING');
      const openRes = await api.get('/tickets?status=OPEN');
      
      let combined = [];
      if (pendingRes.data.success) combined = [...combined, ...pendingRes.data.data];
      if (openRes.data.success) combined = [...combined, ...openRes.data.data];

      // Remove duplicates and filter unassigned
      const uniqueUnassigned = Array.from(
        new Map(combined.filter((t) => !t.assignedTo).map((item) => [item._id, item])).values()
      );

      setUnassignedTickets(uniqueUnassigned);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff workqueue');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTicket = async (ticketId) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/assign`, {});
      if (response.data.success) {
        fetchStaffWorkqueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to claim ticket');
    }
  };

  // Status Change Handler with Resolution Notes Requirement
  const handleInitiateStatusChange = (ticket, targetStatus) => {
    if (targetStatus === 'RESOLVED') {
      setResolvingTicket(ticket);
      setResolutionNotes('');
      return;
    }

    executeStatusUpdate(ticket._id, targetStatus);
  };

  const executeStatusUpdate = async (ticketId, targetStatus, notes = '') => {
    try {
      const payload = { status: targetStatus };
      if (notes) payload.resolutionNotes = notes;

      const response = await api.put(`/tickets/${ticketId}/status`, payload);
      if (response.data.success) {
        setResolvingTicket(null);
        setResolutionNotes('');
        fetchStaffWorkqueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update ticket status');
    }
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      alert('Please provide resolution notes explaining how the issue was resolved.');
      return;
    }

    setIsSubmittingResolution(true);
    await executeStatusUpdate(resolvingTicket._id, 'RESOLVED', resolutionNotes);
    setIsSubmittingResolution(false);
  };

  // Staff Accept Workflow: ASSIGNED -> IN_PROGRESS
  const handleAcceptTicket = async (ticket) => {
    await executeStatusUpdate(ticket._id, 'IN_PROGRESS');
  };

  // Staff Reject Workflow: Open Rejection Modal
  const handleInitiateRejection = (ticket) => {
    setRejectingTicket(ticket);
    setRejectionCategory('Not my department');
    setCustomRejectionDetails('');
  };

  // Submit Rejection: ASSIGNED -> PENDING (Unassigned with Reason)
  const handleSubmitRejection = async (e) => {
    e.preventDefault();
    if (!rejectingTicket) return;

    let fullReason = rejectionCategory;
    if (customRejectionDetails.trim()) {
      fullReason = `${rejectionCategory}: ${customRejectionDetails.trim()}`;
    }

    setIsSubmittingRejection(true);
    try {
      const response = await api.put(`/tickets/${rejectingTicket._id}/reject`, { reason: fullReason });
      if (response.data.success) {
        setRejectingTicket(null);
        setCustomRejectionDetails('');
        fetchStaffWorkqueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject ticket');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Staff Flags Ticket for Admin Review (Part 6)
  const handleInitiateFlag = (ticket) => {
    setFlaggingTicket(ticket);
    setFlagReason('');
  };

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!flaggingTicket) return;
    if (!flagReason.trim()) {
      alert('Please enter a clear reason for administrative review.');
      return;
    }

    setIsSubmittingFlag(true);
    try {
      const response = await api.put(`/tickets/${flaggingTicket._id}/flag`, { reason: flagReason.trim() });
      if (response.data.success) {
        setFlaggingTicket(null);
        setFlagReason('');
        fetchStaffWorkqueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to flag ticket for review');
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  // Metrics
  const totalAssigned = assignedTickets.length;
  const inProgressCount = assignedTickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = assignedTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const flaggedCount = assignedTickets.filter((t) => t.adminReviewRequired).length;

  // Filtered Tickets by Tab
  const filteredTickets = assignedTickets.filter((t) => {
    if (activeTab === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (activeTab === 'RESOLVED') return t.status === 'RESOLVED' || t.status === 'CLOSED';
    if (activeTab === 'FLAGGED') return t.adminReviewRequired;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '3rem' }}>
      <Navigation />

      <main style={{ maxWidth: '1150px', margin: '2rem auto 0 auto', padding: '0 1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={24} color="var(--color-accent)" /> Dedicated Support Staff Workspace
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Claim incoming customer requests, investigate issues, and provide resolution details.
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger-text)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Staff Workload KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Unassigned Queue</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#D97706', marginTop: '0.2rem' }}>{unassignedTickets.length}</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3B82F6' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>My Total Workload</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1D4ED8', marginTop: '0.2rem' }}>{totalAssigned}</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-warning-text)', marginTop: '0.2rem' }}>{inProgressCount}</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Resolved / Closed</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success-text)', marginTop: '0.2rem' }}>{resolvedCount}</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Flagged for Review</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#DC2626', marginTop: '0.2rem' }}>{flaggedCount}</div>
          </div>
        </div>

        {/* Unassigned Tickets Queue */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} color="var(--color-warning)" /> Unassigned Ticket Queue
            </span>
            <span className="badge badge-warning">{unassignedTickets.length} Pending</span>
          </h2>

          {unassignedTickets.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              No unassigned tickets in queue. All incoming requests are claimed!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {unassignedTickets.map((ticket) => (
                <div key={ticket._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>{ticket.ticketNumber}</strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.4rem', backgroundColor: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                        {ticket.category}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'var(--color-danger-text)' : 'var(--color-text-secondary)' }}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{ticket.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span>Requester: {ticket.createdBy?.name}</span>
                      {ticket.location && <span>• Location: {ticket.location}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => navigate(`/tickets/${ticket._id}`)}
                      style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--color-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleClaimTicket(ticket._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, borderRadius: 'var(--radius-md)' }}
                    >
                      <UserCheck size={14} /> Claim Ticket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Tickets Workspace with Filter Tabs */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <FileText size={18} color="var(--color-accent)" /> My Assigned Tickets Workspace
            </h2>

            {/* Filter Tabs (Part 10) */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('ALL')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: activeTab === 'ALL' ? 'var(--color-primary)' : 'var(--color-bg)', color: activeTab === 'ALL' ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                All ({totalAssigned})
              </button>
              <button
                onClick={() => setActiveTab('IN_PROGRESS')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: activeTab === 'IN_PROGRESS' ? 'var(--color-primary)' : 'var(--color-bg)', color: activeTab === 'IN_PROGRESS' ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                onClick={() => setActiveTab('RESOLVED')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: activeTab === 'RESOLVED' ? 'var(--color-primary)' : 'var(--color-bg)', color: activeTab === 'RESOLVED' ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                Resolved ({resolvedCount})
              </button>
              <button
                onClick={() => setActiveTab('FLAGGED')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: activeTab === 'FLAGGED' ? '#DC2626' : 'var(--color-bg)', color: activeTab === 'FLAGGED' ? '#fff' : '#DC2626', cursor: 'pointer' }}
              >
                Flagged for Review ({flaggedCount})
              </button>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              No tickets found in this tab.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredTickets.map((ticket) => (
                <div key={ticket._id} style={{ padding: '1.25rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  
                  {/* Banners for Flagged or Reopened Tickets */}
                  {ticket.adminReviewRequired && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '4px', color: '#991B1B', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      <AlertTriangle size={14} color="#DC2626" /> Flagged for Admin Review: {ticket.adminReviewReason}
                    </div>
                  )}

                  {ticket.reopenedReason && ticket.status === 'IN_PROGRESS' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '4px', color: '#92400E', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      <RotateCcw size={14} color="#D97706" /> Customer Feedback: "{ticket.reopenedReason}"
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>{ticket.ticketNumber}</strong>
                        <span className={`badge badge-${ticket.status.toLowerCase()}`}>{ticket.status}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>• {ticket.category}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'var(--color-danger-text)' : 'var(--color-text-secondary)' }}>
                          {ticket.priority}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {ticket.title}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                        Requester: <strong>{ticket.createdBy?.name}</strong> ({ticket.createdBy?.email})
                        {ticket.location && ` • Location: ${ticket.location}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/tickets/${ticket._id}`)}
                        style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--color-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Timeline & Details
                      </button>

                      {ticket.status === 'ASSIGNED' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleAcceptTicket(ticket)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', backgroundColor: '#059669', color: '#fff', fontSize: '0.8rem', fontWeight: 600, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
                          >
                            <Check size={14} /> ACCEPT
                          </button>
                          <button
                            onClick={() => handleInitiateRejection(ticket)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', backgroundColor: '#fff', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, borderRadius: 'var(--radius-md)', border: '1px solid #DC2626', cursor: 'pointer' }}
                          >
                            <X size={14} /> REJECT
                          </button>
                        </div>
                      )}

                      {ticket.status === 'IN_PROGRESS' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleInitiateStatusChange(ticket, 'RESOLVED')}
                            style={{ padding: '0.4rem 0.8rem', backgroundColor: '#10B981', color: '#fff', fontSize: '0.8rem', fontWeight: 600, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', border: 'none' }}
                          >
                            <CheckCircle2 size={15} /> Resolve with Notes
                          </button>

                          {!ticket.adminReviewRequired && (
                            <button
                              onClick={() => handleInitiateFlag(ticket)}
                              style={{ padding: '0.4rem 0.75rem', backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', fontSize: '0.8rem', fontWeight: 600, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                            >
                              <Flag size={14} /> Flag for Admin
                            </button>
                          )}
                        </div>
                      )}

                      {ticket.status === 'RESOLVED' && (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Check size={16} /> Resolved (Awaiting User Acceptance)
                        </span>
                      )}

                      {ticket.status === 'CLOSED' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                          Ticket Closed & Archived
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Resolution Notes Modal (Part 5) */}
      {resolvingTicket && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '550px', backgroundColor: '#fff', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} color="#10B981" /> Provide Resolution Documentation
              </h2>
              <button onClick={() => setResolvingTicket(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Document the solution, action taken, and outcome for ticket <strong>{resolvingTicket.ticketNumber}</strong> before marking it as RESOLVED.
            </p>

            <form onSubmit={handleSubmitResolution}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                  Resolution Notes *
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Example: Network router configuration was corrected and connectivity was restored..."
                  required
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  style={{ padding: '0.625rem 1.25rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolution || !resolutionNotes.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: '#10B981', color: '#fff', fontWeight: 600, opacity: isSubmittingResolution ? 0.7 : 1 }}
                >
                  <Check size={16} /> {isSubmittingResolution ? 'Saving...' : 'Mark as RESOLVED'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Rejection Modal */}
      {rejectingTicket && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', backgroundColor: '#fff', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} color="#DC2626" /> Reject Ticket Assignment
              </h2>
              <button onClick={() => setRejectingTicket(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Rejecting ticket <strong>{rejectingTicket.ticketNumber}</strong> will return it to the unassigned queue for administrator reassignment. Please provide a reason:
            </p>

            <form onSubmit={handleSubmitRejection}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                  Rejection Reason *
                </label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="Not my department">Not my department</option>
                  <option value="Not my skill area">Not my skill area</option>
                  <option value="Currently unavailable">Currently unavailable</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={customRejectionDetails}
                  onChange={(e) => setCustomRejectionDetails(e.target.value)}
                  rows={3}
                  placeholder="Provide context for the dispatcher..."
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRejectingTicket(null)}
                  style={{ padding: '0.625rem 1.25rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRejection}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: '#DC2626', color: '#fff', fontWeight: 600 }}
                >
                  <X size={16} /> {isSubmittingRejection ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag for Admin Review Modal (Part 6) */}
      {flaggingTicket && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', backgroundColor: '#fff', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flag size={20} color="#DC2626" /> Flag Ticket for Administrative Review
              </h2>
              <button onClick={() => setFlaggingTicket(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              If ticket <strong>{flaggingTicket.ticketNumber}</strong> is repetitive, clearly duplicate, or requires administrative decision, document the reason below:
            </p>

            <form onSubmit={handleSubmitFlag}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                  Escalation Reason *
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Example: Customer has submitted multiple tickets regarding the same resolved issue; or duplicate requests detected..."
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setFlaggingTicket(null)}
                  style={{ padding: '0.625rem 1.25rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFlag || !flagReason.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: '#DC2626', color: '#fff', fontWeight: 600 }}
                >
                  <Flag size={16} /> {isSubmittingFlag ? 'Flagging...' : 'Submit Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
