import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ActivityDashboard.css';

const API = 'http://localhost:8080/api';

function formatWhen(value) {
  if (!value) return 'just now';
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'today';
}

function ActivityDashboard() {
  const userId = localStorage.getItem('userId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentNotes, setRecentNotes] = useState([]);
  const [recentCompletedAssignments, setRecentCompletedAssignments] = useState([]);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [latestJobs, setLatestJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadActivity = async () => {
      setLoading(true);
      setError('');
      try {
        const [quizRes, assignmentRes, completedRes, notesRes, jobsRes, ticketsRes] = await Promise.all([
          axios.get(`${API}/quiz/history`, { params: { userId } }),
          axios.get(`${API}/assignments`, { params: { userId } }),
          axios.get(`${API}/assignments/completed-recent`, { params: { userId, limit: 5 } }),
          axios.get(`${API}/documents/by-user/${userId}`, { params: { requesterUserId: Number(userId) } }),
          axios.get(`${API}/jobs`, { params: { userId } }),
          axios.get(`${API}/tickets/my`, { params: { userId } }),
        ]);

        const quizzes = Array.isArray(quizRes.data) ? quizRes.data.slice(0, 3) : [];
        const assignments = Array.isArray(assignmentRes.data) ? assignmentRes.data.slice(0, 3) : [];
        const completed = Array.isArray(completedRes.data) ? completedRes.data.slice(0, 5) : [];
        const uploadedNotes = Array.isArray(notesRes.data) ? notesRes.data.slice(0, 5) : [];
        const jobs = Array.isArray(jobsRes.data) ? jobsRes.data.slice(0, 3) : [];
        const tickets = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];

        setRecentNotes(uploadedNotes);
        setRecentCompletedAssignments(completed);
        setRecentQuizzes(quizzes);
        setRecentAssignments(assignments);
        setLatestJobs(jobs);

        const notes = [];
        quizzes.slice(0, 1).forEach((q) => {
          notes.push({ id: `quiz-${q.id}`, text: `Quiz finished: ${q.scoreObtained}/${q.totalQuestions}` });
        });
        assignments.filter((a) => a.status === 'PENDING').slice(0, 1).forEach((a) => {
          notes.push({ id: `ass-${a.id}`, text: `${a.name} is pending (due ${a.dueDate || 'soon'})` });
        });
        tickets.filter((t) => t.response && t.response.trim()).slice(0, 2).forEach((t) => {
          notes.push({ id: `ticket-${t.id}`, text: `New support response: ${t.subject}` });
        });
        if (jobs.length > 0) {
          notes.push({ id: 'jobs-new', text: `${jobs.length} latest job updates available` });
        }

        setNotifications(notes.slice(0, 4));
      } catch {
        setError('Failed to load activity summary.');
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [userId]);

  const percent = (score, total) => (total > 0 ? Math.round((score / total) * 100) : 0);

  return (
    <section className="activity-dashboard">
      <div className="activity-header">
        <h2>Activity Dashboard</h2>
        <span className="activity-badge">Smart Home</span>
      </div>
      <p className="activity-subtitle">Quick summary of your recent quizzes, assignments, latest jobs, and notifications.</p>

      {loading && <p className="activity-state">Loading summary...</p>}
      {error && !loading && <p className="activity-state error">{error}</p>}

      {!loading && !error && (
        <div className="activity-grid">
          <article className="activity-card">
            <h3>Recent Quizzes</h3>
            {recentQuizzes.length ? (
              <ul>
                {recentQuizzes.map((quiz) => (
                  <li key={quiz.id}>
                    <span>{quiz.scoreObtained}/{quiz.totalQuestions} ({percent(quiz.scoreObtained, quiz.totalQuestions)}%)</span>
                    <small>{formatWhen(quiz.completedAt)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No quiz attempts yet.</p>
            )}
            <Link to="/quiz-history" className="activity-link">View all quizzes</Link>
          </article>

          <article className="activity-card">
            <h3>Recent Assignments</h3>
            {recentAssignments.length ? (
              <ul>
                {recentAssignments.map((assignment) => (
                  <li key={assignment.id}>
                    <span>{assignment.name}</span>
                    <small>{assignment.status} • due {assignment.dueDate || '-'}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No assignments found.</p>
            )}
            <Link to="/assignments" className="activity-link">Open tracker</Link>
          </article>

          <article className="activity-card">
            <h3>Recently Uploaded Notes</h3>
            {recentNotes.length ? (
              <ul>
                {recentNotes.map((note) => (
                  <li key={note.id}>
                    <span>{note.title}</span>
                    <small>{note.fileType ? note.fileType.toUpperCase() : note.type} • {formatWhen(note.createdAt)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No uploaded notes yet.</p>
            )}
            <Link to="/study-library" className="activity-link">Open study library</Link>
          </article>

          <article className="activity-card">
            <h3>Recently Completed Assignments</h3>
            {recentCompletedAssignments.length ? (
              <ul>
                {recentCompletedAssignments.map((assignment) => (
                  <li key={assignment.id}>
                    <span>{assignment.name}</span>
                    <small>{assignment.subject || 'No subject'} • completed</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No completed assignments yet.</p>
            )}
            <Link to="/assignments" className="activity-link">View completed in tracker</Link>
          </article>

          <article className="activity-card">
            <h3>Latest Jobs</h3>
            {latestJobs.length ? (
              <ul>
                {latestJobs.map((job) => (
                  <li key={job.id}>
                    <span>{job.title}</span>
                    <small>{job.company || 'Company N/A'} • {formatWhen(job.createdAt)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No jobs available for your profile.</p>
            )}
            <Link to="/jobs" className="activity-link">Browse jobs</Link>
          </article>

          <article className="activity-card">
            <h3>Notifications</h3>
            {notifications.length ? (
              <ul>
                {notifications.map((note) => (
                  <li key={note.id}>
                    <span>{note.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No new notifications.</p>
            )}
            <Link to="/tickets" className="activity-link">Open notifications area</Link>
          </article>
        </div>
      )}
    </section>
  );
}

export default ActivityDashboard;
