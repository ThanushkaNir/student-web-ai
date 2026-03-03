import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Career.css';

const API = 'http://localhost:8080/api';

function Career() {
  const FIELD_MIN = 5;
  const FIELD_MAX = 300;

  const userId = localStorage.getItem('userId');
  const [interests, setInterests] = useState('');
  const [skills, setSkills] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ interests: '', skills: '', submit: '' });

  const validate = (values) => {
    const nextErrors = { interests: '', skills: '', submit: '' };

    const trimmedInterests = values.interests.trim();
    const trimmedSkills = values.skills.trim();

    if (!trimmedInterests) {
      nextErrors.interests = 'Interests is required.';
    } else if (trimmedInterests.length < FIELD_MIN) {
      nextErrors.interests = `Interests must be at least ${FIELD_MIN} characters.`;
    } else if (trimmedInterests.length > FIELD_MAX) {
      nextErrors.interests = `Interests must be under ${FIELD_MAX} characters.`;
    }

    if (!trimmedSkills) {
      nextErrors.skills = 'Skills is required.';
    } else if (trimmedSkills.length < FIELD_MIN) {
      nextErrors.skills = `Skills must be at least ${FIELD_MIN} characters.`;
    } else if (trimmedSkills.length > FIELD_MAX) {
      nextErrors.skills = `Skills must be under ${FIELD_MAX} characters.`;
    }

    return nextErrors;
  };

  const handleChange = (field, value) => {
    if (field === 'interests') setInterests(value);
    if (field === 'skills') setSkills(value);

    const nextErrors = validate({ interests: field === 'interests' ? value : interests, skills: field === 'skills' ? value : skills });
    setErrors((prev) => ({ ...prev, interests: nextErrors.interests, skills: nextErrors.skills, submit: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const validationErrors = validate({ interests, skills });
    if (validationErrors.interests || validationErrors.skills) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setResult(null);
    setErrors((prev) => ({ ...prev, submit: '' }));
    try {
      const res = await axios.post(`${API}/career/suggest`, {
        userId: Number(userId),
        interests: interests.trim(),
        skills: skills.trim(),
      });
      setResult(res.data);
    } catch (e) {
      setErrors((prev) => ({ ...prev, submit: 'Failed to get suggestion. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return <div className="career-page"><div className="container"><p className="muted">Please log in.</p></div></div>;
  }

  return (
    <div className="career-page">
      <div className="container">
        <header className="page-header">
          <h1>Career Path Suggestor</h1>
          <p>Analyze your skills + interests and get the most suitable career path recommendation.</p>
        </header>

        <div className="card career-examples">
          <p><strong>Example 1:</strong> Python, ML, Data Analysis {'->'} Data Scientist / Machine Learning Engineer</p>
          <p><strong>Example 2:</strong> Linux, Networking, Cloud {'->'} DevOps Engineer / Cloud Engineer</p>
        </div>

        <form onSubmit={handleSubmit} className="card career-form">
          <label>Interests</label>
          <textarea
            placeholder="e.g. problem solving, automation, data-driven decisions"
            value={interests}
            onChange={(e) => handleChange('interests', e.target.value)}
            rows={3}
            maxLength={FIELD_MAX}
            aria-invalid={Boolean(errors.interests)}
            aria-describedby={errors.interests ? 'career-interests-error' : undefined}
          />
          {errors.interests && <p id="career-interests-error" className="career-error">{errors.interests}</p>}

          <label>Skills</label>
          <textarea
            placeholder="e.g. Python, ML, SQL OR Linux, Networking, Cloud"
            value={skills}
            onChange={(e) => handleChange('skills', e.target.value)}
            rows={3}
            maxLength={FIELD_MAX}
            aria-invalid={Boolean(errors.skills)}
            aria-describedby={errors.skills ? 'career-skills-error' : undefined}
          />
          {errors.skills && <p id="career-skills-error" className="career-error">{errors.skills}</p>}
          {errors.submit && <p className="career-error">{errors.submit}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Suggesting…' : 'Get suggestion'}
          </button>
        </form>

        {result && (
          <div className="card career-result">
            <h3>Suggested path</h3>
            <p className="path">{result.suggestedPath}</p>
            <p className="reason">{result.reason}</p>
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

export default Career;
