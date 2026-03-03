import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Resume.css';

const API = 'http://localhost:8080/api';

function Resume() {
  const [searchParams] = useSearchParams();
  const jobIdParam = searchParams.get('jobId');
  const userId = localStorage.getItem('userId');
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(jobIdParam || '');

  const loadResumes = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/resumes`, { params: { userId } });
      setResumes(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setResumes([]);
    }
  };

  const loadJobs = async () => {
    try {
      const res = await axios.get(`${API}/jobs`, { params: { userId } });
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setJobs([]);
    }
  };

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([loadResumes(), loadJobs()]).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (jobIdParam) setSelectedJobId(jobIdParam);
  }, [jobIdParam]);

  const handleSubmitResume = async (e) => {
    e.preventDefault();
    if (!resumeFile && !content.trim()) return;
    try {
      if (resumeFile) {
        const formData = new FormData();
        formData.append('userId', String(Number(userId)));
        formData.append('file', resumeFile);
        await axios.post(`${API}/resumes/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axios.post(`${API}/resumes`, { userId: Number(userId), content: content.trim() });
      }
      setContent('');
      setResumeFile(null);
      setShowForm(false);
      await loadResumes();
    } catch (e) {
      alert(e.response?.data || 'Failed to save resume');
    }
  };

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!selectedResumeId || !selectedJobId) return;
    setMatching(true);
    setMatchResult(null);
    try {
      const res = await axios.post(`${API}/match`, {
        userId: Number(userId),
        resumeId: Number(selectedResumeId),
        jobId: Number(selectedJobId),
      });
      setMatchResult(res.data);
    } catch (e) {
      alert('Failed to compute match');
    } finally {
      setMatching(false);
    }
  };

  if (!userId) {
    return <div className="resume-page"><div className="container"><p className="muted">Please log in.</p></div></div>;
  }

  return (
    <div className="resume-page">
      <div className="container">
        <header className="page-header">
          <h1>Resume Parser & Match</h1>
          <p>Upload CV (PDF/DOCX/TXT) or paste text. System analyzes skills, education, and experience, then shows matching percentage.</p>
        </header>

        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add / Paste Resume</button>
        {showForm && (
          <form onSubmit={handleSubmitResume} className="card resume-form">
            <h3>Upload CV or paste text</h3>
            <label>Upload file (PDF/DOCX/TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />
            <p className="muted">OR paste your CV text below</p>
            <textarea placeholder="Paste your CV or resume text here…" value={content} onChange={(e) => setContent(e.target.value)} rows={10} />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setResumeFile(null); }}>Cancel</button>
            </div>
          </form>
        )}

        <section className="match-section card">
          <h3>Match resume to job</h3>
          <form onSubmit={handleMatch} className="match-form">
            <label>Resume</label>
            <select value={selectedResumeId} onChange={(e) => setSelectedResumeId(e.target.value)} required>
              <option value="">Select resume</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>Resume #{r.id} ({r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : ''})</option>
              ))}
            </select>
            <label>Job</label>
            <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} required>
              <option value="">Select job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title} - {j.company || 'N/A'}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={matching || resumes.length === 0 || jobs.length === 0}>
              {matching ? 'Matching…' : 'Get match score'}
            </button>
          </form>
        </section>

        {matchResult && (
          <div className="card match-result">
            <h3>Match result</h3>
            <p className="score">Matching score: <strong>{matchResult.scorePercent}%</strong></p>
            <p className="points"><strong>Points to improve:</strong> {matchResult.pointsToImprove}</p>
          </div>
        )}

        <div className="page-links">
          <Link to="/jobs" className="btn btn-primary">Jobs</Link>
          <Link to="/career" className="btn btn-ghost">Career Suggestor</Link>
          <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default Resume;
