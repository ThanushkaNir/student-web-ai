import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './StudyCalendar.css';

const API = 'http://localhost:8080/api';
const normalizeIsoDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.includes('T') ? value.split('T')[0] : value;
  }
  return String(value);
};

const getAssignmentDisplayDate = (assignment) => {
  if (assignment?.status === 'COMPLETED' && assignment?.completedAt) {
    return normalizeIsoDate(assignment.completedAt);
  }
  return normalizeIsoDate(assignment?.dueDate);
};

const isLateSubmission = (assignment) => {
  if (assignment?.status !== 'COMPLETED') return false;
  const doneDate = normalizeIsoDate(assignment?.completedAt);
  const dueDate = normalizeIsoDate(assignment?.dueDate);
  if (!doneDate || !dueDate) return false;
  return doneDate > dueDate;
};

function StudyCalendar() {
  const userId = localStorage.getItem('userId');
  const [slots, setSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'STUDY',
    details: '',
    slotDate: '',
    startTime: '09:00',
    endTime: '10:00',
  });

  const start = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-01`;
  const endDay = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
  const end = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  const loadSlots = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/study-slots`, {
        params: { userId, start, end },
      });
      setSlots(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/assignments`, { params: { userId } });
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setAssignments([]);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadSlots(), loadAssignments()]).finally(() => setLoading(false));
  }, [userId, start, end]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slotDate) return;
    try {
      await axios.post(`${API}/study-slots`, {
        userId: Number(userId),
        title: form.title.trim(),
        type: form.type,
        details: form.details?.trim() || null,
        slotDate: form.slotDate,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
      });
      setForm({ title: '', type: 'STUDY', details: '', slotDate: '', startTime: '09:00', endTime: '10:00' });
      setShowForm(false);
      await Promise.all([loadSlots(), loadAssignments()]);
    } catch (e) {
      alert('Failed to add slot');
    }
  };

  const deleteSlot = async (id) => {
    if (!window.confirm('Remove this study slot?')) return;
    try {
      await axios.delete(`${API}/study-slots/${id}`);
      await Promise.all([loadSlots(), loadAssignments()]);
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const slotsByDate = (Array.isArray(slots) ? slots : []).reduce((acc, s) => {
    const d = s.slotDate;
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  const assignmentsByDate = (Array.isArray(assignments) ? assignments : []).reduce((acc, a) => {
    const d = getAssignmentDisplayDate(a);
    if (!d) return acc;
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const monthLabel = new Date(currentMonth.year, currentMonth.month).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
  const firstDay = new Date(currentMonth.year, currentMonth.month, 1).getDay();
  const blanks = (firstDay + 6) % 7;
  const totalCells = blanks + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  if (!userId) {
    return (
      <div className="study-calendar-page">
        <div className="container"><p className="muted">Please log in.</p></div>
      </div>
    );
  }

  return (
    <div className="study-calendar-page">
      <div className="container">
        <header className="page-header">
          <h1>Study Calendar</h1>
          <p>Track semester events, exams, and assignment deadlines in one calendar.</p>
        </header>

        <div className="calendar-toolbar">
          <button type="button" className="btn btn-ghost" onClick={prevMonth}>← Prev</button>
          <h2 className="calendar-month">{monthLabel}</h2>
          <button type="button" className="btn btn-ghost" onClick={nextMonth}>Next →</button>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add study slot</button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card add-slot-form">
            <h3>Add calendar entry</h3>
            <input
              placeholder="Title (e.g. Mid Exam / DB Workshop)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="STUDY">Study Slot</option>
              <option value="EVENT">Semester Event</option>
              <option value="EXAM">Exam</option>
            </select>
            <label>Details (optional)</label>
            <textarea
              rows={3}
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              placeholder="Lecture hall, teacher note, event info..."
            />
            <label>Date</label>
            <input
              type="date"
              value={form.slotDate}
              onChange={(e) => setForm({ ...form, slotDate: e.target.value })}
              required
            />
            <div className="time-row">
              <label>Start</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
              <label>End</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Add</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="calendar-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
            {Array.from({ length: blanks }, (_, i) => (
              <div key={`b-${i}`} className="calendar-cell empty" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const daySlots = slotsByDate[dateStr] || [];
              const dayAssignments = assignmentsByDate[dateStr] || [];
              const hasPendingAssignment = dayAssignments.some((a) => a.status === 'PENDING');
              const hasCompletedAssignment = dayAssignments.some((a) => a.status === 'COMPLETED');
              const hasExam = daySlots.some((s) => (s.type || 'STUDY') === 'EXAM');
              const hasEvent = daySlots.some((s) => (s.type || 'STUDY') === 'EVENT');
              return (
                <div
                  key={dateStr}
                  className={`calendar-cell ${hasPendingAssignment ? 'has-assignment pending' : ''} ${!hasPendingAssignment && hasCompletedAssignment ? 'has-assignment completed' : ''} ${hasExam ? 'has-exam' : ''} ${hasEvent ? 'has-event' : ''}`}
                >
                  <span className="cell-date">{day}</span>

                  {dayAssignments.length > 0 && (
                    <div className="assignment-markers">
                      {dayAssignments.slice(0, 2).map((a) => (
                        <span
                          key={`a-${a.id}`}
                          className={`assignment-pill ${a.status === 'COMPLETED' ? 'done' : 'pending'}`}
                          title={(() => {
                            if (a.status === 'COMPLETED') {
                              return `${a.name} (${isLateSubmission(a) ? 'Late Submit' : 'Done'} on ${getAssignmentDisplayDate(a)})`;
                            }
                            return `${a.name} (Pending, due ${normalizeIsoDate(a.dueDate)})`;
                          })()}
                        >
                          {a.name} - {(() => {
                            if (a.status !== 'COMPLETED') return 'Pending';
                            return isLateSubmission(a)
                              ? `Late Submit (${getAssignmentDisplayDate(a)})`
                              : `Done (${getAssignmentDisplayDate(a)})`;
                          })()}
                        </span>
                      ))}
                      {dayAssignments.length > 2 && (
                        <span className="assignment-more">+{dayAssignments.length - 2} more</span>
                      )}
                    </div>
                  )}

                  <div className="cell-slots">
                    {daySlots.map((s) => (
                      <div key={s.id} className={`slot-item ${(s.type || 'STUDY').toLowerCase()}`}>
                        <span className="slot-time">
                          {(typeof s.startTime === 'string' ? s.startTime.slice(0, 5) : s.startTime) || '—'}–
                          {(typeof s.endTime === 'string' ? s.endTime.slice(0, 5) : s.endTime) || '—'}
                        </span>
                        <span className="slot-title">[{(s.type || 'STUDY')}] {s.title}</span>
                        <button type="button" className="slot-delete" onClick={() => deleteSlot(s.id)} title="Remove">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="page-links">
          <Link to="/assignments" className="btn btn-ghost">Assignment Tracker</Link>
          <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default StudyCalendar;
