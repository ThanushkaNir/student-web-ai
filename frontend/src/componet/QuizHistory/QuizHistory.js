import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './QuizHistory.css';

const API = 'http://localhost:8080/api';

function QuizHistory() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) return;
    axios
      .get(`${API}/quiz/history`, { params: { userId } })
      .then((res) => setAttempts(res.data))
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString();
  };

  const percent = (obtained, total) => (total > 0 ? Math.round((obtained / total) * 100) : 0);

  if (!userId) {
    return (
      <div className="quiz-history-page">
        <div className="container">
          <p className="muted">Please log in to see your score history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-history-page">
      <div className="container">
        <header className="page-header">
          <h1>Score History</h1>
          <p>Saved marks from your completed quizzes</p>
        </header>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : attempts.length === 0 ? (
          <p className="muted">No quiz attempts yet. Take a quiz from the Study Library.</p>
        ) : (
          <div className="table-wrap">
            <table className="score-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Time</th>
                  <th>Completed at</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, idx) => (
                  <tr key={a.id}>
                    <td>{idx + 1}</td>
                    <td>{a.scoreObtained} / {a.totalQuestions}</td>
                    <td>{percent(a.scoreObtained, a.totalQuestions)}%</td>
                    <td>{a.timeSeconds != null ? `${Math.floor(a.timeSeconds / 60)}m ${a.timeSeconds % 60}s` : '—'}</td>
                    <td>{formatDate(a.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="history-actions">
          <Link to="/study-library" className="btn btn-ghost">Study Library</Link>
          <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default QuizHistory;
