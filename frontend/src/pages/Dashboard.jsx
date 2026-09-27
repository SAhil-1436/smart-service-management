import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CreateTicketModal from '../components/CreateTicketModal';
import {
  LogOut,
  User,
  Plus,
  Search,
  Ticket,
  Server,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  RotateCcw,
  Bell
} from 'lucide-react';

import Navigation from '../components/Navigation';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      let queryStr = '/tickets?';
      if (statusFilter) queryStr += `status=${statusFilter}&`;
      if (categoryFilter) queryStr += `category=${categoryFilter}&`;
      if (searchTerm) queryStr += `search=${encodeURIComponent(searchTerm)}&`;

      const response = await api.get(queryStr);
      if (response.data.success) {
        setTickets(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch ticket list');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleTicketCreated = (newTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
  };

  // Metric Computations
  const totalCount = tickets.length;
  const pendingCount = tickets.filter((t) => t.status === 'PENDING' || t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
  const closedCount = tickets.filter((t) => t.status === 'CLOSED').length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '3rem' }}>
      <Navigation />

      {/* Main Container */}
      <main style={{ maxWidth: '1150px', margin: '2rem auto 0 auto', padding: '0 1rem' }}>
        
        {/* User Action Banner if resolutions await customer confirmation (Part 4 & 10) */}
        {user?.role === 'USER' && resolvedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', backgroundColor: '#ECFDF5', border: '1.5px solid #10B981', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Bell size={20} color="#059669" />
              <div>
                <strong style={{ color: '#065F46', fontSize: '0.95rem' }}>
                  Action Required: {resolvedCount} request{resolvedCount > 1 ? 's have' : ' has'} been marked as RESOLVED by support.
                </strong>
                <p style={{ color: '#047857', fontSize: '0.8rem', margin: 0 }}>
                  Please inspect the resolution details to confirm satisfaction and close the ticket, or request further assistance.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              style={{ padding: '0.4rem 0.85rem', backgroundColor: '#059669', color: '#fff', fontSize: '0.8rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
            >
              Filter Awaiting Review ({resolvedCount})
            </button>
          </div>
        )}

        {/* Header Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', fontWeight: 700 }}>
              {user?.role === 'ADMIN' ? 'System Overview & Tickets' : user?.role === 'STAFF' ? 'Support Queue & Assignments' : 'My Service Requests'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Track real-time status updates and process service tickets efficiently.
            </p>
          </div>

          {user?.role === 'USER' && (
            <button
              onClick={() => setIsModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: '0.875rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={18} /> New Service Ticket
            </button>
          )}
        </div>

        {/* KPI Metrics Cards (Part 10) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.15rem' }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Tickets</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>{totalCount}</div>
          </div>

          <div className="card" style={{ padding: '1.15rem', borderLeft: '4px solid #6366F1' }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Pending</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#4338CA', marginTop: '0.2rem' }}>{pendingCount}</div>
          </div>

          <div className="card" style={{ padding: '1.15rem', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-warning-text)', marginTop: '0.2rem' }}>{inProgressCount}</div>
          </div>

          <div className="card" style={{ padding: '1.15rem', borderLeft: '4px solid #10B981', backgroundColor: resolvedCount > 0 ? '#F0FDF4' : 'transparent' }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 600, color: '#065F46', textTransform: 'uppercase' }}>
              {user?.role === 'USER' ? 'Awaiting My Review' : 'Resolved'}
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>{resolvedCount}</div>
          </div>

          <div className="card" style={{ padding: '1.15rem', borderLeft: '4px solid var(--color-text-secondary)' }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Closed & Archived</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>{closedCount}</div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Search Input */}
            <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ticket #, title, description, location..."
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ width: '180px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', backgroundColor: '#fff' }}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED (Action Required)</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            {/* Category Filter */}
            <div style={{ width: '160px' }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', backgroundColor: '#fff' }}
              >
                <option value="">All Categories</option>
                <option value="Technical">Technical</option>
                <option value="Billing">Billing</option>
                <option value="Account">Account</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="General">General</option>
              </select>
            </div>

            <button
              type="submit"
              style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
            >
              <RefreshCw size={14} /> Search
            </button>
          </form>
        </div>

        {/* Tickets List Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid var(--color-accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
              Loading service tickets...
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger-text)' }}>
              <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
              <p>{error}</p>
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <Ticket size={40} color="var(--color-border)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>No tickets found</h3>
              <p style={{ fontSize: '0.875rem' }}>No service requests match the selected filters or search terms.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Ticket #</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Title</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Category</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Priority</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Created</th>
                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: t.status === 'RESOLVED' && user?.role === 'USER' ? '#F0FDF4' : 'transparent', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {t.ticketNumber}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: 'var(--color-text-primary)', maxWidth: '300px' }}>
                        <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.title}</div>
                        {t.createdBy && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>by {t.createdBy.name}</div>}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', fontWeight: 600 }}>
                          {t.category}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'var(--color-danger-text)' : 'var(--color-text-secondary)' }}>
                        {t.priority}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                        {t.status === 'RESOLVED' && user?.role === 'USER' && (
                          <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, marginTop: '0.2rem' }}>
                            Action Required
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(`/tickets/${t._id}`)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', backgroundColor: t.status === 'RESOLVED' && user?.role === 'USER' ? '#059669' : 'var(--color-accent-light)', color: t.status === 'RESOLVED' && user?.role === 'USER' ? '#fff' : 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
                        >
                          {t.status === 'RESOLVED' && user?.role === 'USER' ? 'Review & Close' : 'View'} <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create Ticket Modal (USER role only) */}
      {user?.role === 'USER' && (
        <CreateTicketModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTicketCreated={handleTicketCreated}
        />
      )}
    </div>
  );
}
