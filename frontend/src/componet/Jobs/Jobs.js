import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Jobs.css';

const API = 'http://localhost:8080/api';

function Jobs() {
  const TITLE_MIN = 4;
  const TITLE_MAX = 120;
  const COMPANY_MAX = 100;
  const FIELD_MAX = 80;
  const SKILLS_MAX = 300;
  const DESCRIPTION_MIN = 20;
  const DESCRIPTION_MAX = 4000;

  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole');
  const year = localStorage.getItem('userYear');

  const isAlumni = role === 'ALUMNI';
  const isAdmin = role === 'ADMIN';
  const isStudent = role === 'STUDENT';
  const canSeeJobs = isAlumni || isAdmin || year === '3' || year === '4';
  const canApply = isStudent && (year === '3' || year === '4');

  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formErrors, setFormErrors] = useState({
    title: '',
    company: '',
    field: '',
    skillsRequired: '',
    deadline: '',
    eligibleYears: '',
    description: '',
    submit: '',
  });

  const [form, setForm] = useState({
    title: '',
    company: '',
    description: '',
    category: 'INTERNSHIP',
    field: '',
    skillsRequired: '',
    deadline: '',
    eligibleYears: '3,4',
  });

  const [filters, setFilters] = useState({
    category: '',
    field: '',
    skills: '',
    deadlineBefore: '',
  });

  const validatePostForm = (values) => {
    const errors = {
      title: '',
      company: '',
      field: '',
      skillsRequired: '',
      deadline: '',
      eligibleYears: '',
      description: '',
      submit: '',
    };

    const title = values.title.trim();
    const company = values.company.trim();
    const field = values.field.trim();
    const skillsRequired = values.skillsRequired.trim();
    const description = values.description.trim();
    const eligibleYears = values.eligibleYears.trim();

    if (!title) {
      errors.title = 'Job title is required.';
    } else if (title.length < TITLE_MIN) {
      errors.title = `Job title must be at least ${TITLE_MIN} characters.`;
    } else if (title.length > TITLE_MAX) {
      errors.title = `Job title must be under ${TITLE_MAX} characters.`;
    }

    if (company && company.length > COMPANY_MAX) {
      errors.company = `Company must be under ${COMPANY_MAX} characters.`;
    }

    if (field && field.length > FIELD_MAX) {
      errors.field = `Field must be under ${FIELD_MAX} characters.`;
    }

    if (skillsRequired && skillsRequired.length > SKILLS_MAX) {
      errors.skillsRequired = `Skills must be under ${SKILLS_MAX} characters.`;
    }

    if (!eligibleYears) {
      errors.eligibleYears = 'Eligible years is required.';
    } else if (!/^([1-4])(,[1-4])*$/.test(eligibleYears)) {
      errors.eligibleYears = 'Eligible years must be like 3,4 or 4.';
    }

    if (!description) {
      errors.description = 'Description is required.';
    } else if (description.length < DESCRIPTION_MIN) {
      errors.description = `Description must be at least ${DESCRIPTION_MIN} characters.`;
    } else if (description.length > DESCRIPTION_MAX) {
      errors.description = `Description must be under ${DESCRIPTION_MAX} characters.`;
    }

    if (values.deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(values.deadline);
      if (!Number.isNaN(selectedDate.getTime()) && selectedDate < today) {
        errors.deadline = 'Deadline cannot be in the past.';
      }
    }

    return errors;
  };

  const updateFormField = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    const nextErrors = validatePostForm(nextForm);
    setFormErrors((prev) => ({ ...prev, ...nextErrors, submit: '' }));
  };

  const loadJobs = async () => {
    try {
      const params = { userId };
      if (filters.category) params.category = filters.category;
      if (filters.field.trim()) params.field = filters.field.trim();
      if (filters.skills.trim()) params.skills = filters.skills.trim();
      if (filters.deadlineBefore) params.deadlineBefore = filters.deadlineBefore;

      const res = await axios.get(`${API}/jobs`, { params });
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMyApplications = async () => {
    if (!userId || !canApply) {
      setAppliedJobIds([]);
      return;
    }
    try {
      const res = await axios.get(`${API}/jobs/my-applications`, { params: { userId } });
      setAppliedJobIds(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setAppliedJobIds([]);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadJobs();
    loadMyApplications();
  }, [userId, filters.category, filters.field, filters.skills, filters.deadlineBefore]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validatePostForm(form);
    if (
      validationErrors.title ||
      validationErrors.company ||
      validationErrors.field ||
      validationErrors.skillsRequired ||
      validationErrors.deadline ||
      validationErrors.eligibleYears ||
      validationErrors.description
    ) {
      setFormErrors(validationErrors);
      return;
    }

    try {
      await axios.post(`${API}/jobs`, {
        ...form,
        title: form.title.trim(),
        company: form.company.trim(),
        field: form.field.trim(),
        skillsRequired: form.skillsRequired.trim(),
        eligibleYears: form.eligibleYears.trim(),
        description: form.description.trim(),
        postedBy: Number(userId),
      });
      setForm({
        title: '',
        company: '',
        description: '',
        category: 'INTERNSHIP',
        field: '',
        skillsRequired: '',
        deadline: '',
        eligibleYears: '3,4',
      });
      setFormErrors({ title: '', company: '', field: '', skillsRequired: '', deadline: '', eligibleYears: '', description: '', submit: '' });
      setShowForm(false);
      loadJobs();
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: typeof err?.response?.data === 'string' ? err.response.data : 'Failed to post',
      }));
    }
  };

  const handleApply = async (jobId) => {
    try {
      await axios.post(`${API}/jobs/${jobId}/apply`, { userId: Number(userId) });
      setAppliedJobIds((prev) => [...new Set([...prev, jobId])]);
      alert('Application submitted successfully');
    } catch (err) {
      const msg = typeof err?.response?.data === 'string' ? err.response.data : 'Failed to apply';
      alert(msg);
    }
  };

  const deleteJob = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API}/jobs/${id}`);
      loadJobs();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : 'No deadline');

  if (!userId) {
    return <div className="jobs-page"><div className="container"><p className="muted">Please log in.</p></div></div>;
  }

  return (
    <div className="jobs-page">
      <div className="container">
        <header className="page-header">
          <h1>Job & Internship Portal</h1>
          <p>Only 3rd & 4th year students can view/apply. Alumni can add posts. Filter by field, skills, and deadline.</p>
        </header>

        {!canSeeJobs && (
          <div className="card notice">
            <p>Job listings are available only for 3rd and 4th year students. Update your profile year to see jobs.</p>
            <Link to="/userProfile">Profile</Link>
          </div>
        )}

        {(isAlumni || isAdmin) && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>+ Post Job / Internship</button>
            {showForm && (
              <form onSubmit={handleSubmit} className="card job-form">
                <h3>New posting</h3>
                <input
                  placeholder="Job title"
                  value={form.title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                  maxLength={TITLE_MAX}
                  aria-invalid={Boolean(formErrors.title)}
                  aria-describedby={formErrors.title ? 'jobs-title-error' : undefined}
                  required
                />
                {formErrors.title && <p id="jobs-title-error" className="jobs-error">{formErrors.title}</p>}
                <input
                  placeholder="Company"
                  value={form.company}
                  onChange={(e) => updateFormField('company', e.target.value)}
                  maxLength={COMPANY_MAX}
                  aria-invalid={Boolean(formErrors.company)}
                  aria-describedby={formErrors.company ? 'jobs-company-error' : undefined}
                />
                {formErrors.company && <p id="jobs-company-error" className="jobs-error">{formErrors.company}</p>}
                <select value={form.category} onChange={(e) => updateFormField('category', e.target.value)}>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="FULL_TIME">Full-time</option>
                </select>
                <input
                  placeholder="Field (e.g., Web Development, Data Science)"
                  value={form.field}
                  onChange={(e) => updateFormField('field', e.target.value)}
                  maxLength={FIELD_MAX}
                  aria-invalid={Boolean(formErrors.field)}
                  aria-describedby={formErrors.field ? 'jobs-field-error' : undefined}
                />
                {formErrors.field && <p id="jobs-field-error" className="jobs-error">{formErrors.field}</p>}
                <input
                  placeholder="Skills required (comma separated)"
                  value={form.skillsRequired}
                  onChange={(e) => updateFormField('skillsRequired', e.target.value)}
                  maxLength={SKILLS_MAX}
                  aria-invalid={Boolean(formErrors.skillsRequired)}
                  aria-describedby={formErrors.skillsRequired ? 'jobs-skills-error' : undefined}
                />
                {formErrors.skillsRequired && <p id="jobs-skills-error" className="jobs-error">{formErrors.skillsRequired}</p>}
                <label className="input-label">Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => updateFormField('deadline', e.target.value)}
                  aria-invalid={Boolean(formErrors.deadline)}
                  aria-describedby={formErrors.deadline ? 'jobs-deadline-error' : undefined}
                />
                {formErrors.deadline && <p id="jobs-deadline-error" className="jobs-error">{formErrors.deadline}</p>}
                <input
                  placeholder="Eligible years (e.g., 3,4 or 4)"
                  value={form.eligibleYears}
                  onChange={(e) => updateFormField('eligibleYears', e.target.value)}
                  aria-invalid={Boolean(formErrors.eligibleYears)}
                  aria-describedby={formErrors.eligibleYears ? 'jobs-years-error' : undefined}
                />
                {formErrors.eligibleYears && <p id="jobs-years-error" className="jobs-error">{formErrors.eligibleYears}</p>}
                <textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  rows={4}
                  maxLength={DESCRIPTION_MAX}
                  aria-invalid={Boolean(formErrors.description)}
                  aria-describedby={formErrors.description ? 'jobs-description-error' : undefined}
                />
                {formErrors.description && <p id="jobs-description-error" className="jobs-error">{formErrors.description}</p>}
                {formErrors.submit && <p className="jobs-error">{formErrors.submit}</p>}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Post</button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowForm(false);
                      setFormErrors({ title: '', company: '', field: '', skillsRequired: '', deadline: '', eligibleYears: '', description: '', submit: '' });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {canSeeJobs && (
          <>
            <div className="jobs-filter card">
              <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All categories</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="PART_TIME">Part-time</option>
                <option value="FULL_TIME">Full-time</option>
              </select>
              <input
                placeholder="Filter by field"
                value={filters.field}
                onChange={(e) => setFilters({ ...filters, field: e.target.value })}
              />
              <input
                placeholder="Filter by skills (e.g., python,sql)"
                value={filters.skills}
                onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
              />
              <input
                type="date"
                value={filters.deadlineBefore}
                onChange={(e) => setFilters({ ...filters, deadlineBefore: e.target.value })}
              />
            </div>

            {loading ? (
              <p className="muted">Loading…</p>
            ) : (
              <div className="jobs-list">
                {jobs.length === 0 ? (
                  <p className="muted">No postings yet.</p>
                ) : (
                  jobs.map((j) => {
                    const alreadyApplied = appliedJobIds.includes(j.id);
                    const categoryLabel = (j.category || j.type || '').replace('_', ' ');
                    return (
                      <article key={j.id} className="card job-card">
                        <span className="job-type">{categoryLabel || 'Posting'}</span>
                        <h3>{j.title}</h3>
                        {j.company && <p className="job-company">{j.company}</p>}
                        <p className="job-meta"><strong>Field:</strong> {j.field || 'General'}</p>
                        <p className="job-meta"><strong>Skills:</strong> {j.skillsRequired || 'Not specified'}</p>
                        <p className="job-meta"><strong>Eligible Year:</strong> {j.eligibleYears || '3,4'}</p>
                        <p className="job-meta"><strong>Deadline:</strong> {formatDate(j.deadline)}</p>
                        <p className="job-desc">{j.description}</p>
                        <div className="job-actions">
                          <Link to={`/resume?jobId=${j.id}`} className="btn-sm btn-primary">Match Resume</Link>
                          <Link to={`/cover-letter?jobId=${j.id}`} className="btn-sm btn-ghost">Cover Letter</Link>
                          {canApply && (
                            <button
                              type="button"
                              className="btn-sm btn-primary"
                              disabled={alreadyApplied}
                              onClick={() => handleApply(j.id)}
                            >
                              {alreadyApplied ? 'Applied' : 'Apply'}
                            </button>
                          )}
                          {(isAlumni || isAdmin) && (
                            <button type="button" className="btn-sm btn-danger" onClick={() => deleteJob(j.id)}>Delete</button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        <div className="page-links">
          <Link to="/career" className="btn btn-ghost">Career Suggestor</Link>
          <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default Jobs;
