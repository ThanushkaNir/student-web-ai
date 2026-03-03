import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './StudyLibrary.css';

const API = 'http://localhost:8080/api';
const YEARS = [1, 2, 3, 4];
const SEMESTERS = [1, 2];

function StudyLibrary() {
  const rawRole = localStorage.getItem('userRole') || 'STUDENT';
  const userRole = rawRole.replace(/^ROLE_/i, '').trim().toUpperCase();
  const isStudent = userRole === 'STUDENT';
  const canManageSubjects = userRole === 'ADMIN';
  const canUseDocuments = isStudent || canManageSubjects;
  const canUploadDocuments = canUseDocuments;
  const registeredYear = localStorage.getItem('userYear');
  const isStudentWithFixedYear = userRole === 'STUDENT' && !!registeredYear;
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedYearLevel, setSelectedYearLevel] = useState(
    isStudentWithFixedYear ? String(registeredYear) : (localStorage.getItem('selectedYearLevel') || '1')
  );
  const [selectedSemester, setSelectedSemester] = useState(localStorage.getItem('selectedSemester') || '1');
  const [documents, setDocuments] = useState([]);
  const [bookmarkedDocIds, setBookmarkedDocIds] = useState([]);
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [subjectProgress, setSubjectProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [showAddText, setShowAddText] = useState(false);
  const [showAddPdf, setShowAddPdf] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    lecturerName: '',
    lecturerEmail: '',
    officeHours: '',
    description: '',
  });
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocWeek, setNewDocWeek] = useState('');
  const [newDocTopic, setNewDocTopic] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfWeek, setPdfWeek] = useState('');
  const [pdfTopic, setPdfTopic] = useState('');
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    loadSubjects();
    if (isStudent) {
      loadSubjectProgress();
    } else {
      setSubjectProgress([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearLevel, selectedSemester, isStudent]);

  useEffect(() => {
    localStorage.setItem('selectedYearLevel', selectedYearLevel);
    localStorage.setItem('selectedSemester', selectedSemester);
  }, [selectedSemester, selectedYearLevel]);

  useEffect(() => {
    if (!canUseDocuments) {
      setDocuments([]);
      setBookmarkedDocIds([]);
      setSubjectAssignments([]);
      return;
    }

    if (selectedSubjectId) {
      loadDocuments(selectedSubjectId);
      loadBookmarks(selectedSubjectId);
      loadSubjectAssignments(selectedSubjectId);
    } else {
      setDocuments([]);
      setBookmarkedDocIds([]);
      setSubjectAssignments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, canUseDocuments]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/subjects`, {
        params: {
          yearLevel: Number(selectedYearLevel),
          semester: Number(selectedSemester),
        },
      });
      let list = Array.isArray(res.data) ? res.data : [];

      // If scoped filters return empty for students, show all admin-created subjects.
      if (isStudent && list.length === 0) {
        const allRes = await axios.get(`${API}/subjects`);
        list = Array.isArray(allRes.data) ? allRes.data : [];
      }

      setSubjects(list);
      if (list.length && !selectedSubjectId) setSelectedSubjectId(list[0].id);
      if (list.length && selectedSubjectId && !list.find((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(list[0].id);
      }
      if (!list.length) {
        setSelectedSubjectId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (subjectId) => {
    try {
      const res = await axios.get(`${API}/documents/by-subject/${subjectId}`, {
        params: { userId: Number(userId) },
      });
      setDocuments(res.data);
    } catch (e) {
      console.error(e);
      setDocuments([]);
    }
  };

  const loadBookmarks = async (subjectId) => {
    if (!userId) {
      setBookmarkedDocIds([]);
      return;
    }

    try {
      const res = await axios.get(`${API}/bookmarks`, {
        params: { userId: Number(userId), subjectId: Number(subjectId) },
      });
      setBookmarkedDocIds(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setBookmarkedDocIds([]);
    }
  };

  const loadSubjectAssignments = async (subjectId) => {
    if (!userId || !subjectId) return;
    try {
      const res = await axios.get(`${API}/assignments/by-subject`, {
        params: { userId: Number(userId), subjectId: Number(subjectId) },
      });
      setSubjectAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setSubjectAssignments([]);
    }
  };

  const loadSubjectProgress = async () => {
    if (!userId) {
      setSubjectProgress([]);
      return;
    }
    try {
      const res = await axios.get(`${API}/progress/subjects`, {
        params: {
          userId: Number(userId),
          yearLevel: Number(selectedYearLevel),
          semester: Number(selectedSemester),
        },
      });
      setSubjectProgress(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setSubjectProgress([]);
    }
  };

  const addSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;
    try {
      const payload = {
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim(),
        lecturerName: subjectForm.lecturerName.trim(),
        lecturerEmail: subjectForm.lecturerEmail.trim(),
        officeHours: subjectForm.officeHours.trim(),
        description: subjectForm.description.trim(),
        yearLevel: Number(selectedYearLevel),
        semester: Number(selectedSemester),
      };

      const requestConfig = { params: { userId: Number(userId) } };

      if (editingSubjectId) {
        await axios.put(`${API}/subjects/${editingSubjectId}`, payload, requestConfig);
      } else {
        await axios.post(`${API}/subjects`, payload, requestConfig);
      }

      setSubjectForm({ name: '', code: '', lecturerName: '', lecturerEmail: '', officeHours: '', description: '' });
      setEditingSubjectId(null);
      setShowAddSubject(false);
      loadSubjects();
      loadSubjectProgress();
    } catch (e) {
      alert('Failed to add subject');
    }
  };

  const startEditSubject = (subject) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      name: subject.name || '',
      code: subject.code || '',
      lecturerName: subject.lecturerName || '',
      lecturerEmail: subject.lecturerEmail || '',
      officeHours: subject.officeHours || '',
      description: subject.description || '',
    });
    setShowAddSubject(true);
  };

  const cancelSubjectEdit = () => {
    setEditingSubjectId(null);
    setSubjectForm({ name: '', code: '', lecturerName: '', lecturerEmail: '', officeHours: '', description: '' });
    setShowAddSubject(false);
  };

  const deleteSubject = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await axios.delete(`${API}/subjects/${id}`, { params: { userId: Number(userId) } });
      if (selectedSubjectId === id) setSelectedSubjectId(null);
      loadSubjects();
      loadSubjectProgress();
    } catch {
      alert('Failed to delete subject');
    }
  };

  const canModifyDocument = (doc) => {
    if (!doc) return false;
    const ownerId = doc.userId != null ? String(doc.userId) : '';
    return ownerId !== '' && ownerId === String(userId || '');
  };

  const addTextNote = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !selectedSubjectId) return;
    try {
      await axios.post(`${API}/documents/text`, {
        title: newDocTitle.trim(),
        subjectId: selectedSubjectId,
        type: 'TEXT',
        contentOrPath: newDocContent.trim(),
        weekNumber: newDocWeek ? Number(newDocWeek) : null,
        lectureTopic: newDocTopic.trim(),
        userId: userId ? Number(userId) : null,
      });
      setNewDocTitle('');
      setNewDocContent('');
      setNewDocWeek('');
      setNewDocTopic('');
      setShowAddText(false);
      loadDocuments(selectedSubjectId);
      loadSubjectAssignments(selectedSubjectId);
      loadSubjectProgress();
    } catch (e) {
      alert(e.response?.data || 'Failed to add note');
    }
  };

  const addPdf = async (e) => {
    e.preventDefault();
    if (!pdfFile || !pdfTitle.trim() || !selectedSubjectId) return;
    const form = new FormData();
    form.append('file', pdfFile);
    form.append('title', pdfTitle.trim());
    form.append('subjectId', selectedSubjectId);
    if (pdfWeek) form.append('weekNumber', String(Number(pdfWeek)));
    if (pdfTopic.trim()) form.append('lectureTopic', pdfTopic.trim());
    if (userId) form.append('userId', userId);
    try {
      await axios.post(`${API}/documents/pdf`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPdfFile(null);
      setPdfTitle('');
      setPdfWeek('');
      setPdfTopic('');
      setShowAddPdf(false);
      loadDocuments(selectedSubjectId);
      loadSubjectAssignments(selectedSubjectId);
      loadSubjectProgress();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to upload PDF');
    }
  };

  const startEdit = (doc) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.type === 'TEXT' ? doc.contentOrPath : '');
  };

  const cancelEdit = () => {
    setEditingDoc(null);
    setEditTitle('');
    setEditContent('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    try {
      const updates = {
        title: editTitle.trim(),
      };
      if (editingDoc.type === 'TEXT') {
        updates.contentOrPath = editContent.trim();
      }
      await axios.put(`${API}/documents/${editingDoc.id}`, updates, {
        params: { userId: Number(userId) },
      });
      cancelEdit();
      loadDocuments(selectedSubjectId);
    } catch (e) {
      alert(e.response?.data || 'Failed to update document');
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`${API}/documents/${id}`, {
        params: { userId: Number(userId) },
      });
      loadDocuments(selectedSubjectId);
      loadSubjectProgress();
    } catch (e) {
      const message = e.response?.data?.message || e.response?.data || 'Failed to delete';
      alert(message);
    }
  };

  const toggleBookmark = async (docId) => {
    if (!userId) {
      alert('Please login to bookmark notes.');
      return;
    }

    const isBookmarked = bookmarkedDocIds.includes(docId);
    try {
      if (isBookmarked) {
        await axios.delete(`${API}/bookmarks`, {
          params: { userId: Number(userId), documentId: Number(docId) },
        });
        setBookmarkedDocIds((prev) => prev.filter((id) => id !== docId));
      } else {
        await axios.post(`${API}/bookmarks`, {
          userId: Number(userId),
          documentId: Number(docId),
        });
        setBookmarkedDocIds((prev) => [...prev, docId]);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update bookmark.');
    }
  };

  const bookmarkedDocuments = documents.filter((doc) => bookmarkedDocIds.includes(doc.id));

  return (
    <div className="study-library-page">
      <div className="container">
        <header className="page-header">
          <h1>Study Library</h1>
          <p>{canUseDocuments ? 'One page with two sections: Admin-created subjects and uploaded notes/documents.' : 'Study library.'}</p>
        </header>

        {isStudent && (
          <section className="card subject-progress-panel">
            <div className="progress-panel-header">
              <h3>Subject Progress Tracking</h3>
              <p>Completed assignments, quiz marks, and overall progress by subject.</p>
            </div>

            {subjectProgress.length === 0 ? (
              <p className="muted">No progress data yet for this year/semester.</p>
            ) : (
              <div className="subject-progress-grid">
                {subjectProgress.map((item) => (
                  <article className="subject-progress-card" key={item.subjectId}>
                    <div className="subject-progress-top">
                      <h4>{item.subjectName}</h4>
                      <span className="overall-pill">{item.overallProgressPercent}%</span>
                    </div>
                    <p className="progress-subline">
                      {item.subjectCode || 'No code'} {item.lecturerName ? `• ${item.lecturerName}` : ''}
                    </p>
                    <p className="progress-subline">
                      {item.lecturerEmail || 'Email N/A'}
                      {item.officeHours ? ` • ${item.officeHours}` : ''}
                    </p>
                    <div className="progress-metric">
                      <span>Assignments</span>
                      <strong>{item.completedAssignments}/{item.totalAssignments} ({item.assignmentCompletionPercent}%)</strong>
                    </div>
                    <div className="progress-metric">
                      <span>Quiz Average</span>
                      <strong>{item.quizAveragePercent}% ({item.quizAttempts} attempts)</strong>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${item.overallProgressPercent}%` }} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <div className={`library-layout ${!canUseDocuments ? 'admin-only' : ''}`}>
          <aside className="subject-sidebar">
            <div className="section-header-chip">
              <p className="section-kicker">Section 1</p>
              <h3>Subjects (Admin Created)</h3>
            </div>

            <div className="academic-filters">
              <div className="academic-filter-group">
                <label>Year</label>
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
              </div>
              <div className="academic-filter-group">
                <label>Semester</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                  {SEMESTERS.map((semester) => (
                    <option key={semester} value={semester}>Semester {semester}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sidebar-header">
              <h2>Subjects</h2>
              {canManageSubjects && (
                <button type="button" className="btn-sm btn-primary" onClick={() => setShowAddSubject(true)}>+ Add</button>
              )}
            </div>
            {!canManageSubjects && (
              <p className="muted">Read-only for students. Subjects are managed by admins.</p>
            )}
            {canManageSubjects && showAddSubject && (
              <form onSubmit={addSubject} className="add-subject-form">
                <input value={subjectForm.name} onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Subject name" required />
                <input value={subjectForm.code} onChange={(e) => setSubjectForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="Subject code (e.g., IT2030)" />
                <input value={subjectForm.lecturerName} onChange={(e) => setSubjectForm((prev) => ({ ...prev, lecturerName: e.target.value }))} placeholder="Lecturer name" />
                <input value={subjectForm.lecturerEmail} onChange={(e) => setSubjectForm((prev) => ({ ...prev, lecturerEmail: e.target.value }))} placeholder="Lecturer email" type="email" />
                <input value={subjectForm.officeHours} onChange={(e) => setSubjectForm((prev) => ({ ...prev, officeHours: e.target.value }))} placeholder="Office hours (e.g., Mon 10-12)" />
                <input value={subjectForm.description} onChange={(e) => setSubjectForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description (optional)" />
                <div className="form-actions">
                  <button type="submit" className="btn-sm btn-primary">{editingSubjectId ? 'Update' : 'Save'}</button>
                  <button type="button" className="btn-sm" onClick={cancelSubjectEdit}>Cancel</button>
                </div>
              </form>
            )}
            {loading ? (
              <p className="muted">Loading…</p>
            ) : (
              <ul className="subject-list">
                {subjects.map((s) => (
                  <li key={s.id}>
                    <div className="subject-item">
                      <button
                        type="button"
                        className={selectedSubjectId === s.id ? 'active' : ''}
                        onClick={() => setSelectedSubjectId(s.id)}
                      >
                        <span>{s.name}</span>
                        <small>
                          {s.code || 'No code'}
                          {(s.yearLevel || s.semester) ? ` • Year ${s.yearLevel || '-'} Sem ${s.semester || '-'}` : ''}
                        </small>
                        <small>{s.lecturerName || 'Lecturer N/A'}{s.lecturerEmail ? ` • ${s.lecturerEmail}` : ''}</small>
                      </button>
                      {canManageSubjects && (
                        <div className="subject-item-actions">
                          <button type="button" className="btn-sm" onClick={() => startEditSubject(s)}>Edit</button>
                          <button type="button" className="btn-sm btn-danger" onClick={() => deleteSubject(s.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {canUseDocuments && (
            <main className="documents-main">
              {selectedSubjectId && (
              <>
                <div className="section-header-chip notes-section">
                  <p className="section-kicker">Section 2</p>
                  <h3>{isStudent ? 'My Notes (Student Uploaded)' : 'Subject Notes (Admin Uploaded)'}</h3>
                  <p className="muted">Upload PDF, Text, or DOC. Take quizzes, view flashcards, and manage your own notes.</p>
                </div>

                <div className="doc-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setShowAddText(true)}>+ Text Note</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddPdf(true)}>+ Upload PDF / DOC</button>
                </div>

                {canUploadDocuments && showAddText && (
                  <form onSubmit={addTextNote} className="card add-doc-form">
                    <h3>Add Text Note</h3>
                    <input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Title" required />
                    <div className="lecture-meta-grid">
                      <input value={newDocWeek} onChange={(e) => setNewDocWeek(e.target.value)} placeholder="Week number (e.g., 1)" type="number" min="1" />
                      <input value={newDocTopic} onChange={(e) => setNewDocTopic(e.target.value)} placeholder="Lecture topic (e.g., ER Diagrams)" />
                    </div>
                    <textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)} placeholder="Paste your notes here…" rows={6} />
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">Save Note</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowAddText(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {canUploadDocuments && showAddPdf && (
                  <form onSubmit={addPdf} className="card add-doc-form">
                    <h3>Upload PDF / DOC</h3>
                    <input value={pdfTitle} onChange={(e) => setPdfTitle(e.target.value)} placeholder="Title" required />
                    <div className="lecture-meta-grid">
                      <input value={pdfWeek} onChange={(e) => setPdfWeek(e.target.value)} placeholder="Week number (e.g., 2)" type="number" min="1" />
                      <input value={pdfTopic} onChange={(e) => setPdfTopic(e.target.value)} placeholder="Lecture topic" />
                    </div>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setPdfFile(e.target.files[0] || null)} />
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={!pdfFile}>Upload</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowAddPdf(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                <div className="documents-list">
                  {bookmarkedDocuments.length > 0 && (
                    <div className="card bookmarked-notes-panel">
                      <h3>Bookmarked Notes</h3>
                      <ul className="bookmarked-list">
                        {bookmarkedDocuments.map((doc) => (
                          <li key={`bookmark-${doc.id}`}>
                            <span>{doc.title}</span>
                            <button type="button" className="btn-sm" onClick={() => toggleBookmark(doc.id)}>
                              Remove Bookmark
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {documents.length === 0 ? (
                    <p className="muted">No documents in this subject. Add a text note or upload a PDF.</p>
                  ) : (
                    documents.map((doc) => (
                      editingDoc?.id === doc.id ? (
                        <form key={doc.id} onSubmit={saveEdit} className="card add-doc-form">
                          <h3>Edit {doc.type === 'TEXT' ? 'Text Note' : 'PDF Title'}</h3>
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" required />
                          {doc.type === 'TEXT' && (
                            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="Content" rows={6} />
                          )}
                          {doc.type === 'PDF' && (
                            <p className="muted">Note: Only the title can be edited for PDF documents.</p>
                          )}
                          <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Save Changes</button>
                            <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div key={doc.id} className="card doc-card">
                          <div className="doc-card-header">
                            <span className="doc-type">{doc.fileType ? doc.fileType.toUpperCase() : doc.type}</span>
                            <h4>{doc.title}</h4>
                            <p className="doc-meta-line">
                              {doc.weekNumber ? `Week ${doc.weekNumber}` : 'Week N/A'}
                              {doc.lectureTopic ? ` • ${doc.lectureTopic}` : ''}
                            </p>
                          </div>
                          <div className="doc-card-actions">
                            <button
                              type="button"
                              className={`btn-sm bookmark-btn ${bookmarkedDocIds.includes(doc.id) ? 'active' : ''}`}
                              onClick={() => toggleBookmark(doc.id)}
                            >
                              {bookmarkedDocIds.includes(doc.id) ? 'Bookmarked' : 'Bookmark'}
                            </button>
                            {canModifyDocument(doc) && (
                              <button type="button" className="btn-sm" onClick={() => startEdit(doc)}>Edit</button>
                            )}
                            {(doc.type === 'FILE' || doc.type === 'PDF') && (
                              <a href={`${API}/documents/${doc.id}/download?userId=${encodeURIComponent(String(userId))}`} target="_blank" rel="noreferrer">View / Download</a>
                            )}
                            <Link to={`/quiz?subjectId=${doc.subjectId}&documentId=${doc.id}`} className="btn-sm btn-ghost">Take Quiz</Link>
                            <Link to={`/quiz?subjectId=${doc.subjectId}&documentId=${doc.id}&mode=flashcards`} className="btn-sm btn-ghost">View Flashcards</Link>
                            {canModifyDocument(doc) && (
                              <button type="button" className="btn-sm btn-danger" onClick={() => deleteDocument(doc.id)}>Delete</button>
                            )}
                          </div>
                        </div>
                      )
                    ))
                  )}
                </div>

                <div className="card subject-assignment-panel">
                  <h3>Assignments Linked To This Subject</h3>
                  {subjectAssignments.length === 0 ? (
                    <p className="muted">No assignments linked to this subject yet.</p>
                  ) : (
                    <ul className="subject-assignment-list">
                      {subjectAssignments.map((assignment) => (
                        <li key={assignment.id}>
                          <span>{assignment.name}</span>
                          <small>{assignment.status} • Due {assignment.dueDate || '-'}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
              )}
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudyLibrary;
