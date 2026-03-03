import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SupportTickets.css';

const API = 'http://localhost:8080/api';

function SupportTickets() {
  const SUBJECT_MIN = 5;
  const SUBJECT_MAX = 120;
  const DESCRIPTION_MIN = 15;
  const DESCRIPTION_MAX = 3000;
  const RESPONSE_MIN = 5;
  const RESPONSE_MAX = 3000;

  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole');
  const isAdmin = role === 'ADMIN';
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createErrors, setCreateErrors] = useState({ subject: '', description: '', submit: '' });
  const [responseErrors, setResponseErrors] = useState({ response: '', submit: '' });

  const validateCreateForm = (values) => {
    const errors = { subject: '', description: '', submit: '' };
    const trimmedSubject = values.subject.trim();
    const trimmedDescription = values.description.trim();

    if (!trimmedSubject) {
      errors.subject = 'Subject is required.';
    } else if (trimmedSubject.length < SUBJECT_MIN) {
      errors.subject = `Subject must be at least ${SUBJECT_MIN} characters.`;
    } else if (trimmedSubject.length > SUBJECT_MAX) {
      errors.subject = `Subject must be under ${SUBJECT_MAX} characters.`;
    }

    if (!trimmedDescription) {
      errors.description = 'Description is required.';
    } else if (trimmedDescription.length < DESCRIPTION_MIN) {
      errors.description = `Description must be at least ${DESCRIPTION_MIN} characters.`;
    } else if (trimmedDescription.length > DESCRIPTION_MAX) {
      errors.description = `Description must be under ${DESCRIPTION_MAX} characters.`;
    }

    return errors;
  };

  const validateResponse = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return 'Response is required.';
    if (trimmed.length < RESPONSE_MIN) return `Response must be at least ${RESPONSE_MIN} characters.`;
    if (trimmed.length > RESPONSE_MAX) return `Response must be under ${RESPONSE_MAX} characters.`;
    return '';
  };

  const loadMyTickets = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/tickets/my`, { params: { userId } });
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTickets = async () => {
    try {
      const res = await axios.get(`${API}/tickets/all`);
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    if (isAdmin) loadAllTickets();
    else loadMyTickets();
  }, [userId, isAdmin]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();

    const errors = validateCreateForm({ subject, description });
    if (errors.subject || errors.description) {
      setCreateErrors(errors);
      return;
    }

    try {
      await axios.post(`${API}/tickets`, {
        userId: Number(userId),
        subject: subject.trim(),
        description: description.trim(),
        status: 'OPEN',
      });
      setSubject('');
      setDescription('');
      setCreateErrors({ subject: '', description: '', submit: '' });
      setShowForm(false);
      if (isAdmin) loadAllTickets();
      else loadMyTickets();
    } catch (e) {
      setCreateErrors((prev) => ({ ...prev, submit: 'Failed to create ticket. Please try again.' }));
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/tickets/${id}/status`, null, { params: { status } });
      setSelectedTicket(null);
      if (isAdmin) loadAllTickets();
      else loadMyTickets();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const submitResponse = async (id) => {
    const responseError = validateResponse(adminResponse);
    if (responseError) {
      setResponseErrors({ response: responseError, submit: '' });
      return;
    }
    try {
      await axios.patch(`${API}/tickets/${id}/response`, { response: adminResponse.trim() });
      alert('Response sent successfully! The student can now view your reply.');
      setAdminResponse('');
      setResponseErrors({ response: '', submit: '' });
      setSelectedTicket(null);
      loadAllTickets();
    } catch (e) {
      setResponseErrors((prev) => ({ ...prev, submit: 'Failed to add response. Please try again.' }));
    }
  };

  const deleteTicket = async (id) => {
    const confirmed = window.confirm('Clear this ticket permanently?');
    if (!confirmed) return;

    try {
      await axios.delete(`${API}/tickets/${id}`);
      if (selectedTicket?.id === id) {
        setSelectedTicket(null);
        setAdminResponse('');
        setResponseErrors({ response: '', submit: '' });
      }
      if (isAdmin) await loadAllTickets();
      else await loadMyTickets();
    } catch (e) {
      alert('Failed to clear ticket');
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '—');

  const filtered = statusFilter
    ? tickets.filter((t) => t.status === statusFilter)
    : tickets;

  if (!userId) {
    return (
      <div className="support-tickets-page">
        <div className="container"><p className="muted">Please log in.</p></div>
      </div>
    );
  }

  return (
    <div className="support-tickets-page">
      <div className="container">
        <header className="page-header">
          <h1>Support Tickets</h1>
          <p>{isAdmin 
            ? 'View all tickets, change status, and reply to students. Your responses are visible to ticket creators.' 
            : 'Create a ticket when the inquiry bot cannot answer. View admin responses below each ticket.'}</p>
        </header>

        <div className="ticket-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + New ticket
          </button>
          {isAdmin && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="">All statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreateTicket} className="card ticket-form">
            <h3>New support ticket</h3>
            <input
              placeholder="Subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                const nextErrors = validateCreateForm({ subject: e.target.value, description });
                setCreateErrors((prev) => ({ ...prev, subject: nextErrors.subject, description: nextErrors.description, submit: '' }));
              }}
              maxLength={SUBJECT_MAX}
              aria-invalid={Boolean(createErrors.subject)}
              aria-describedby={createErrors.subject ? 'ticket-subject-error' : undefined}
              required
            />
            {createErrors.subject && <p id="ticket-subject-error" className="ticket-error">{createErrors.subject}</p>}
            <textarea
              placeholder="Describe your issue..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                const nextErrors = validateCreateForm({ subject, description: e.target.value });
                setCreateErrors((prev) => ({ ...prev, subject: nextErrors.subject, description: nextErrors.description, submit: '' }));
              }}
              rows={4}
              maxLength={DESCRIPTION_MAX}
              aria-invalid={Boolean(createErrors.description)}
              aria-describedby={createErrors.description ? 'ticket-description-error' : undefined}
              required
            />
            {createErrors.description && <p id="ticket-description-error" className="ticket-error">{createErrors.description}</p>}
            {createErrors.submit && <p className="ticket-error">{createErrors.submit}</p>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Submit</button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowForm(false);
                  setCreateErrors({ subject: '', description: '', submit: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="tickets-list">
            {filtered.length === 0 ? (
              <p className="muted">No tickets. Create one above or ask a question first.</p>
            ) : (
              filtered.map((t) => (
                <div key={t.id} className={`card ticket-card ${t.response ? 'has-response' : ''}`}>
                  <div className="ticket-card-header">
                    <span className={`ticket-status ${t.status}`}>{t.status}</span>
                    {t.response && <span className="responded-badge">✓ Responded</span>}
                    <h3>{t.subject}</h3>
                    <p className="ticket-meta">Created {formatDate(t.createdAt)} {t.updatedAt && t.updatedAt !== t.createdAt ? `• Updated ${formatDate(t.updatedAt)}` : ''}</p>
                  </div>
                  <p className="ticket-desc">{t.description}</p>

                  <div className="ticket-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => deleteTicket(t.id)}
                    >
                      Clear Ticket
                    </button>
                  </div>
                  
                  {/* Student view of admin response */}
                  {t.response && (
                    <div className="ticket-response">
                      <div className="response-header">
                        <strong>🎯 Admin Response:</strong>
                      </div>
                      <div className="response-content">{t.response}</div>
                    </div>
                  )}

                  {/* Admin controls */}
                  {isAdmin && (
                    <div className="admin-controls">
                      <div className="admin-actions-row">
                        <select
                          value=""
                          onChange={(e) => { const v = e.target.value; if (v) updateStatus(t.id, v); }}
                          className="status-select"
                        >
                          <option value="">Change status</option>
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                        <button 
                          type="button" 
                          className="btn-sm btn-primary" 
                          onClick={() => {
                            if (selectedTicket?.id === t.id) {
                              setSelectedTicket(null);
                              setAdminResponse('');
                              setResponseErrors({ response: '', submit: '' });
                            } else {
                              setSelectedTicket(t);
                              setAdminResponse(t.response || '');
                              setResponseErrors({ response: '', submit: '' });
                            }
                          }}
                        >
                          {selectedTicket?.id === t.id ? 'Cancel Reply' : t.response ? 'Update Reply' : 'Add Reply'}
                        </button>
                      </div>
                      {selectedTicket?.id === t.id && (
                        <div className="response-form">
                          <label className="response-label">Your response to the student:</label>
                          <textarea 
                            placeholder="Type your response here. The student will see this message…" 
                            value={adminResponse} 
                            onChange={(e) => {
                              setAdminResponse(e.target.value);
                              setResponseErrors({ response: validateResponse(e.target.value), submit: '' });
                            }} 
                            rows={4} 
                            maxLength={RESPONSE_MAX}
                            aria-invalid={Boolean(responseErrors.response)}
                            aria-describedby={responseErrors.response ? `ticket-response-error-${t.id}` : undefined}
                          />
                          {responseErrors.response && <p id={`ticket-response-error-${t.id}`} className="ticket-error">{responseErrors.response}</p>}
                          {responseErrors.submit && <p className="ticket-error">{responseErrors.submit}</p>}
                          <div className="form-actions">
                            <button type="button" className="btn btn-primary" onClick={() => submitResponse(t.id)}>Send Response</button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => {
                                setSelectedTicket(null);
                                setAdminResponse('');
                                setResponseErrors({ response: '', submit: '' });
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="page-links">
          <Link to="/inquiry" className="btn btn-primary">Ask a Question</Link>
          <Link to="/knowledge-base" className="btn btn-ghost">Knowledge Base</Link>
          <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default SupportTickets;
