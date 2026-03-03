import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../Login/Login.css';
import './Register.css';

const ROLES = [
  { value: 'STUDENT', label: 'Student', emoji: '🎒', desc: 'Access study tools & career resources' },
  { value: 'ALUMNI',  label: 'Alumni',  emoji: '🌟', desc: 'Post jobs & mentor students' },
  { value: 'ADMIN',   label: 'Admin',   emoji: '⚙️', desc: 'Manage platform & content' },
];

function Register() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: '', email: '', password: '', role: 'STUDENT', year: null });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  const { name, email, password, role, year } = user;

  const onInput = (e) => {
    const { name: field, value } = e.target;
    setUser({ ...user, [field]: value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...user };
      if (!payload.year) delete payload.year;
      else payload.year = parseInt(payload.year, 10);
      await axios.post('http://localhost:8080/user', payload);
      alert('🎉 Registered successfully! Please sign in.');
      setUser({ name: '', email: '', password: '', role: 'STUDENT', year: null });
      navigate('/login');
    } catch (error) {
      const msg =
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.message
          || (error.code === 'ERR_NETWORK' ? 'Cannot connect to server on port 8080.' : null)
          || 'Registration failed. Please try again.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-wrap">

      {/* ── Left Panel ── */}
      <div className="al-panel al-left al-left-reg">
        <div className="al-left-inner">
          <Link to="/" className="al-logo">
            <span className="al-logo-icon">◆</span>
            <span>Student Hub</span>
          </Link>
          <div className="al-left-content">
            <h2>Start your academic journey the smart way.</h2>
            <p>Set up your account in under 2 minutes and unlock all the tools you need to study smarter and plan your career.</p>
            <div className="al-reg-steps">
              {[
                { num: '1', text: 'Choose your role' },
                { num: '2', text: 'Fill in your details' },
                { num: '3', text: 'Access your dashboard' },
              ].map((s) => (
                <div key={s.num} className="al-step">
                  <div className="al-step-num">{s.num}</div>
                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="al-left-img">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=700&q=80"
              alt="Students collaborating"
            />
            <div className="al-left-img-overlay" />
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="al-panel al-right">
        <div className="al-form-wrap">
          <p className="al-top-link">
            Already have an account? <Link to="/login">Sign in →</Link>
          </p>

          <div className="al-form-head">
            <div className="al-form-icon">🚀</div>
            <h1>Create your account</h1>
            <p>Join Student Hub — free forever</p>
          </div>

          <form onSubmit={onSubmit} className="al-form" noValidate>

            {/* Role selector */}
            <div className="al-field">
              <label>I am a…</label>
              <div className="al-role-grid">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`al-role-btn ${role === r.value ? 'selected' : ''}`}
                    onClick={() => setUser({ ...user, role: r.value })}
                    title={r.desc}
                  >
                    <span className="al-role-emoji">{r.emoji}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="al-field">
              <label htmlFor="reg-name">Full Name</label>
              <div className="al-input-wrap">
                <span className="al-input-icon">👤</span>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={onInput}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="al-field">
              <label htmlFor="reg-email">Email Address</label>
              <div className="al-input-wrap">
                <span className="al-input-icon">✉️</span>
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={onInput}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Year (students only) */}
            {role === 'STUDENT' && (
              <div className="al-field">
                <label htmlFor="reg-year">Academic Year</label>
                <div className="al-input-wrap al-no-icon">
                  <select
                    id="reg-year"
                    name="year"
                    value={year ?? ''}
                    onChange={(e) => setUser({ ...user, year: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Select year</option>
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="al-field">
              <label htmlFor="reg-password">Password</label>
              <div className="al-input-wrap">
                <span className="al-input-icon">🔒</span>
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={onInput}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="al-pw-toggle"
                  onClick={() => setShowPw((p) => !p)}
                  aria-label="Toggle password"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="al-submit" disabled={loading}>
              {loading ? <span className="al-spinner" /> : <>Create Account <span>→</span></>}
            </button>

            <p className="al-terms">
              By creating an account you agree to our{' '}
              <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          </form>

          <p className="al-bottom-note" style={{ marginTop: 20 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
