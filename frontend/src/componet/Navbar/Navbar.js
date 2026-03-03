import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Navbar.css';

function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem('userProfilePhoto') || '');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [scrolled, setScrolled] = useState(false);
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const rawRole = localStorage.getItem('userRole') || '';
  const userRole = rawRole.replace(/^ROLE_/i, '').trim().toUpperCase();
  const roleClass = userRole ? userRole.toLowerCase() : 'guest';
  const roleLabel = userRole || 'GUEST';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!userId) { setProfilePhoto(''); return; }
    const storedPhoto = localStorage.getItem('userProfilePhoto') || '';
    if (storedPhoto) { setProfilePhoto(storedPhoto); return; }
    axios.get(`http://localhost:8080/user/${userId}`)
      .then(({ data }) => {
        const photo = data?.profilePhoto || '';
        setProfilePhoto(photo);
        if (photo) localStorage.setItem('userProfilePhoto', photo);
      })
      .catch(() => setProfilePhoto(''));
  }, [userId, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userProfilePhoto');
    setProfilePhoto('');
    setSidebarOpen(false);
    navigate('/');
  };

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));

  const navLinks = [
    { to: '/', label: 'Home', icon: '🏠', roles: ['STUDENT', 'ALUMNI', 'ADMIN'] },
    { to: '/about', label: 'About', icon: 'ℹ️', roles: ['STUDENT', 'ALUMNI', 'ADMIN'] },
    { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['STUDENT', 'ALUMNI', 'ADMIN'] },
    { to: '/study-library', label: 'Study Library', icon: '📚', roles: ['STUDENT', 'ADMIN'] },
    { to: '/search', label: 'Search', icon: '🔎', roles: ['STUDENT'] },
    { to: '/assignments', label: 'Assignments', icon: '📝', roles: ['STUDENT'] },
    { to: '/inquiry', label: 'Ask Bot', icon: '💬', roles: ['STUDENT', 'ALUMNI', 'ADMIN'] },
    { to: '/tickets', label: 'Support', icon: '🎫', roles: ['STUDENT', 'ALUMNI', 'ADMIN'] },
    { to: '/chatbot-training', label: 'Train Bot', icon: '🤖', roles: ['ADMIN'] },
    { to: '/jobs', label: 'Jobs', icon: '💼', roles: ['STUDENT', 'ALUMNI', 'ADMIN'] },
    { to: '/blog', label: 'Blog', icon: '✍️', roles: ['STUDENT', 'ALUMNI', 'ADMIN'] },
    { to: '/download-center', label: 'Download Center', icon: '⬇️', roles: ['STUDENT', 'ALUMNI', 'ADMIN'] },
  ];

  const filteredLinks = navLinks.filter((l) => l.roles.includes(userRole));

  // When logged in: show first 4 links in top nav + rest in sidebar
  // When guest: show Home + About only
  const topLinks = userId ? filteredLinks.slice(0, 4) : [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
  ];

  return (
    <>
      <header className={`nb ${scrolled ? 'nb-scrolled' : ''} nb-${roleClass}`}>
        <div className="nb-inner">

          {/* Logo */}
          <Link to="/" className="nb-logo">
            <span className="nb-logo-icon">
              {userRole === 'STUDENT' ? '📚' : userRole === 'ADMIN' ? '⚙️' : userRole === 'ALUMNI' ? '🌟' : '◆'}
            </span>
            <span className="nb-logo-text">
              {userRole === 'STUDENT' ? 'Student Hub' : userRole === 'ADMIN' ? 'Admin Portal' : userRole === 'ALUMNI' ? 'Alumni Network' : 'Student Hub'}
            </span>
          </Link>

          {/* Center Nav Links */}
          <nav className="nb-links" aria-label="Main navigation">
            {topLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nb-link ${location.pathname === link.to ? 'nb-link-active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="nb-right">
            {/* Theme Toggle */}
            <button
              type="button"
              className="nb-theme-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>

            {!userId ? (
              <>
                <Link to="/login" className="nb-btn nb-btn-ghost">Login</Link>
                <Link to="/register" className="nb-btn nb-btn-primary">Get Started</Link>
              </>
            ) : (
              <>
                <Link to="/userProfile" className="nb-user">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="nb-avatar nb-avatar-img" />
                  ) : (
                    <span className="nb-avatar nb-avatar-text">
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                  <span className="nb-username">{userName || 'Profile'}</span>
                </Link>
                <button type="button" className="nb-btn nb-btn-ghost" onClick={handleLogout}>
                  Logout
                </button>
                <button
                  type="button"
                  className="nb-menu-btn"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label="Open menu"
                  aria-expanded={sidebarOpen}
                >
                  <span className="nb-hamburger" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      {userId && (
        <>
          <div
            className={`nb-overlay ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
          <aside className={`nb-sidebar nb-sidebar-${roleClass} ${sidebarOpen ? 'open' : ''}`}>
            <div className="nb-sidebar-head">
              <div className="nb-sidebar-role">
                <span className="nb-sidebar-role-icon">
                  {userRole === 'STUDENT' ? '🎓' : userRole === 'ADMIN' ? '👑' : '💼'}
                </span>
                <span className="nb-sidebar-role-label">{roleLabel}</span>
              </div>
              <button
                type="button"
                className="nb-sidebar-close"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {userName && (
              <div className="nb-sidebar-user">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={userName} className="nb-sidebar-avatar-img" />
                ) : (
                  <div className="nb-sidebar-avatar-text">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <strong>{userName}</strong>
                  <span>{roleLabel}</span>
                </div>
              </div>
            )}

            <nav className="nb-sidebar-nav">
              {filteredLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nb-sidebar-link ${location.pathname === link.to ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nb-sl-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            <div className="nb-sidebar-footer">
              <button type="button" className="nb-sidebar-logout" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

export default Navbar;
