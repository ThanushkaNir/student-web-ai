import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminAnalyticsPanel.css';

const API = 'http://localhost:8080/api';

function AdminAnalyticsPanel() {
  const userId = localStorage.getItem('userId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    jobsPosted: 0,
    assignmentsCreated: 0,
    mostActiveUsers: [],
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API}/admin/analytics`, { params: { userId } });
        setStats({
          totalStudents: Number(res.data?.totalStudents || 0),
          jobsPosted: Number(res.data?.jobsPosted || 0),
          assignmentsCreated: Number(res.data?.assignmentsCreated || 0),
          mostActiveUsers: Array.isArray(res.data?.mostActiveUsers) ? res.data.mostActiveUsers : [],
        });
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load admin analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [userId]);

  return (
    <section className="admin-analytics-panel">
      <div className="analytics-header-row">
        <h2>Admin Analytics</h2>
        <span className="analytics-tag">Live stats</span>
      </div>

      {loading && <p className="analytics-state">Loading analytics...</p>}
      {error && !loading && <p className="analytics-state error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="analytics-kpis">
            <article className="analytics-kpi-card">
              <p className="kpi-label">Total Students</p>
              <p className="kpi-value">{stats.totalStudents}</p>
            </article>
            <article className="analytics-kpi-card">
              <p className="kpi-label">Jobs Posted</p>
              <p className="kpi-value">{stats.jobsPosted}</p>
            </article>
            <article className="analytics-kpi-card">
              <p className="kpi-label">Assignments Created</p>
              <p className="kpi-value">{stats.assignmentsCreated}</p>
            </article>
          </div>

          <div className="analytics-active-users">
            <h3>Most Active Users</h3>
            {stats.mostActiveUsers.length ? (
              <div className="active-users-table">
                <div className="table-head">
                  <span>User</span>
                  <span>Role</span>
                  <span>Activity</span>
                </div>
                {stats.mostActiveUsers.map((user) => (
                  <div className="table-row" key={user.userId}>
                    <span>{user.name}</span>
                    <span className="role-pill">{user.role}</span>
                    <span>{user.activityCount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">No activity data yet.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default AdminAnalyticsPanel;
