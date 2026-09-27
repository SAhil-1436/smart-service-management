import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sparkles,
  MapPin,
  Building,
  History,
  Check,
  UserPlus,
  Tag,
  AlertTriangle,
  Flag,
  HelpCircle,
  FileText,
  RotateCcw,
  ExternalLink,
  X
} from 'lucide-react';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticketData, setTicketData] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // User "Request Further Assistance" Modal / Form State
  const [showFurtherHelpModal, setShowFurtherHelpModal] = useState(false);
  const [furtherHelpReason, setFurtherHelpReason] = useState('');

  // Staff "Flag for Admin Review" Modal State
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  // Admin "Review Flag" Modal State
  const [showReviewFlagModal, setShowReviewFlagModal] = useState(false);
  const [adminDecision, setAdminDecision] = useState('CONTINUE_SUPPORT');
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [adminClosureReason, setAdminClosureReason] = useState('');

  // Admin "Follow-Up" Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Customer Full History Modal State
  const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState(false);
  const [customerFullHistory, setCustomerFullHistory] = useState([]);
  const [loadingFullHistory, setLoadingFullHistory] = useState(false);

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/tickets/${id}`);
      if (response.data.success) {
        setTicketData(response.data.data.ticket);
        setComments(response.data.data.comments || []);
        setHistory(response.data.data.history || []);
        setCustomerSummary(response.data.data.customerHistorySummary || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await api.post(`/tickets/${id}/comments`, { message: newComment });
      if (response.data.success) {
        setComments((prev) => [...prev, response.data.data]);
        setNewComment('');
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // User Resolution Acceptance Action (RESOLVED -> CLOSED)
  const handleConfirmResolution = async () => {
    if (!window.confirm('Are you satisfied with the resolution provided? This will close the service request.')) return;

    setIsUpdatingStatus(true);
    try {
      const response = await api.put(`/tickets/${id}/status`, { status: 'CLOSED' });
      if (response.data.success) {
        setTicketData(response.data.data);
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close ticket');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // User Requests Further Assistance (RESOLVED -> IN_PROGRESS)
  const handleRequestFurtherAssistance = async (e) => {
    e.preventDefault();
    if (!furtherHelpReason.trim()) {
      alert('Please provide details on what further assistance is needed.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await api.put(`/tickets/${id}/status`, {
        status: 'IN_PROGRESS',
        reopenedReason: furtherHelpReason.trim()
      });
      if (response.data.success) {
        setShowFurtherHelpModal(false);
        setFurtherHelpReason('');
        setTicketData(response.data.data);
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request further assistance');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Staff Flags Ticket for Admin Review
  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!flagReason.trim()) {
      alert('Please enter a clear reason for administrative review.');
      return;
    }

    try {
      const response = await api.put(`/tickets/${id}/flag`, { reason: flagReason.trim() });
      if (response.data.success) {
        setShowFlagModal(false);
        setFlagReason('');
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to flag ticket');
    }
  };

  // Admin Review Decision
  const handleSubmitAdminReview = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/tickets/${id}/admin-review`, {
        decision: adminDecision,
        adminNotes: adminReviewNotes,
        closureReason: adminClosureReason
      });
      if (response.data.success) {
        setShowReviewFlagModal(false);
        setAdminReviewNotes('');
        setAdminClosureReason('');
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete review');
    }
  };

  // Admin Follow-Up Toggle / Update
  const handleSubmitFollowUp = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/tickets/${id}/admin-followup`, {
        followUpRequired: true,
        reason: followUpReason,
        adminNotes: followUpNotes
      });
      if (response.data.success) {
        setShowFollowUpModal(false);
        setFollowUpReason('');
        setFollowUpNotes('');
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update follow-up status');
    }
  };

  const handleClearFollowUp = async () => {
    if (!window.confirm('Mark admin personal follow-up as resolved / completed?')) return;
    try {
      const response = await api.put(`/tickets/${id}/admin-followup`, { followUpRequired: false });
      if (response.data.success) {
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear follow-up');
    }
  };

  // Fetch Full Customer History
  const handleOpenFullCustomerHistory = async () => {
    if (!ticketData?.createdBy?._id) return;
    setShowCustomerHistoryModal(true);
    setLoadingFullHistory(true);
    try {
      const response = await api.get(`/tickets/customer/${ticketData.createdBy._id}/history`);
      if (response.data.success) {
        setCustomerFullHistory(response.data.data.allTickets || []);
      }
    } catch (err) {
      alert('Failed to load complete customer history.');
    } finally {
      setLoadingFullHistory(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--color-accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
          Loading ticket details and history...
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <AlertCircle size={40} color="var(--color-danger)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Unable to load ticket</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '0.625rem 1.25rem', backgroundColor: 'var(--color-primary)', color: '#fff' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isOwner = ticketData.createdBy?._id === user?.id;
  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';

  // Combine Comments and History into a Unified Chronological Activity Timeline
  const formattedComments = comments.map((c) => ({
    id: c._id,
    type: 'COMMENT',
    timestamp: new Date(c.createdAt),
    author: c.userId?.name || 'User',
    role: c.userId?.role || 'USER',
    isCurrentUser: c.userId?._id === user?.id,
    message: c.message
  }));

  const formattedHistory = history.map((h) => ({
    id: h._id,
    type: 'AUDIT_LOG',
    action: h.action,
    timestamp: new Date(h.createdAt),
    author: h.changedBy?.name || h.changedBy?.email || 'System',
    role: h.changedBy?.role || 'SYSTEM',
    previousValue: h.previousValue,
    newValue: h.newValue
  }));

  const unifiedTimeline = [...formattedComments, ...formattedHistory].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <header style={{ backgroundColor: 'var(--color-primary)', color: '#fff', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(isAdmin ? '/admin' : isStaff ? '/staff/workspace' : '/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}
          >
            <ArrowLeft size={18} /> Back to {isAdmin ? 'Admin Console' : isStaff ? 'Staff Workspace' : 'Dashboard'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#93C5FD', fontWeight: 600 }}>{ticketData.ticketNumber}</span>
            <span className={`badge badge-${ticketData.status.toLowerCase()}`}>{ticketData.status}</span>
            {ticketData.adminReviewRequired && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                Flagged for Review
              </span>
            )}
            {ticketData.adminFollowUpRequired && (isAdmin || isStaff) && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' }}>
                Admin Follow-up Active
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1150px', margin: '2rem auto 0 auto', padding: '0 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '1.5rem' }}>
          
          {/* Left Column: Ticket Details & Unified Activity Timeline */}
          <div>
            {/* ADMINISTRATIVE REVIEW BANNER */}
            {ticketData.adminReviewRequired && (
              <div style={{ padding: '1.25rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991B1B', fontWeight: 700, fontSize: '0.95rem' }}>
                    <AlertTriangle size={20} color="#DC2626" /> Requires Administrative Review
                  </div>
                  <p style={{ color: '#B91C1C', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    <strong>Reason:</strong> {ticketData.adminReviewReason}
                  </p>
                  {ticketData.flaggedBy && (
                    <span style={{ fontSize: '0.75rem', color: '#7F1D1D' }}>
                      Flagged by {ticketData.flaggedBy.name} on {new Date(ticketData.flaggedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setShowReviewFlagModal(true)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#DC2626', color: '#fff', fontSize: '0.85rem', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}
                  >
                    Review Flag Decision
                  </button>
                )}
              </div>
            )}

            {/* ADMIN FOLLOW-UP BANNER (Internal for Staff & Admin) */}
            {ticketData.adminFollowUpRequired && (isAdmin || isStaff) && (
              <div style={{ padding: '1.25rem', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5B21B6', fontWeight: 700, fontSize: '0.95rem' }}>
                    <Shield size={18} color="#7C3AED" /> Admin Follow-up Required
                  </div>
                  <p style={{ color: '#6D28D9', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {ticketData.adminFollowUpReason}
                  </p>
                  {ticketData.adminNotes && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#4C1D95', backgroundColor: '#EDE9FE', padding: '0.35rem 0.6rem', borderRadius: '4px' }}>
                      <strong>Internal Admin Notes:</strong> {ticketData.adminNotes}
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={handleClearFollowUp}
                    style={{ padding: '0.4rem 0.85rem', backgroundColor: '#7C3AED', color: '#fff', fontSize: '0.8rem', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}
                  >
                    Mark Follow-up Completed
                  </button>
                )}
              </div>
            )}

            {/* USER RESOLUTION REVIEW & SATISFACTION BANNER (Part 4) */}
            {ticketData.status === 'RESOLVED' && isOwner && (
              <div style={{ padding: '1.5rem', backgroundColor: '#ECFDF5', border: '1.5px solid #10B981', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065F46', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                  <CheckCircle2 size={22} color="#059669" /> Support Specialist Marked This Request As Resolved
                </div>
                <p style={{ color: '#047857', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Please inspect the resolution details below. If your problem has been fixed, accept the resolution to close the request. If you are not satisfied, request further assistance.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleConfirmResolution}
                    disabled={isUpdatingStatus}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: '#059669', color: '#fff', fontWeight: 600, fontSize: '0.875rem', borderRadius: 'var(--radius-md)' }}
                  >
                    <Check size={18} /> {isUpdatingStatus ? 'Processing...' : 'Accept Resolution & Close Ticket'}
                  </button>

                  <button
                    onClick={() => setShowFurtherHelpModal(true)}
                    disabled={isUpdatingStatus}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: '#fff', color: '#B45309', border: '1px solid #F59E0B', fontWeight: 600, fontSize: '0.875rem', borderRadius: 'var(--radius-md)' }}
                  >
                    <RotateCcw size={16} /> Request Further Assistance
                  </button>
                </div>
              </div>
            )}

            {/* Support Staff Resolution Documentation Card */}
            {ticketData.resolutionNotes && (
              <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #10B981', backgroundColor: '#F0FDF4' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.95rem', color: '#065F46', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} color="#10B981" /> Support Staff Resolution Documentation
                  </h3>
                  {ticketData.resolvedAt && (
                    <span style={{ fontSize: '0.75rem', color: '#047857' }}>
                      Resolved: {new Date(ticketData.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: '#166534', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {ticketData.resolutionNotes}
                </p>
                {ticketData.userSatisfaction && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: ticketData.userSatisfaction === 'SATISFIED' ? '#065F46' : '#92400E', fontWeight: 600 }}>
                    Customer Feedback: {ticketData.userSatisfaction === 'SATISFIED' ? '✓ Resolution Confirmed & Accepted' : '⚠ Customer Requested Further Support'}
                  </div>
                )}
              </div>
            )}

            {/* Reopened Reason Banner if previous resolution was unsatisfied */}
            {ticketData.reopenedReason && ticketData.status === 'IN_PROGRESS' && (
              <div style={{ padding: '1rem 1.25rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <div style={{ color: '#B45309', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <RotateCcw size={16} color="#D97706" /> Customer Feedback / Further Assistance Request:
                </div>
                <p style={{ color: '#92400E', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  "{ticketData.reopenedReason}"
                </p>
              </div>
            )}

            {/* Ticket Header & Description Card */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                  {ticketData.category}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ticketData.priority === 'URGENT' || ticketData.priority === 'HIGH' ? 'var(--color-danger-text)' : 'var(--color-text-secondary)' }}>
                  {ticketData.priority} PRIORITY
                </span>
              </div>

              <h1 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '1rem', fontWeight: 700 }}>
                {ticketData.title}
              </h1>

              <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.925rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>
                {ticketData.description}
              </div>
            </div>

            {/* Unified Activity & Comment Timeline Card */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                <History size={20} color="var(--color-accent)" /> Unified Activity & Comment Audit Timeline ({unifiedTimeline.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', position: 'relative' }}>
                {unifiedTimeline.length === 0 ? (
                  <div style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    No activity or comments recorded yet on this ticket.
                  </div>
                ) : (
                  unifiedTimeline.map((item) => {
                    if (item.type === 'COMMENT') {
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: '1rem',
                            backgroundColor: item.isCurrentUser ? '#EFF6FF' : 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            marginLeft: '0.5rem',
                            borderLeft: '4px solid var(--color-accent)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <MessageSquare size={16} color="var(--color-accent)" />
                              <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{item.author}</strong>
                              <span className={`badge badge-${item.role === 'ADMIN' ? 'danger' : item.role === 'STAFF' ? 'warning' : 'open'}`} style={{ fontSize: '0.65rem' }}>
                                {item.role}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {item.timestamp.toLocaleString()}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>{item.message}</p>
                        </div>
                      );
                    } else {
                      // AUDIT_LOG item
                      let icon = <Clock size={16} color="var(--color-text-secondary)" />;
                      let badgeColor = '#F3F4F6';

                      if (item.action === 'TICKET_CREATED') {
                        icon = <Sparkles size={16} color="var(--color-accent)" />;
                        badgeColor = '#EFF6FF';
                      } else if (item.action === 'STAFF_ASSIGNED') {
                        icon = <UserPlus size={16} color="#3B82F6" />;
                        badgeColor = '#DBEAFE';
                      } else if (item.action === 'TICKET_RESOLVED') {
                        icon = <CheckCircle2 size={16} color="#10B981" />;
                        badgeColor = '#D1FAE5';
                      } else if (item.action === 'RESOLUTION_ACCEPTED' || item.action === 'TICKET_CLOSED') {
                        icon = <CheckCircle2 size={16} color="#059669" />;
                        badgeColor = '#ECFDF5';
                      } else if (item.action === 'FURTHER_ASSISTANCE_REQUESTED') {
                        icon = <RotateCcw size={16} color="#D97706" />;
                        badgeColor = '#FEF3C7';
                      } else if (item.action === 'FLAGGED_FOR_ADMIN_REVIEW') {
                        icon = <AlertTriangle size={16} color="#DC2626" />;
                        badgeColor = '#FEE2E2';
                      } else if (item.action === 'ADMIN_FOLLOWUP_REQUIRED') {
                        icon = <Shield size={16} color="#7C3AED" />;
                        badgeColor = '#EDE9FE';
                      }

                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: badgeColor,
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.825rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {icon}
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--color-primary)', marginRight: '0.35rem' }}>
                                {item.action.replace(/_/g, ' ')}:
                              </span>
                              {item.previousValue ? (
                                <span>Changed from <strong style={{ color: 'var(--color-text-secondary)' }}>{item.previousValue}</strong> to <strong>{item.newValue}</strong></span>
                              ) : (
                                <span>{item.newValue}</span>
                              )}
                              <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.35rem', fontSize: '0.75rem' }}>
                                by {item.author} ({item.role})
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.725rem', color: 'var(--color-text-secondary)' }}>
                            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    }
                  })
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    placeholder="Post an update or reply to this ticket thread..."
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: '0.85rem', opacity: isSubmittingComment ? 0.7 : 1 }}
                  >
                    <Send size={15} /> {isSubmittingComment ? 'Posting...' : 'Post Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Sidebar Column: Metadata & Customer History Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Quick Actions Card for Staff & Admin */}
            {(isStaff || isAdmin) && (
              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontWeight: 700 }}>
                  Ticket Actions
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {!ticketData.adminReviewRequired && ticketData.status !== 'CLOSED' && (
                    <button
                      onClick={() => setShowFlagModal(true)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <Flag size={14} /> Flag for Admin Review
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => setShowFollowUpModal(true)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <Shield size={14} /> Admin Follow-up
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Customer Information & Compact History Summary Card (Part 3) */}
            <div className="card">
              <h3 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '1rem', fontWeight: 700 }}>
                Customer Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem' }}>Customer Name</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.15rem' }}>
                    {ticketData.createdBy?.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {ticketData.createdBy?.email}
                  </div>
                </div>

                {/* Compact Customer History Summary (Staff & Admin only) */}
                {(isStaff || isAdmin) && customerSummary && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                      Customer History Summary
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', backgroundColor: 'var(--color-bg)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                      <div>Total: <strong>{customerSummary.total}</strong></div>
                      <div>Open: <strong>{customerSummary.open}</strong></div>
                      <div>Resolved: <strong>{customerSummary.resolved}</strong></div>
                      <div>Closed: <strong>{customerSummary.closed}</strong></div>
                    </div>

                    {customerSummary.recent && customerSummary.recent.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Recent Requests:</span>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0.25rem 0 0.5rem 0', fontSize: '0.75rem' }}>
                          {customerSummary.recent.slice(0, 3).map((rt) => (
                            <li key={rt._id} style={{ padding: '0.2rem 0', borderBottom: '1px dotted var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>{rt.ticketNumber}</span>
                              <span className={`badge badge-${rt.status.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                {rt.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={handleOpenFullCustomerHistory}
                      style={{ width: '100%', marginTop: '0.25rem', padding: '0.4rem', backgroundColor: 'var(--color-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    >
                      <FileText size={13} /> View Full Customer History
                    </button>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem' }}>Department & Location</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building size={14} color="var(--color-accent)" /> {ticketData.department || 'General Support'}
                  </div>
                  {ticketData.location && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={13} color="var(--color-text-secondary)" /> {ticketData.location}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem' }}>Assigned Support Staff</span>
                  <div style={{ fontWeight: 600, color: ticketData.assignedTo ? 'var(--color-text-primary)' : 'var(--color-warning-text)', marginTop: '0.2rem' }}>
                    {ticketData.assignedTo ? ticketData.assignedTo.name : 'Unassigned (Queue)'}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem' }}>AI Intelligent Tagging</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.85rem' }}>
                    <Sparkles size={16} color="var(--color-accent)" /> 
                    <span>{ticketData.aiCategory || ticketData.category}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: 'var(--color-accent-light)', border: '1px solid var(--color-accent)', borderRadius: '4px' }}>
                      {ticketData.aiPriority || ticketData.priority}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem' }}>Created Timestamp</span>
                  <div style={{ color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
                    {new Date(ticketData.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* MODAL 1: Request Further Assistance (User Unsatisfied Flow) */}
      {showFurtherHelpModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '1.5rem', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>Request Further Assistance</h3>
              <button onClick={() => setShowFurtherHelpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleRequestFurtherAssistance}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Explain what problem is still persisting or what additional help you need. This will return the ticket to active troubleshooting.
              </p>
              <textarea
                value={furtherHelpReason}
                onChange={(e) => setFurtherHelpReason(e.target.value)}
                rows={4}
                required
                placeholder="Describe why the solution did not fully resolve your issue..."
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowFurtherHelpModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isUpdatingStatus} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#D97706', color: '#fff', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
                  {isUpdatingStatus ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Flag for Admin Review (Staff Escalation Flow) */}
      {showFlagModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '1.5rem', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flag size={18} color="#DC2626" /> Flag for Administrative Review
              </h3>
              <button onClick={() => setShowFlagModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitFlag}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                If you believe this ticket requires administrative escalation (e.g. repeated complaints, duplicate requests, or inter-departmental dispute), provide a clear reason for the Administrator to review.
              </p>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={4}
                required
                placeholder="Example: Customer has submitted multiple tickets regarding the same resolved router issue..."
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowFlagModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', backgroundColor: '#DC2626', color: '#fff', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
                  Flag for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Admin Review Flag Decision (Part 7) */}
      {showReviewFlagModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: '550px', width: '100%', padding: '1.5rem', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                Review Flagged Ticket Decision
              </h3>
              <button onClick={() => setShowReviewFlagModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitAdminReview}>
              <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '4px', fontSize: '0.8rem', color: '#991B1B', marginBottom: '1rem' }}>
                <strong>Staff Escalation Reason:</strong> {ticketData.adminReviewReason}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                  Administrative Action:
                </label>
                <select
                  value={adminDecision}
                  onChange={(e) => setAdminDecision(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value="CONTINUE_SUPPORT">Continue Normal Support (Clear Flag)</option>
                  <option value="REQUIRE_FOLLOWUP">Admin Personal Follow-up Required</option>
                  <option value="CLOSE_TICKET">Close Ticket After Administrative Review</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                  {adminDecision === 'CLOSE_TICKET' ? 'Closure Justification / Notes:' : 'Administrative Notes:'}
                </label>
                <textarea
                  value={adminDecision === 'CLOSE_TICKET' ? adminClosureReason : adminReviewNotes}
                  onChange={(e) => adminDecision === 'CLOSE_TICKET' ? setAdminClosureReason(e.target.value) : setAdminReviewNotes(e.target.value)}
                  rows={3}
                  required
                  placeholder={adminDecision === 'CLOSE_TICKET' ? 'Explain the administrative grounds for closing this request...' : 'Internal notes or instructions for support team...'}
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowReviewFlagModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Admin Personal Follow-Up (Part 8) */}
      {showFollowUpModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '1.5rem', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#5B21B6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} color="#7C3AED" /> Schedule Admin Personal Follow-up
              </h3>
              <button onClick={() => setShowFollowUpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitFollowUp}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Record that direct administrative contact is required with this customer. These notes remain internal and confidential.
              </p>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  Follow-up Reason:
                </label>
                <input
                  type="text"
                  value={followUpReason}
                  onChange={(e) => setFollowUpReason(e.target.value)}
                  required
                  placeholder="e.g. Schedule phone review regarding repeated network disconnections"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  Internal Administrative Notes:
                </label>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={3}
                  placeholder="Private notes (customer email/phone to contact, context)..."
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowFollowUpModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', backgroundColor: '#7C3AED', color: '#fff', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
                  Save Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Full Customer History Modal (Part 2 & 3) */}
      {showCustomerHistoryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: '850px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: '#fff', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Complete Service History: {ticketData.createdBy?.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {ticketData.createdBy?.email} • Total Requests: {customerFullHistory.length}
                </span>
              </div>
              <button onClick={() => setShowCustomerHistoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingFullHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  Loading history records...
                </div>
              ) : customerFullHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  No previous tickets found for this customer.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem' }}>Ticket #</th>
                      <th style={{ padding: '0.75rem' }}>Title</th>
                      <th style={{ padding: '0.75rem' }}>Category</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerFullHistory.map((ch) => (
                      <tr key={ch._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>{ch.ticketNumber}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>{ch.title}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>{ch.category}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge badge-${ch.status.toLowerCase()}`}>{ch.status}</span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {new Date(ch.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setShowCustomerHistoryModal(false);
                              navigate(`/tickets/${ch._id}`);
                            }}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
