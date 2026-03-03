import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './DownloadCenter.css';

const API = 'http://localhost:8080/api';

function DownloadCenter() {
  const userId = localStorage.getItem('userId');
  const [subjects, setSubjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [subjectRes, docRes] = await Promise.all([
          axios.get(`${API}/subjects`),
          axios.get(`${API}/documents/by-user/${userId}`, {
            params: { requesterUserId: Number(userId) },
          }),
        ]);

        setSubjects(Array.isArray(subjectRes.data) ? subjectRes.data : []);
        setDocuments(Array.isArray(docRes.data) ? docRes.data : []);
      } catch (e) {
        console.error(e);
        setSubjects([]);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const subjectById = useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => map.set(String(subject.id), subject));
    return map;
  }, [subjects]);

  const semesterFilteredSubjects = useMemo(() => {
    if (selectedSemester === 'ALL') return subjects;
    return subjects.filter((subject) => String(subject.semester || '') === String(selectedSemester));
  }, [selectedSemester, subjects]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const subject = subjectById.get(String(doc.subjectId));
      if (selectedSemester !== 'ALL') {
        if (!subject || String(subject.semester || '') !== String(selectedSemester)) return false;
      }
      if (selectedSubjectId !== 'ALL' && String(doc.subjectId) !== String(selectedSubjectId)) {
        return false;
      }
      return true;
    });
  }, [documents, selectedSemester, selectedSubjectId, subjectById]);

  const downloadTextNote = (doc) => {
    const content = doc.contentOrPath || '';
    const safeName = (doc.title || 'note').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName || 'note'}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (!userId) {
    return (
      <div className="download-center-page">
        <div className="container"><p className="muted">Please log in.</p></div>
      </div>
    );
  }

  return (
    <div className="download-center-page">
      <div className="container">
        <header className="page-header">
          <h1>Download Center</h1>
          <p>Download all your notes from one place with subject and semester filters.</p>
        </header>

        <section className="card filter-card">
          <div className="filter-grid">
            <label>
              Semester
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setSelectedSubjectId('ALL');
                }}
              >
                <option value="ALL">All Semesters</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </label>

            <label>
              Subject
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="ALL">All Subjects</option>
                {semesterFilteredSubjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {loading ? (
          <p className="muted">Loading notes...</p>
        ) : filteredDocuments.length === 0 ? (
          <p className="muted">No notes found for selected filters.</p>
        ) : (
          <section className="download-list">
            {filteredDocuments.map((doc) => {
              const subject = subjectById.get(String(doc.subjectId));
              const canFileDownload = doc.type === 'FILE' || doc.type === 'PDF';
              return (
                <article className="card download-item" key={doc.id}>
                  <div className="download-meta">
                    <h3>{doc.title}</h3>
                    <p>
                      {(subject?.name || 'Unknown Subject')}
                      {subject?.semester ? ` • Semester ${subject.semester}` : ''}
                      {doc.weekNumber ? ` • Week ${doc.weekNumber}` : ''}
                    </p>
                    {doc.lectureTopic && <p className="topic">Topic: {doc.lectureTopic}</p>}
                  </div>
                  <div className="download-actions">
                    {canFileDownload ? (
                      <a href={`${API}/documents/${doc.id}/download?userId=${encodeURIComponent(String(userId))}`} target="_blank" rel="noreferrer" className="btn btn-primary">
                        Download
                      </a>
                    ) : (
                      <button type="button" className="btn btn-primary" onClick={() => downloadTextNote(doc)}>
                        Download
                      </button>
                    )}
                    <Link to={`/study-library`} className="btn btn-ghost">Open Subject</Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <div className="page-links">
          <Link to="/study-library" className="btn btn-ghost">Study Library</Link>
          <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default DownloadCenter;
