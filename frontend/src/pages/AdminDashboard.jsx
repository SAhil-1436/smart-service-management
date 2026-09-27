import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navigation from '../components/Navigation';
import {
  Shield,
  Users,
  Ticket,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  UserCog,
  Search,
  FileCheck,
  ExternalLink,
  XCircle,
  Building,
  Briefcase,
  IdCard,
  Flag,
  FileText,
  RotateCcw,
  X,
  Clock,
  AlertTriangle
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState('');
  const [ticketFilter, setTicketFilter] = useState('ALL');

  // Customer Profile & History Modal State (Part 2)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAllCustomerTickets, setShowAllCustomerTickets] = useState(false);

  // Admin Review Flag Modal State (Part 7)
  const [reviewingTicket, setReviewingTicket] = useState(null);
  const [adminDecision, setAdminDecision] = useState('CONTINUE_SUPPORT');
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [adminClosureReason, setAdminClosureReason] = useState('');

  // Admin Follow-Up Modal State (Part 8)
  const [followUpTicket, setFollowUpTicket] = useState(null);
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch dashboard metrics
      const statsRes = await api.get('/admin/dashboard');
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      // 2. Fetch all users
      const usersRes = await api.get('/admin/users');
      if (usersRes.data.success) {
        const uList = usersRes.data.data;
        setUsersList(uList);
        setStaffMembers(uList.filter((u) => (u.role === 'STAFF' || u.role === 'ADMIN') && (u.status === 'ACTIVE' || !u.status)));
      }

      // 3. Fetch global tickets
      const ticketsRes = await api.get('/tickets');
      if (ticketsRes.data.success) {
        setAllTickets(ticketsRes.data.data);
      }

      // 4. Fetch staff verification requests
      const verifRes = await api.get('/admin/staff-verifications');
      if (verifRes.data.success) {
        setVerifications(verifRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin controls');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (userObj) => {
    const nextStatus = userObj.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    const confirmMsg = nextStatus === 'INACTIVE'
      ? `Are you sure you want to deactivate ${userObj.name}? They will be blocked from logging into the platform.`
      : `Reactivate user account for ${userObj.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await api.put(`/admin/users/${userObj._id}/status`, { status: nextStatus });
      if (response.data.success) {
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user account status');
    }
  };

  const handleReassignTicket = async (ticketId, staffId) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/assign`, { staffId });
      if (response.data.success) {
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reassign ticket');
    }
  };

  // Staff Verification Handlers
  const handleApproveVerification = async (verifId, applicantName) => {
    if (!window.confirm(`Approve credentials for ${applicantName}? This will elevate the user to STAFF and activate their account.`)) return;

    try {
      const response = await api.put(`/admin/staff-verifications/${verifId}/review`, { status: 'APPROVED' });
      if (response.data.success) {
        alert(`Staff verification approved for ${applicantName}. Account is now ACTIVE as STAFF.`);
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve staff verification');
    }
  };

  const handleRejectVerification = async (verifId, applicantName) => {
    const reason = window.prompt(`Enter reason for rejecting verification application for ${applicantName}:`, 'Unverified employee credentials or invalid ID card documentation');
    if (reason === null) return;

    try {
      const response = await api.put(`/admin/staff-verifications/${verifId}/review`, {
        status: 'REJECTED',
        rejectionReason: reason
      });
      if (response.data.success) {
        alert(`Staff application for ${applicantName} has been rejected.`);
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject staff verification');
    }
  };

  const handleViewDocument = async (verifId) => {
    try {
      const response = await api.get(`/admin/staff-verifications/${verifId}/document`, {
        responseType: 'blob'
      });
      const fileBlob = new Blob([response.data], { type: response.headers['content-type'] });
      const fileURL = URL.createObjectURL(fileBlob);
      window.open(fileURL, '_blank');
    } catch (err) {
      alert('Unable to load verification document file.');
    }
  };

  // Open Customer History / Profile Modal (Part 2)
  const handleOpenUserHistory = async (userObj) => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setShowAllCustomerTickets(false);
    setSelectedUserHistory(null);
    try {
      const response = await api.get(`/admin/users/${userObj._id}/history`);
      if (response.data.success) {
        setSelectedUserHistory(response.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch customer profile and history');
      setShowHistoryModal(false);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Admin Review Decision Submission (Part 7)
  const handleSubmitAdminReview = async (e) => {
    e.preventDefault();
    if (!reviewingTicket) return;

    try {
      const response = await api.put(`/tickets/${reviewingTicket._id}/admin-review`, {
        decision: adminDecision,
        adminNotes: adminReviewNotes,
        closureReason: adminClosureReason
      });
      if (response.data.success) {
        setReviewingTicket(null);
        setAdminReviewNotes('');
        setAdminClosureReason('');
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete administrative review');
    }
  };

  // Admin Follow-up Submission (Part 8)
  const handleSubmitFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpTicket) return;

    try {
      const response = await api.put(`/tickets/${followUpTicket._id}/admin-followup`, {
        followUpRequired: true,
        reason: followUpReason,
        adminNotes: followUpNotes
      });
      if (response.data.success) {
        setFollowUpTicket(null);
        setFollowUpReason('');
        setFollowUpNotes('');
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update follow-up');
    }
  };

  const handleClearFollowUp = async (ticketId) => {
    if (!window.confirm('Mark admin personal follow-up as completed / resolved?')) return;
    try {
      const response = await api.put(`/tickets/${ticketId}/admin-followup`, { followUpRequired: false });
      if (response.data.success) {
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear follow-up');
    }
  };

  // Filtered Users List
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? (u.status || 'ACTIVE') === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered Verifications List
  const filteredVerifications = verifications.filter((v) => {
    if (!verificationStatusFilter) return true;
    return v.status === verificationStatusFilter;
  });

  const pendingVerificationsCount = verifications.filter((v) => v.status === 'PENDING').length;
  const flaggedTickets = allTickets.filter((t) => t.adminReviewRequired);
  const followUpTickets = allTickets.filter((t) => t.adminFollowUpRequired);
  const unassignedTickets = allTickets.filter((t) => !t.assignedTo);

  // Filtered Tickets by Category Tab
  const filteredTicketList = allTickets.filter((t) => {
    if (ticketFilter === 'FLAGGED') return t.adminReviewRequired;
    if (ticketFilter === 'FOLLOWUP') return t.adminFollowUpRequired;
    if (ticketFilter === 'UNASSIGNED') return !t.assignedTo;
    return true;
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <Navigation />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-text-secondary)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--color-accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '3rem' }}>
      <Navigation />

      <main style={{ maxWidth: '1200px', margin: '2rem auto 0 auto', padding: '0 1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={24} color="var(--color-primary)" /> Administrator Management & Dispatch Center
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Review staff credential verifications, manage account roles and statuses, and reassign ticket queues.
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger-text)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* System Summary KPI Grid (Part 10) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Registered Accounts</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>{stats?.users?.total || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              {stats?.users?.clients} Clients • {stats?.users?.staff} Staff • {stats?.users?.admins} Admins
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #D97706' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Staff Verifications</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#D97706', marginTop: '0.25rem' }}>
              {pendingVerificationsCount} Pending
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              {verifications.length} total applications submitted
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Requires Admin Review</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#DC2626', marginTop: '0.25rem' }}>{flaggedTickets.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Staff flagged issues</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #7C3AED' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Follow-up Required</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#7C3AED', marginTop: '0.25rem' }}>{followUpTickets.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Direct assistance needed</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Unassigned Queue</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-warning-text)', marginTop: '0.25rem' }}>{unassignedTickets.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Awaiting staff assignment</div>
          </div>
        </div>

        {/* STAFF VERIFICATION SECTION */}
        <div className="card" style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={20} color="#D97706" /> Staff Credential Verification Requests
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Inspect uploaded credentials and approve or reject staff resolver applications.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={verificationStatusFilter}
                onChange={(e) => setVerificationStatusFilter(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', backgroundColor: '#fff' }}
              >
                <option value="">All Verification Statuses</option>
                <option value="PENDING">PENDING Review</option>
                <option value="APPROVED">APPROVED (Active Staff)</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Applicant</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Employee ID</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Department & Role</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Credential Doc</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Review Decision</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No staff verification requests found matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredVerifications.map((v) => {
                    const isPending = v.status === 'PENDING';
                    const isApproved = v.status === 'APPROVED';

                    return (
                      <tr key={v._id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isPending ? '#FFFBEB' : 'transparent' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{v.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{v.organizationEmail} • {v.phone}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {v.employeeId}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 500 }}>{v.department}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{v.jobRole}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <button
                            type="button"
                            onClick={() => handleViewDocument(v._id)}
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: 'var(--color-accent)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer'
                            }}
                          >
                            <ExternalLink size={13} /> View ID ({v.idCardOriginalName?.substring(0, 14)}...)
                          </button>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              backgroundColor: isApproved ? '#D1FAE5' : isPending ? '#FEF3C7' : '#FEE2E2',
                              color: isApproved ? '#065F46' : isPending ? '#B45309' : '#991B1B'
                            }}
                          >
                            {v.status}
                          </span>
                          {v.rejectionReason && (
                            <div style={{ fontSize: '0.7rem', color: '#B91C1C', marginTop: '0.25rem' }}>
                              Reason: {v.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          {isPending ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleApproveVerification(v._id, v.fullName)}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: '#059669',
                                  color: '#fff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  cursor: 'pointer',
                                  border: 'none'
                                }}
                              >
                                <CheckCircle2 size={13} /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectVerification(v._id, v.fullName)}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: '#DC2626',
                                  color: '#fff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  cursor: 'pointer',
                                  border: 'none'
                                }}
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                              Reviewed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CLEAN USER & STAFF MANAGEMENT TABLE (Part 1) */}
        <div className="card" style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCog size={20} color="var(--color-primary)" /> User & Staff Account Management
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Account activation, verification status, and dedicated customer profile history.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search user accounts..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{ padding: '0.35rem 0.6rem 0.35rem 1.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', width: '180px' }}
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', backgroundColor: '#fff' }}
              >
                <option value="">All Roles</option>
                <option value="USER">USER</option>
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', backgroundColor: '#fff' }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.875rem 1.25rem' }}>User Name</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Email</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Current Role</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Joined Date</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No user accounts match the specified criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isInactive = u.status === 'INACTIVE';
                    const isPending = u.status === 'PENDING_VERIFICATION';

                    return (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isInactive ? '#FEF2F2' : isPending ? '#FFFBEB' : 'transparent' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: isInactive ? 'var(--color-danger-text)' : 'var(--color-text-primary)' }}>
                          {u.name}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              backgroundColor: isInactive ? '#FEE2E2' : isPending ? '#FEF3C7' : '#D1FAE5',
                              color: isInactive ? '#991B1B' : isPending ? '#B45309' : '#065F46'
                            }}
                          >
                            {u.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span className={`badge badge-${u.role === 'ADMIN' ? 'danger' : u.role === 'STAFF' ? 'warning' : 'open'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            {/* View Profile / History (Part 1 & 2) */}
                            <button
                              onClick={() => handleOpenUserHistory(u)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: '#EFF6FF',
                                color: 'var(--color-accent)',
                                border: '1px solid #BFDBFE',
                                cursor: 'pointer'
                              }}
                            >
                              {u.role === 'USER' ? 'View Profile & History' : 'View Profile'}
                            </button>

                            {/* Soft-Deactivation Toggle */}
                            {u.role !== 'ADMIN' && (
                              <button
                                onClick={() => handleStatusToggle(u)}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isInactive ? '#059669' : '#DC2626',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                {isInactive ? 'Reactivate' : 'Deactivate'}
                              </button>
                            )}

                            {u.role === 'ADMIN' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                                Primary Admin
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* GLOBAL TICKET DISPATCH & REVIEW QUEUE (Part 7 & 10) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ticket size={20} color="var(--color-accent)" /> Global Ticket Queue & Escalation Center
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Inspect flagged tickets, schedule administrative follow-ups, and dispatch staff workloads.
              </span>
            </div>

            {/* Filter Tabs (Part 7, 8, 10) */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setTicketFilter('ALL')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: ticketFilter === 'ALL' ? 'var(--color-primary)' : 'var(--color-bg)', color: ticketFilter === 'ALL' ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                All ({allTickets.length})
              </button>
              <button
                onClick={() => setTicketFilter('FLAGGED')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: ticketFilter === 'FLAGGED' ? '#DC2626' : 'var(--color-bg)', color: ticketFilter === 'FLAGGED' ? '#fff' : '#DC2626', cursor: 'pointer' }}
              >
                Requires Review ({flaggedTickets.length})
              </button>
              <button
                onClick={() => setTicketFilter('FOLLOWUP')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: ticketFilter === 'FOLLOWUP' ? '#7C3AED' : 'var(--color-bg)', color: ticketFilter === 'FOLLOWUP' ? '#fff' : '#7C3AED', cursor: 'pointer' }}
              >
                Follow-up Required ({followUpTickets.length})
              </button>
              <button
                onClick={() => setTicketFilter('UNASSIGNED')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: ticketFilter === 'UNASSIGNED' ? '#D97706' : 'var(--color-bg)', color: ticketFilter === 'UNASSIGNED' ? '#fff' : '#D97706', cursor: 'pointer' }}
              >
                Unassigned ({unassignedTickets.length})
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Ticket #</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Title & Escalation</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Requester</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Assigned Staff</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions & Dispatch</th>
                </tr>
              </thead>
              <tbody>
                {filteredTicketList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No tickets match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTicketList.map((t) => (
                    <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: t.adminReviewRequired ? '#FEF2F2' : t.adminFollowUpRequired ? '#FAF5FF' : 'transparent' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                        <a href={`/tickets/${t._id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                          {t.ticketNumber}
                        </a>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        <div>{t.title}</div>
                        {t.adminReviewRequired && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#B91C1C', backgroundColor: '#FEE2E2', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #FCA5A5', display: 'inline-block' }}>
                            <strong>Flagged:</strong> {t.adminReviewReason}
                          </div>
                        )}
                        {t.adminFollowUpRequired && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#6D28D9', backgroundColor: '#EDE9FE', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #DDD6FE', display: 'inline-block', marginLeft: t.adminReviewRequired ? '0.35rem' : 0 }}>
                            <strong>Follow-up:</strong> {t.adminFollowUpReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                        {t.createdBy?.name}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--color-text-secondary)' }}>
                        {t.assignedTo ? t.assignedTo.name : <span style={{ color: 'var(--color-warning-text)', fontWeight: 600 }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                          
                          {/* Review Flag Decision Action */}
                          {t.adminReviewRequired && (
                            <button
                              onClick={() => {
                                setReviewingTicket(t);
                                setAdminDecision('CONTINUE_SUPPORT');
                                setAdminReviewNotes('');
                                setAdminClosureReason('');
                              }}
                              style={{ padding: '0.35rem 0.65rem', backgroundColor: '#DC2626', color: '#fff', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
                            >
                              Review Flag
                            </button>
                          )}

                          {/* Admin Follow-Up Button */}
                          <button
                            onClick={() => {
                              setFollowUpTicket(t);
                              setFollowUpReason(t.adminFollowUpReason || '');
                              setFollowUpNotes(t.adminNotes || '');
                            }}
                            style={{ padding: '0.35rem 0.65rem', backgroundColor: t.adminFollowUpRequired ? '#7C3AED' : '#F5F3FF', color: t.adminFollowUpRequired ? '#fff' : '#6D28D9', border: '1px solid #DDD6FE', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                          >
                            {t.adminFollowUpRequired ? 'Follow-up Active' : '+ Follow-up'}
                          </button>

                          {/* Reassign Staff Select */}
                          <select
                            value={t.assignedTo?._id || ''}
                            onChange={(e) => handleReassignTicket(t._id, e.target.value)}
                            style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', backgroundColor: '#fff' }}
                          >
                            <option value="">Reassign Staff...</option>
                            {staffMembers.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name} ({s.role})
                              </option>
                            ))}
                          </select>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* DEDICATED CUSTOMER PROFILE / HISTORY MODAL (Part 2) */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: '850px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1.75rem', backgroundColor: '#fff', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Customer Profile & History
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Detailed service request summary and ticket records
                </span>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingHistory || !selectedUserHistory ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                  Loading customer profile and history...
                </div>
              ) : (
                <div>
                  {/* Customer Information Card */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', backgroundColor: 'var(--color-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Customer Name</span>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)', marginTop: '0.15rem' }}>{selectedUserHistory.user.name}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email Address</span>
                      <div style={{ color: 'var(--color-text-primary)', marginTop: '0.15rem', fontSize: '0.9rem' }}>{selectedUserHistory.user.email}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Account Status</span>
                      <div style={{ marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: selectedUserHistory.user.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2', color: selectedUserHistory.user.status === 'ACTIVE' ? '#065F46' : '#991B1B' }}>
                          {selectedUserHistory.user.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Joined Date</span>
                      <div style={{ color: 'var(--color-text-primary)', marginTop: '0.15rem', fontSize: '0.85rem' }}>
                        {new Date(selectedUserHistory.user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#EFF6FF', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent)' }}>{selectedUserHistory.summary.total}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginTop: '0.1rem' }}>Total Requests</div>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: '#FEF3C7', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#B45309' }}>{selectedUserHistory.summary.open}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginTop: '0.1rem' }}>Open</div>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: '#EDE9FE', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6D28D9' }}>{selectedUserHistory.summary.inProgress}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginTop: '0.1rem' }}>In Progress</div>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: '#D1FAE5', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#065F46' }}>{selectedUserHistory.summary.resolved}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginTop: '0.1rem' }}>Resolved</div>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: '#F3F4F6', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedUserHistory.summary.closed}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginTop: '0.1rem' }}>Closed</div>
                    </div>
                  </div>

                  {/* Recent Service Requests */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {showAllCustomerTickets ? `All Service Requests (${selectedUserHistory.allTickets.length})` : `Recent Service Requests (Top ${selectedUserHistory.recentTickets.length})`}
                      </h4>
                      <button
                        onClick={() => setShowAllCustomerTickets(!showAllCustomerTickets)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                      >
                        {showAllCustomerTickets ? 'Show Recent Only' : 'View Complete History'}
                      </button>
                    </div>

                    {(showAllCustomerTickets ? selectedUserHistory.allTickets : selectedUserHistory.recentTickets).length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                        No service requests submitted yet by this user.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'left' }}>
                            <th style={{ padding: '0.6rem 0.75rem' }}>Ticket #</th>
                            <th style={{ padding: '0.6rem 0.75rem' }}>Issue Title</th>
                            <th style={{ padding: '0.6rem 0.75rem' }}>Category</th>
                            <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                            <th style={{ padding: '0.6rem 0.75rem' }}>Assigned</th>
                            <th style={{ padding: '0.6rem 0.75rem' }}>Date</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(showAllCustomerTickets ? selectedUserHistory.allTickets : selectedUserHistory.recentTickets).map((ticket) => (
                            <tr key={ticket._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>{ticket.ticketNumber}</td>
                              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{ticket.title}</td>
                              <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>{ticket.category}</td>
                              <td style={{ padding: '0.75rem' }}>
                                <span className={`badge badge-${ticket.status.toLowerCase()}`}>{ticket.status}</span>
                              </td>
                              <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                                {ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}
                              </td>
                              <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    setShowHistoryModal(false);
                                    navigate(`/tickets/${ticket._id}`);
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
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ padding: '0.5rem 1.25rem', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN REVIEW FLAG DECISION MODAL (Part 7) */}
      {reviewingTicket && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: '550px', width: '100%', padding: '1.75rem', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                Review Flagged Ticket: {reviewingTicket.ticketNumber}
              </h3>
              <button onClick={() => setReviewingTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '4px', fontSize: '0.8rem', color: '#991B1B', marginBottom: '1rem' }}>
              <strong>Staff Escalation Reason:</strong> {reviewingTicket.adminReviewReason}
            </div>

            <form onSubmit={handleSubmitAdminReview}>
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

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                  {adminDecision === 'CLOSE_TICKET' ? 'Administrative Closure Justification:' : 'Administrative Notes:'}
                </label>
                <textarea
                  value={adminDecision === 'CLOSE_TICKET' ? adminClosureReason : adminReviewNotes}
                  onChange={(e) => adminDecision === 'CLOSE_TICKET' ? setAdminClosureReason(e.target.value) : setAdminReviewNotes(e.target.value)}
                  rows={3}
                  required
                  placeholder={adminDecision === 'CLOSE_TICKET' ? 'Explain the administrative grounds for closing this request...' : 'Internal notes or guidance for the team...'}
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setReviewingTicket(null)} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
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

      {/* ADMIN FOLLOW-UP MODAL (Part 8) */}
      {followUpTicket && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '1.75rem', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#5B21B6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} color="#7C3AED" /> Schedule Admin Personal Follow-up
              </h3>
              <button onClick={() => setFollowUpTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitFollowUp}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Record that direct administrator assistance is required for ticket <strong>{followUpTicket.ticketNumber}</strong>. Notes remain internal.
              </p>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  Follow-up Reason *
                </label>
                <input
                  type="text"
                  value={followUpReason}
                  onChange={(e) => setFollowUpReason(e.target.value)}
                  required
                  placeholder="e.g. Schedule personal outreach regarding repeated equipment failure"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  Internal Administrative Notes:
                </label>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={3}
                  placeholder="Private administrative notes..."
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {followUpTicket.adminFollowUpRequired ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleClearFollowUp(followUpTicket._id);
                      setFollowUpTicket(null);
                    }}
                    style={{ padding: '0.5rem 0.85rem', backgroundColor: '#F3F4F6', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Clear Follow-up
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setFollowUpTicket(null)} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ padding: '0.5rem 1.25rem', backgroundColor: '#7C3AED', color: '#fff', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
                    Save Follow-up
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
