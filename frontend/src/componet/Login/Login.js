import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './Login.css';

const FEATURES = [
  { icon: '🧠', text: 'AI-powered quiz & flashcard generator' },
  { icon: '📅', text: 'Smart assignment tracker & calendar' },
  { icon: '💼', text: 'Career tools, resume builder & jobs board' },
  { icon: '💬', text: '24/7 AI chatbot & support tickets' },
];

function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const persistSession = (data) => {
    localStorage.setItem('userId', data.id);
    localStorage.setItem('userName', data.name || '');
    localStorage.setItem('userRole', data.role || 'STUDENT');
    if (data.profilePhoto) localStorage.setItem('userProfilePhoto', data.profilePhoto);
    else localStorage.removeItem('userProfilePhoto');
    if (data.year != null) localStorage.setItem('userYear', String(data.year));
    else localStorage.removeItem('userYear');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:8080/login', { email, password });
      persistSession(data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError('Google did not return a sign-in token.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:8080/auth/google', {
        credential: credentialResponse.credential,
      });
      persistSession(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-wrap">
      {/* ── Left Panel ── */}
      <div className="al-panel al-left">
        <div className="al-left-inner">
          <Link to="/" className="al-logo">
            <span className="al-logo-icon">◆</span>
            <span>Student Hub</span>
          </Link>
          <div className="al-left-content">
            <h2>Everything you need to succeed — in one place.</h2>
            <p>Join thousands of students, alumni and administrators using Student Hub to manage their academic journey.</p>
            <ul className="al-feature-list">
              {FEATURES.map((f) => (
                <li key={f.text}>
                  <span className="al-feat-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="al-left-img">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=700&q=80"
              alt="Students studying"
            />
            <div className="al-left-img-overlay" />
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="al-panel al-right">
        <div className="al-form-wrap">
          {/* Top link */}
          <p className="al-top-link">
            New here? <Link to="/register">Create an account →</Link>
          </p>

          <div className="al-form-head">
            <div className="al-form-icon">👋</div>
            <h1>Welcome back</h1>
            <p>Sign in to your Student Hub account</p>
          </div>

          {error && (
            <div className="al-error" role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="al-form" noValidate>
            <div className="al-field">
              <label htmlFor="login-email">Email address</label>
              <div className="al-input-wrap">
                <span className="al-input-icon">✉️</span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="al-field">
              <label htmlFor="login-password">Password</label>
              <div className="al-input-wrap">
                <span className="al-input-icon">🔒</span>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="al-pw-toggle"
                  onClick={() => setShowPw((p) => !p)}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="al-submit" disabled={loading}>
              {loading ? (
                <span className="al-spinner" />
              ) : (
                <>Sign In <span>→</span></>
              )}
            </button>
          </form>

          <div className="al-divider"><span>or continue with</span></div>

          <div className="al-social-row">
            <div className={`al-google-wrap${loading ? ' al-google-wrap--busy' : ''}`}>
              <GoogleLogin
                onSuccess={onGoogleSuccess}
                onError={() => setError('Google sign-in was cancelled or failed.')}
                useOneTap={false}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="100%"
                locale="en"
              />
            </div>
            <button type="button" className="al-social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
          </div>

          <p className="al-bottom-note">
            Don't have an account? <Link to="/register">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
