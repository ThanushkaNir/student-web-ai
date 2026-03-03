import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './CoverLetter.css';

const API = 'http://localhost:8080/api';

function CoverLetter() {
  const DESCRIPTION_MIN = 30;
  const DESCRIPTION_MAX = 8000;

  const [searchParams] = useSearchParams();
  const jobIdParam = searchParams.get('jobId');
  const userId = localStorage.getItem('userId');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(jobIdParam || '');
  const [jobDescription, setJobDescription] = useState('');
  const [generated, setGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState({ selection: '', jobDescription: '', submit: '' });

  const validate = (values) => {
    const nextErrors = { selection: '', jobDescription: '', submit: '' };
    const hasJobId = Boolean(values.selectedJobId);
    const trimmedDescription = values.jobDescription.trim();

    if (!hasJobId && !trimmedDescription) {
      nextErrors.selection = 'Select a job or paste a job description.';
    }

    if (trimmedDescription && trimmedDescription.length < DESCRIPTION_MIN) {
      nextErrors.jobDescription = `Job description must be at least ${DESCRIPTION_MIN} characters.`;
    } else if (trimmedDescription.length > DESCRIPTION_MAX) {
      nextErrors.jobDescription = `Job description must be under ${DESCRIPTION_MAX} characters.`;
    }

    return nextErrors;
  };

  const handleDescriptionChange = (value) => {
    setJobDescription(value);
    const nextErrors = validate({ selectedJobId, jobDescription: value });
    setErrors((prev) => ({
      ...prev,
      selection: nextErrors.selection,
      jobDescription: nextErrors.jobDescription,
      submit: '',
    }));
  };

  const handleJobChange = (value) => {
    setSelectedJobId(value);
    const nextErrors = validate({ selectedJobId: value, jobDescription });
    setErrors((prev) => ({
      ...prev,
      selection: nextErrors.selection,
      jobDescription: nextErrors.jobDescription,
      submit: '',
    }));
  };

  const loadJobs = async () => {
    try {
      const res = await axios.get(`${API}/jobs`, { params: { userId } });
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadJobs();
  }, [userId]);

  useEffect(() => {
    if (jobIdParam) setSelectedJobId(jobIdParam);
  }, [jobIdParam]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const nextErrors = validate({ selectedJobId, jobDescription });
    if (nextErrors.selection || nextErrors.jobDescription) {
      setErrors(nextErrors);
      return;
    }

    setGenerating(true);
    setGenerated(null);
    setErrors((prev) => ({ ...prev, submit: '' }));
    try {
      const res = await axios.post(`${API}/cover-letter/generate`, {
        userId: Number(userId),
        jobId: selectedJobId ? Number(selectedJobId) : null,
        jobDescription: jobDescription.trim() || null,
      });
      setGenerated(res.data);
    } catch (e) {
      setErrors((prev) => ({ ...prev, submit: 'Failed to generate cover letter. Please try again.' }));
    } finally {
      setGenerating(false);
    }
  };

  if (!userId) {
    return <div className="cover-letter-page"><div className="container"><p className="muted">Please log in.</p></div></div>;
  }

  return (
    <div className="cover-letter-page">
      <div className="container">
        <header className="page-header">
          <h1>AI-Powered Cover Letter Generator</h1>
          <p>Instantly generate personalized, professional cover letters tailored to specific job descriptions. Save time and increase your application success rate.</p>
        </header>

        <form onSubmit={handleGenerate} className="card cover-form">
          <h3>Generate AI-Powered Cover Letter</h3>
          <label>Step 1: Select a job from portal</label>
          <select
            value={selectedJobId}
            onChange={(e) => handleJobChange(e.target.value)}
            aria-invalid={Boolean(errors.selection)}
            aria-describedby={errors.selection ? 'cover-selection-error' : undefined}
          >
            <option value="">— Or paste job description below —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title} - {j.company || 'N/A'}</option>
            ))}
          </select>
          {errors.selection && <p id="cover-selection-error" className="cover-error">{errors.selection}</p>}
          <label>Step 2: Or paste job description</label>
          <textarea 
            placeholder="Or paste the full job description here. Include job title, company, responsibilities, and required skills."
            value={jobDescription} 
            onChange={(e) => handleDescriptionChange(e.target.value)} 
            rows={6}
            maxLength={DESCRIPTION_MAX}
            aria-invalid={Boolean(errors.jobDescription)}
            aria-describedby={errors.jobDescription ? 'cover-description-error' : undefined}
          />
          {errors.jobDescription && <p id="cover-description-error" className="cover-error">{errors.jobDescription}</p>}
          {errors.submit && <p className="cover-error">{errors.submit}</p>}
          <p className="help-text">Tip: The more detailed the job description, the better your cover letter will be.</p>
          <button type="submit" className="btn btn-primary" disabled={generating || (!selectedJobId && !jobDescription.trim())}>
            {generating ? 'Generating…' : 'Generate Tailored Cover Letter'}
          </button>
        </form>

        {generated && (
          <div className="card cover-result">
            <h3>Your AI-Generated Cover Letter</h3>
            <p className="cover-intro">Professional, personalized, and ready to use. Feel free to customize further.</p>
            <div className="cover-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{generated.generatedText}</div>
            <div className="cover-actions">
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => {
                  navigator.clipboard.writeText(generated.generatedText);
                  alert('Cover letter copied to clipboard!');
                }}
              >
                Copy to Clipboard
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setGenerated(null)}
              >
                Generate Another
              </button>
            </div>
          </div>
        )}

        <div className="page-links">
          <Link to="/jobs" className="btn btn-primary">Jobs</Link>
          <Link to="/resume" className="btn btn-ghost">Resume Match</Link>
          <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default CoverLetter;
