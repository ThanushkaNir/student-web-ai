import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AssignmentTracker.css';

const API = 'http://localhost:8080/api';
const YEARS = [1, 2, 3, 4];
const SEMESTERS = [1, 2];
const TITLE_MIN_LENGTH = 3;

const toLocalIsoDate = (year, monthIndex, day) => {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const normalizeIsoDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.includes('T') ? value.split('T')[0] : value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toLocalIsoDate(value.getFullYear(), value.getMonth(), value.getDate());
  }
  return String(value);
};

const formatIsoDateForDisplay = (value) => {
  const iso = normalizeIsoDate(value);
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString();
};

const getAssignmentCalendarDate = (assignment) => {
  if (assignment?.status === 'COMPLETED' && assignment?.completedAt) {
    return normalizeIsoDate(assignment.completedAt);
  }
  return normalizeIsoDate(assignment?.dueDate);
};

const isLateSubmission = (assignment) => {
  if (assignment?.status !== 'COMPLETED') return false;
  const completedDate = normalizeIsoDate(assignment?.completedAt);
  const dueDate = normalizeIsoDate(assignment?.dueDate);
  if (!completedDate || !dueDate) return false;
  return completedDate > dueDate;
};

function AssignmentTracker() {
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole') || 'STUDENT';
  const registeredYear = localStorage.getItem('userYear');
  const isStudentWithFixedYear = userRole === 'STUDENT' && !!registeredYear;
  const [subjects, setSubjects] = useState([]);
  const [selectedYearLevel, setSelectedYearLevel] = useState(
    isStudentWithFixedYear ? String(registeredYear) : (localStorage.getItem('selectedYearLevel') || '1')
  );
  const [selectedSemester, setSelectedSemester] = useState(localStorage.getItem('selectedSemester') || '1');
  const [assignments, setAssignments] = useState([]);
  const [dueSoon, setDueSoon] = useState([]);
  const [viewMode, setViewMode] = useState('LIST'); // LIST | CALENDAR
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [highlightedDate, setHighlightedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | PENDING | COMPLETED
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadMode, setUploadMode] = useState(null); // null | TEXT | PDF
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', subjectId: '', dueDate: '', dueTime: '09:00' });
  const [quickText, setQuickText] = useState({ title: '', subjectId: '', content: '' });
  const [quickPdf, setQuickPdf] = useState({ title: '', subjectId: '', file: null });
  const [formErrors, setFormErrors] = useState({ assignmentName: '', quickTextTitle: '', quickPdfTitle: '' });

  const nowDateTime = () => {
    const d = new Date();
    const dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dueTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { dueDate, dueTime };
  };

  const parseDateTimeFromContent = (raw) => {
    const text = String(raw || '');

    let dueDate = null;
    let dueTime = null;

    // Try ISO format first (YYYY-MM-DD)
    const isoDateMatch = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (isoDateMatch) {
      const y = Number(isoDateMatch[1]);
      const m = Number(isoDateMatch[2]);
      const d = Number(isoDateMatch[3]);
      if (y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        dueDate = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }

    // Try DMY format (DD-MM-YYYY or MM-DD-YYYY)
    if (!dueDate) {
      const dmy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
      if (dmy) {
        let a = Number(dmy[1]);
        let b = Number(dmy[2]);
        const y = Number(dmy[3]);
        let day = a;
        let month = b;
        if (a <= 12 && b > 12) {
          day = b;
          month = a;
        }
        if (y >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          dueDate = `${String(y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    // Try ordinal month names: "14th April 2026" or "April 14th, 2026"
    if (!dueDate) {
      const monthNames = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
      };

      // Pattern: "14th April 2026" or "14 April 2026"
      const ordinalPattern = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{4})\b/i);
      if (ordinalPattern) {
        const day = Number(ordinalPattern[1]);
        const monthName = ordinalPattern[2].toLowerCase();
        const year = Number(ordinalPattern[3]);
        const month = monthNames[monthName];
        if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
          dueDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }

      // Pattern: "April 14th, 2026" or "April 14, 2026"
      if (!dueDate) {
        const reverseOrdinalPattern = text.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})\b/i);
        if (reverseOrdinalPattern) {
          const monthName = reverseOrdinalPattern[1].toLowerCase();
          const day = Number(reverseOrdinalPattern[2]);
          const year = Number(reverseOrdinalPattern[3]);
          const month = monthNames[monthName];
          if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
            dueDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }
      }
    }

    // Parse 12-hour time format (11:59 PM)
    const time12 = text.match(/\b(\d{1,2}):(\d{2})\s*([AaPp][Mm])\b/);
    if (time12) {
      let h = Number(time12[1]);
      const m = Number(time12[2]);
      const ap = time12[3].toUpperCase();
      if (h === 12) h = 0;
      if (ap === 'PM') h += 12;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        dueTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    // Parse 24-hour time format
    if (!dueTime) {
      const time24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
      if (time24) {
        dueTime = `${String(Number(time24[1])).padStart(2, '0')}:${time24[2]}`;
      }
    }

    return {
      dueDate,
      dueTime,
    };
  };

  const subjectNameById = (subjectId) => {
    const s = subjects.find((item) => String(item.id) === String(subjectId));
    return s?.name || '—';
  };

  const createFallbackAssignment = async ({ source, title, subjectId, dueDate, dueTime }) => {
    const current = nowDateTime();
    await axios.post(`${API}/assignments`, {
      userId: Number(userId),
      name: `[${source}] ${title}`,
      subject: subjectNameById(subjectId),
      dueDate: dueDate || current.dueDate,
      dueTime: dueTime || current.dueTime,
      status: 'PENDING',
    });
  };

  const resetQuickUploads = () => {
    setUploadMode(null);
    setQuickText({ title: '', subjectId: '', content: '' });
    setQuickPdf({ title: '', subjectId: '', file: null });
    setFormErrors((prev) => ({ ...prev, quickTextTitle: '', quickPdfTitle: '' }));
  };

  const openUploadMode = (mode) => {
    const firstSubjectId = subjects.length > 0 ? String(subjects[0].id) : '';
    setUploadMode(mode);
    if (mode === 'TEXT') {
      setQuickText((prev) => ({ ...prev, subjectId: prev.subjectId || firstSubjectId }));
    }
    if (mode === 'PDF') {
      setQuickPdf((prev) => ({ ...prev, subjectId: prev.subjectId || firstSubjectId }));
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
      setApiError(e.response?.data?.message || 'Could not load assignments. Is the backend running on port 8080?');
    }
  };

  const loadDueSoon = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/assignments/due-soon`, { params: { userId, days: 7 } });
      setDueSoon(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setDueSoon([]);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await axios.get(`${API}/subjects`, {
        params: {
          yearLevel: Number(selectedYearLevel),
          semester: Number(selectedSemester),
        },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setSubjects(list);
      if (list.length > 0) {
        const first = String(list[0].id);
        setQuickText((prev) => ({ ...prev, subjectId: prev.subjectId || first }));
        setQuickPdf((prev) => ({ ...prev, subjectId: prev.subjectId || first }));
      }
    } catch (e) {
      console.error(e);
      setSubjects([]);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setApiError('');
    setLoading(true);
    Promise.all([loadAssignments(), loadDueSoon(), loadSubjects()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedYearLevel, selectedSemester]);

  useEffect(() => {
    localStorage.setItem('selectedYearLevel', selectedYearLevel);
    localStorage.setItem('selectedSemester', selectedSemester);
  }, [selectedSemester, selectedYearLevel]);

  const handleQuickTextUpload = async (e) => {
    e.preventDefault();
    if (quickText.title.trim().length < TITLE_MIN_LENGTH) {
      setFormErrors((prev) => ({ ...prev, quickTextTitle: `Title must be at least ${TITLE_MIN_LENGTH} letters.` }));
      return;
    }
    if (!quickText.title.trim() || !quickText.subjectId || !quickText.content.trim()) {
      alert('Please fill title, subject, and content.');
      return;
    }

    try {
      setUploading(true);
      await axios.post(`${API}/documents/text`, {
        title: quickText.title.trim(),
        subjectId: Number(quickText.subjectId),
        type: 'TEXT',
        contentOrPath: quickText.content.trim(),
        userId: Number(userId),
      });
      resetQuickUploads();
      await Promise.all([loadAssignments(), loadDueSoon()]);
    } catch (err) {
      const message = err.response?.data || 'Failed to upload text note';
      if (typeof message === 'string' && message.includes('No questions generated from the provided text.')) {
        try {
          const parsed = parseDateTimeFromContent(quickText.content);
          await createFallbackAssignment({
            source: 'TEXT',
            title: quickText.title.trim(),
            subjectId: quickText.subjectId,
            dueDate: parsed.dueDate,
            dueTime: parsed.dueTime,
          });
          resetQuickUploads();
          await Promise.all([loadAssignments(), loadDueSoon()]);
          alert('Text upload had no quiz questions, but assignment was created automatically.');
        } catch (fallbackErr) {
          alert('Could not create assignment fallback. Please try again.');
        }
      } else {
        alert(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleQuickPdfUpload = async (e) => {
    e.preventDefault();
    if (quickPdf.title.trim().length < TITLE_MIN_LENGTH) {
      setFormErrors((prev) => ({ ...prev, quickPdfTitle: `Title must be at least ${TITLE_MIN_LENGTH} letters.` }));
      return;
    }
    if (!quickPdf.title.trim() || !quickPdf.subjectId || !quickPdf.file) {
      alert('Please select PDF, title, and subject.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', quickPdf.file);
      formData.append('title', quickPdf.title.trim());
      formData.append('subjectId', quickPdf.subjectId);
      formData.append('userId', String(Number(userId)));

      await axios.post(`${API}/documents/pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      resetQuickUploads();
      await Promise.all([loadAssignments(), loadDueSoon()]);
    } catch (err) {
      const message = err.response?.data || err.response?.data?.message || 'Failed to upload PDF';
      if (typeof message === 'string' && message.includes('No questions generated from the provided PDF.')) {
        try {
          const parsed = parseDateTimeFromContent(quickPdf.title);
          await createFallbackAssignment({
            source: 'PDF',
            title: quickPdf.title.trim(),
            subjectId: quickPdf.subjectId,
            dueDate: parsed.dueDate,
            dueTime: parsed.dueTime,
          });
          resetQuickUploads();
          await Promise.all([loadAssignments(), loadDueSoon()]);
          alert('PDF upload had no quiz questions, but assignment was created automatically.');
        } catch (fallbackErr) {
          alert('Could not create assignment fallback. Please try again.');
        }
      } else {
        alert(message);
      }
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const pendingDueSoon = dueSoon.filter((a) => a.status === 'PENDING');
    if (pendingDueSoon.length === 0) return;

    const unseen = pendingDueSoon.filter((a) => {
      const reminderKey = `assignment_reminder_${a.id}_${a.dueDate}`;
      if (localStorage.getItem(reminderKey)) return false;
      localStorage.setItem(reminderKey, 'seen');
      return true;
    });

    if (unseen.length === 0) return;

    const first = unseen[0];
    alert(`Reminder: "${first.name}" is due on ${formatDate(first.dueDate)} at ${formatTime(first.dueTime)}.`);

    if ('Notification' in window) {
      const showNotification = () => {
        const body = unseen.length > 1
          ? `${first.name} + ${unseen.length - 1} more assignment(s) due soon.`
          : `${first.name} is due on ${formatDate(first.dueDate)} at ${formatTime(first.dueTime)}.`;
        new Notification('Assignment Reminder', { body });
      };

      if (Notification.permission === 'granted') {
        showNotification();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') showNotification();
        });
      }
    }
  }, [dueSoon]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < TITLE_MIN_LENGTH) {
      setFormErrors((prev) => ({ ...prev, assignmentName: `Assignment name must be at least ${TITLE_MIN_LENGTH} letters.` }));
      return;
    }
    if (!form.name.trim() || !form.dueDate) return;
    const submittedDueDate = form.dueDate;
    const selectedSubject = subjects.find((s) => String(s.id) === String(form.subjectId));
    const payload = {
      ...form,
      subjectId: form.subjectId ? Number(form.subjectId) : null,
      subject: selectedSubject ? selectedSubject.name : form.subject,
      userId: Number(userId),
    };
    try {
      if (editingId) {
        await axios.put(`${API}/assignments/${editingId}`, payload);
      } else {
        await axios.post(`${API}/assignments`, { ...payload, status: 'PENDING' });
      }
      setHighlightedDate(submittedDueDate);
      setCalendarMonth(new Date(`${submittedDueDate}T00:00:00`));
      setForm({ name: '', subject: '', subjectId: '', dueDate: '', dueTime: '09:00' });
      setShowForm(false);
      setEditingId(null);
      loadAssignments();
      loadDueSoon();
    } catch (e) {
      alert('Failed to save');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const next = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
    try {
      await axios.patch(`${API}/assignments/${id}/status`, null, { params: { status: next } });
      loadAssignments();
      loadDueSoon();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const deleteAssignment = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await axios.delete(`${API}/assignments/${id}`);
      loadAssignments();
      loadDueSoon();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      subject: a.subject || '',
      subjectId: a.subjectId || '',
      dueDate: a.dueDate || '',
      dueTime: typeof a.dueTime === 'string' ? a.dueTime.slice(0, 5) : (a.dueTime || '09:00'),
    });
    setShowForm(true);
    setFormErrors((prev) => ({ ...prev, assignmentName: '' }));
  };

  const filteredSubjectIds = new Set((subjects || []).map((s) => String(s.id)));
  const filteredSubjectNames = new Set((subjects || []).map((s) => (s.name || '').trim().toLowerCase()));

  const filtered = (Array.isArray(assignments) ? assignments : []).filter((a) => {
    if (a.subjectId && filteredSubjectIds.size > 0 && !filteredSubjectIds.has(String(a.subjectId))) {
      return false;
    }
    if (filteredSubjectNames.size > 0) {
      const assignmentSubject = (a.subject || '').trim().toLowerCase();
      if (assignmentSubject && !filteredSubjectNames.has(assignmentSubject)) return false;
    }
    if (filter === 'PENDING') return a.status === 'PENDING';
    if (filter === 'COMPLETED') return a.status === 'COMPLETED';
    return true;
  });

  const filteredDueSoon = (Array.isArray(dueSoon) ? dueSoon : []).filter((a) => {
    if (a.subjectId && filteredSubjectIds.size > 0 && !filteredSubjectIds.has(String(a.subjectId))) {
      return false;
    }
    if (filteredSubjectNames.size === 0) return true;
    const assignmentSubject = (a.subject || '').trim().toLowerCase();
    if (!assignmentSubject) return true;
    return filteredSubjectNames.has(assignmentSubject);
  });

  const monthName = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const dueByDate = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      const key = getAssignmentCalendarDate(a);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return map;
  }, [assignments]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells = [];
    for (let i = 0; i < totalCells; i += 1) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push(null);
      } else {
        const iso = toLocalIsoDate(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum);
        cells.push({ dayNum, iso, items: dueByDate.get(iso) || [] });
      }
    }
    return cells;
  }, [calendarMonth, dueByDate]);

  const previousMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const selectCalendarDate = (isoDate) => {
    setHighlightedDate(isoDate);
    setEditingId(null);
    setShowForm(true);
    setForm({ name: '', subject: '', subjectId: '', dueDate: isoDate, dueTime: '09:00' });
  };

  const formatDate = (d) => formatIsoDateForDisplay(d);
  const formatTime = (t) => {
    if (!t) return 'Any time';
    const text = typeof t === 'string' ? t.slice(0, 5) : t;
    return text || 'Any time';
  };
  const displayStatus = (status) => (status === 'COMPLETED' ? 'Done' : 'Pending');
  const getCalendarPillLabel = (assignment) => {
    const parsed = parseSource(assignment);
    if (assignment.status !== 'COMPLETED') {
      return `${parsed.displayName} - Due ${formatDate(assignment.dueDate)}`;
    }

    if (isLateSubmission(assignment)) {
      return `${parsed.displayName} - Late Submit ${formatDate(assignment.dueDate)}`;
    }

    return `${parsed.displayName} - Done ${formatDate(assignment.dueDate)}`;
  };

  const parseSource = (assignment) => {
    const rawName = (assignment?.name || '').trim();
    if (rawName.startsWith('[PDF]')) {
      return { source: 'PDF', displayName: rawName.replace(/^\[PDF\]\s*/i, '') };
    }
    if (rawName.startsWith('[TEXT]')) {
      return { source: 'TEXT', displayName: rawName.replace(/^\[TEXT\]\s*/i, '') };
    }
    return { source: 'MANUAL', displayName: rawName };
  };

  const autoGenerated = (Array.isArray(assignments) ? assignments : []).filter((a) => parseSource(a).source !== 'MANUAL');

  if (!userId) {
    return (
      <div className="assignment-tracker-page">
        <div className="container"><p className="muted">Please log in.</p></div>
      </div>
    );
  }

  return (
    <div className="assignment-tracker-page">
      <div className="container">
        <header className="page-header">
          <h1>Assignment Tracker</h1>
          <p>Assignment miss නොවෙන්න planner එකක්: add assignments, due dates, status, reminders, and calendar view.</p>
        </header>

        <section className="card academic-context-card">
          <div className="academic-context-grid">
            <label>
              Year
              <select
                value={selectedYearLevel}
                onChange={(e) => setSelectedYearLevel(e.target.value)}
                disabled={isStudentWithFixedYear}
              >
                {isStudentWithFixedYear ? (
                  <option value={String(registeredYear)}>Year {registeredYear}</option>
                ) : (
                  YEARS.map((year) => (
                    <option key={year} value={year}>Year {year}</option>
                  ))
                )}
              </select>
            </label>
            <label>
              Semester
              <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                {SEMESTERS.map((semester) => (
                  <option key={semester} value={semester}>Semester {semester}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted">Subjects and assignments are filtered for the selected year/semester.</p>
        </section>

        {apiError && (
          <div className="card api-error" role="alert">
            {apiError}
            <button type="button" className="dismiss-btn" onClick={() => setApiError('')}>Dismiss</button>
          </div>
        )}

        <section className="card auto-generated-section">
          <h3>Auto-generated from Uploads</h3>
          <p className="muted">Upload directly here. Name, subject, date, and time are captured and assignment is auto-generated.</p>
          <div className="upload-shortcuts">
            <button type="button" className="btn-sm btn-primary" onClick={() => openUploadMode('TEXT')}>Upload Text Note</button>
            <button type="button" className="btn-sm btn-ghost" onClick={() => openUploadMode('PDF')}>Upload PDF</button>
          </div>

          {uploadMode === 'TEXT' && (
            <form className="quick-upload-form" onSubmit={handleQuickTextUpload}>
              <h4>New Text Upload</h4>
              <input
                placeholder="Note title"
                value={quickText.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuickText({ ...quickText, title: value });
                  setFormErrors((prev) => ({
                    ...prev,
                    quickTextTitle: value.trim().length >= TITLE_MIN_LENGTH ? '' : `Title must be at least ${TITLE_MIN_LENGTH} letters.`,
                  }));
                }}
                required
              />
              {formErrors.quickTextTitle && <p className="field-error">{formErrors.quickTextTitle}</p>}
              <select
                value={quickText.subjectId}
                onChange={(e) => setQuickText({ ...quickText, subjectId: e.target.value })}
                required
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <textarea
                rows={4}
                placeholder="Paste note content"
                value={quickText.content}
                onChange={(e) => setQuickText({ ...quickText, content: e.target.value })}
                required
              />
              <div className="quick-upload-actions">
                <button type="submit" className="btn-sm btn-primary" disabled={uploading}>Upload & Auto-Create Assignment</button>
                <button type="button" className="btn-sm" onClick={resetQuickUploads}>Cancel</button>
              </div>
            </form>
          )}

          {uploadMode === 'PDF' && (
            <form className="quick-upload-form" onSubmit={handleQuickPdfUpload}>
              <h4>New PDF Upload</h4>
              <input
                placeholder="PDF title"
                value={quickPdf.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuickPdf({ ...quickPdf, title: value });
                  setFormErrors((prev) => ({
                    ...prev,
                    quickPdfTitle: value.trim().length >= TITLE_MIN_LENGTH ? '' : `Title must be at least ${TITLE_MIN_LENGTH} letters.`,
                  }));
                }}
                required
              />
              {formErrors.quickPdfTitle && <p className="field-error">{formErrors.quickPdfTitle}</p>}
              <select
                value={quickPdf.subjectId}
                onChange={(e) => setQuickPdf({ ...quickPdf, subjectId: e.target.value })}
                required
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setQuickPdf({ ...quickPdf, file: e.target.files?.[0] || null })}
                required
              />
              <div className="quick-upload-actions">
                <button type="submit" className="btn-sm btn-primary" disabled={uploading}>Upload & Auto-Create Assignment</button>
                <button type="button" className="btn-sm" onClick={resetQuickUploads}>Cancel</button>
              </div>
            </form>
          )}

          {autoGenerated.length === 0 ? (
            <p className="muted">No auto-generated assignments yet. Use the upload buttons above.</p>
          ) : (
            <ul className="auto-generated-list">
              {autoGenerated.slice(0, 5).map((a) => {
                const parsed = parseSource(a);
                return (
                  <li key={`auto-${a.id}`}>
                    <span className={`source-pill ${parsed.source.toLowerCase()}`}>{parsed.source}</span>
                    <strong>{parsed.displayName}</strong>
                    <span>{a.subject || '—'}</span>
                    <span>{formatDate(a.dueDate)} at {formatTime(a.dueTime)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Deadline reminder (in-system notification) */}
        {filteredDueSoon.length > 0 && (
          <section className="reminder-banner card">
            <h3>⏰ Due soon (next 7 days)</h3>
            <ul className="due-soon-list">
              {filteredDueSoon.map((a) => (
                <li key={a.id}>
                  {(() => {
                    const { source, displayName } = parseSource(a);
                    return (
                      <>
                        <span className={`source-pill ${source.toLowerCase()}`}>{source}</span>
                        <strong>{displayName}</strong> — {a.subject || '—'} — Due {formatDate(a.dueDate)} at {formatTime(a.dueTime)}
                      </>
                    );
                  })()}
                  {a.status === 'PENDING' && (
                    <button type="button" className="btn-sm btn-primary" onClick={() => toggleStatus(a.id, a.status)}>
                      Mark done
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <Link to="/study-calendar" className="link">View Study Calendar →</Link>
          </section>
        )}

        <div className="tracker-actions">
          <div className="filter-tabs">
            {['ALL', 'PENDING', 'COMPLETED'].map((f) => (
              <button
                key={f}
                type="button"
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
              >
                {f === 'COMPLETED' ? 'DONE' : f}
              </button>
            ))}
          </div>
          <div className="action-group">
            <div className="view-switch">
              <button type="button" className={viewMode === 'LIST' ? 'active' : ''} onClick={() => setViewMode('LIST')}>List</button>
              <button type="button" className={viewMode === 'CALENDAR' ? 'active' : ''} onClick={() => setViewMode('CALENDAR')}>Calendar</button>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', subject: '', subjectId: '', dueDate: '', dueTime: '09:00' }); }}>
              + Add Assignment
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card add-form">
            <h3>{editingId ? 'Edit' : 'New'} Assignment</h3>
            <input
              placeholder="Assignment name"
              value={form.name}
              onChange={(e) => {
                const value = e.target.value;
                setForm({ ...form, name: value });
                setFormErrors((prev) => ({
                  ...prev,
                  assignmentName: value.trim().length >= TITLE_MIN_LENGTH ? '' : `Assignment name must be at least ${TITLE_MIN_LENGTH} letters.`,
                }));
              }}
              required
            />
            {formErrors.assignmentName && <p className="field-error">{formErrors.assignmentName}</p>}
            <select
              value={form.subjectId}
              onChange={(e) => {
                const selected = subjects.find((s) => String(s.id) === e.target.value);
                setForm({ ...form, subjectId: e.target.value, subject: selected ? selected.name : '' });
              }}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
            <input
              type="time"
              value={form.dueTime || '09:00'}
              onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
            />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); setFormErrors((prev) => ({ ...prev, assignmentName: '' })); }}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : viewMode === 'CALENDAR' ? (
          <div className="calendar-card card">
            <div className="calendar-head">
              <button type="button" className="btn-sm" onClick={previousMonth}>◀</button>
              <h3>{monthName}</h3>
              <button type="button" className="btn-sm" onClick={nextMonth}>▶</button>
            </div>
            <div className="calendar-grid labels">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="calendar-label">{d}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarCells.map((cell, idx) => (
                <div
                  key={`cell-${idx}`}
                  className={`calendar-cell ${cell ? '' : 'empty'} ${cell && (form.dueDate === cell.iso || highlightedDate === cell.iso) ? 'selected' : ''}`}
                >
                  {cell && (
                    <button
                      type="button"
                      className="calendar-day-btn"
                      onClick={() => selectCalendarDate(cell.iso)}
                      title={`Add assignment for ${formatDate(cell.iso)}`}
                    >
                      <div className="day-number">{cell.dayNum}</div>
                      <div className="day-items">
                        {cell.items.slice(0, 2).map((a) => (
                          <span
                            key={a.id}
                            className={`day-pill ${
                              a.status === 'COMPLETED'
                                ? (isLateSubmission(a) ? 'late' : 'done')
                                : 'pending'
                            }`}
                            title={getCalendarPillLabel(a)}
                          >
                            {getCalendarPillLabel(a)}
                          </span>
                        ))}
                        {cell.items.length > 2 && <span className="more-pill">+{cell.items.length - 2} more</span>}
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="assignments-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Subject</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="muted">No assignments. Add one above.</td></tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className={a.status === 'COMPLETED' ? 'completed' : ''}>
                      <td>{parseSource(a).displayName}</td>
                      <td><span className={`source-pill ${parseSource(a).source.toLowerCase()}`}>{parseSource(a).source}</span></td>
                      <td>{a.subject || '—'}</td>
                      <td>{formatDate(a.dueDate)} at {formatTime(a.dueTime)}</td>
                      <td>
                        <button
                          type="button"
                          className={`status-btn ${a.status}`}
                          onClick={() => toggleStatus(a.id, a.status)}
                        >
                          {displayStatus(a.status)}
                        </button>
                      </td>
                      <td>
                        <button type="button" className="btn-sm" onClick={() => startEdit(a)}>Edit</button>
                        <button type="button" className="btn-sm btn-danger" onClick={() => deleteAssignment(a.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="page-links">
          <Link to="/study-calendar" className="btn btn-ghost">Study Calendar</Link>
          <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default AssignmentTracker;
