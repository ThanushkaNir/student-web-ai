import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './NotificationCenter.css';

const API = 'http://localhost:8080/api';

function formatRelativeDate(dateValue) {
  if (!dateValue) return '';
  const now = new Date();
  const date = new Date(dateValue);
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === -1) return '1 day ago';
  return `${Math.abs(diffDays)} days ago`;
}

function NotificationCenter() {
  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole') || 'STUDENT';
  const year = localStorage.getItem('userYear');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignmentAlerts, setAssignmentAlerts] = useState([]);
  const [jobAlerts, setJobAlerts] = useState([]);
  const [blogAlerts, setBlogAlerts] = useState([]);
  const [systemMessages, setSystemMessages] = useState([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      setLoading(true);
      setError('');

      try {
        const [assignmentsRes, jobsRes, blogRes, ticketsRes] = await Promise.all([
          axios.get(`${API}/assignments/due-soon`, { params: { userId, days: 7 } }),
          axios.get(`${API}/jobs`, { params: { userId } }),
          axios.get(`${API}/blog`),
          axios.get(`${API}/tickets/my`, { params: { userId } }),
        ]);

        const assignments = Array.isArray(assignmentsRes.data) ? assignmentsRes.data.slice(0, 4) : [];
        const jobs = Array.isArray(jobsRes.data) ? jobsRes.data.slice(0, 4) : [];
        const blogs = Array.isArray(blogRes.data) ? blogRes.data.slice(0, 4) : [];
        const tickets = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];

        setAssignmentAlerts(assignments);
        setJobAlerts(jobs);
        setBlogAlerts(blogs);

        const dynamicSystemMessages = [];

        const repliedTickets = tickets.filter((ticket) => ticket.response && ticket.response.trim());
        repliedTickets.slice(0, 2).forEach((ticket) => {
          dynamicSystemMessages.push({
            id: `ticket-${ticket.id}`,
            text: `Support reply received for "${ticket.subject}" (${ticket.status}).`,
          });
        });

        if (role === 'STUDENT' && year && Number(year) < 3) {
          dynamicSystemMessages.push({
            id: 'eligibility-message',
            text: 'Job board visibility is enabled for 3rd and 4th year students.',
          });
        }

        dynamicSystemMessages.push({
          id: 'profile-message',
          text: 'Keep your profile bio, skills, and education updated for better career suggestions.',
        });

        setSystemMessages(dynamicSystemMessages);
      } catch (e) {
        setError('Failed to load notifications.');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [userId, role, year]);

  const totalCount = useMemo(() => {
    return assignmentAlerts.length + jobAlerts.length + blogAlerts.length + systemMessages.length;
  }, [assignmentAlerts.length, jobAlerts.length, blogAlerts.length, systemMessages.length]);

  return (
    <section className="notification-center">
      <div className="notification-header">
        <h2>Notification Center</h2>
        <span className="notification-count">{totalCount} alerts</span>
      </div>

      <p className="notification-subtitle">Assignment reminders, new jobs, blog updates, and system messages in one place.</p>

      {loading && <p className="notification-state">Loading notifications...</p>}
      {error && !loading && <p className="notification-state error">{error}</p>}

      {!loading && !error && (
        <div className="notification-grid">
          <article className="notification-card">
            <div className="notification-card-title">Assignment Reminders</div>
            {assignmentAlerts.length ? (
              <ul className="notification-list">
                {assignmentAlerts.map((item) => (
                  <li key={item.id}>
                    <span className="item-main">{item.name}</span>
                    <span className="item-meta">Due {formatRelativeDate(item.dueDate)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No upcoming assignments in next 7 days.</p>
            )}
            <Link to="/assignments" className="notification-link">Open Assignment Tracker</Link>
          </article>

          <article className="notification-card">
            <div className="notification-card-title">New Jobs Posted</div>
            {jobAlerts.length ? (
              <ul className="notification-list">
                {jobAlerts.map((item) => (
                  <li key={item.id}>
                    <span className="item-main">{item.title}</span>
                    <span className="item-meta">{item.company || 'Company not set'} • {formatRelativeDate(item.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No jobs available for your profile yet.</p>
            )}
            <Link to="/jobs" className="notification-link">Open Jobs</Link>
          </article>

          <article className="notification-card">
            <div className="notification-card-title">Blog Updates</div>
            {blogAlerts.length ? (
              <ul className="notification-list">
                {blogAlerts.map((item) => (
                  <li key={item.id}>
                    <span className="item-main">{item.title}</span>
                    <span className="item-meta">Published {formatRelativeDate(item.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No new blog updates.</p>
            )}
            <Link to="/blog" className="notification-link">Open Blog</Link>
          </article>

          <article className="notification-card">
            <div className="notification-card-title">System Messages</div>
            {systemMessages.length ? (
              <ul className="notification-list">
                {systemMessages.map((item) => (
                  <li key={item.id}>
                    <span className="item-main">{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No system messages right now.</p>
            )}
            <Link to="/tickets" className="notification-link">Open Support Tickets</Link>
          </article>
        </div>
      )}
    </section>
  );
}

export default NotificationCenter;
