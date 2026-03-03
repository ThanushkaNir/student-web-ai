import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import NotificationCenter from '../NotificationCenter/NotificationCenter';
import AdminAnalyticsPanel from '../AdminAnalyticsPanel/AdminAnalyticsPanel';
import ActivityDashboard from '../ActivityDashboard/ActivityDashboard';

function Dashboard() {
  const rawRole = localStorage.getItem('userRole') || 'STUDENT';
  const role = rawRole.replace(/^ROLE_/i, '').trim().toUpperCase();
  const name = localStorage.getItem('userName') || 'User';

  const roleTitle = {
    STUDENT: 'Student',
    ALUMNI: 'Alumni Workspace',
    ADMIN: 'Admin Portal',
  }[role] || role;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const studentLearningCards = [
    { to: '/study-library', icon: '📚', title: 'Study Library', desc: 'Upload notes, PDFs, or DOCs and generate smart MCQs.' },
    { to: '/quiz', icon: '✏️', title: 'Take Quiz', desc: 'Test yourself with timed quizzes generated from your materials.' },
    { to: '/quiz-history', icon: '📊', title: 'Score History', desc: 'Track your recent scores and visualize performance trends.' },
    { to: '/assignments', icon: '📅', title: 'Assignment Tracker', desc: 'Manage your deadlines and completion statuses efficiently.' },
    { to: '/study-calendar', icon: '📆', title: 'Study Calendar', desc: 'Plan your study sessions and view assignment due dates.' },
  ];

  const studentSupportCards = [
    { to: '/inquiry', icon: '💬', title: 'Ask AI Chatbot', desc: 'Instant answers for university rules, registration, and more.' },
    { to: '/tickets', icon: '🎫', title: 'Support Tickets', desc: 'Create a ticket if the AI cannot instantly resolve your issue.' },
  ];

  const careerCards = [
    { to: '/jobs', icon: '💼', title: 'Jobs & Internships', desc: 'Explore exclusive opportunities shared by alumni.' },
    { to: '/resume', icon: '📄', title: 'Resume Match', desc: 'Compare your CV against top roles and improve your score.' },
    { to: '/career', icon: '🎯', title: 'Career Suggestor', desc: 'Get AI-driven career path suggestions perfectly aligned with your skills.' },
    { to: '/blog', icon: '📝', title: 'Write Blog', desc: 'Share your insights, projects, and personal growth experiences.' },
    { to: '/cover-letter', icon: '✉️', title: 'Cover Letter Maker', desc: 'Generate highly tailored opening letters for job applications.' },
  ];

  const alumniCareerCards = careerCards.filter((card) => card.to !== '/career');

  const alumniCards = [
    { to: '/userProfile', icon: '👤', title: 'My Profile', desc: 'View and edit your personal account details.' },
    ...alumniCareerCards,
    { to: '/inquiry', icon: '💬', title: 'Inquiry Assistant', desc: 'Access guidance and policy answers.' },
    { to: '/tickets', icon: '🎫', title: 'Support Tickets', desc: 'View and manage student support requests.' },
  ];

  const adminCards = [
    { to: '/userProfile', icon: '👤', title: 'My Profile', desc: 'Update account settings and profile details.' },
    { to: '/study-library', icon: '📚', title: 'Study Library Central', desc: 'Manage global subjects and shared academic resources.' },
    { to: '/assignments', icon: '📅', title: 'Assignment Logs', desc: 'Review global assignment tracking and workflows.' },
    { to: '/jobs', icon: '💼', title: 'Job Board Control', desc: 'Approve and oversee job postings and opportunities.' },
    { to: '/knowledge-base', icon: '📋', title: 'Knowledge Base Manager', desc: 'Add or edit official university rules and documentation.' },
    { to: '/chatbot-training', icon: '🤖', title: 'Train AI Bot', desc: 'Improve assistant responses by feeding new policy data.' },
  ];

  const renderCard = (card, index) => (
    <Link 
      to={card.to} 
      className="db-card" 
      key={`${card.to}-${index}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="db-card-icon-wrap">
        <span className="db-card-icon">{card.icon}</span>
      </div>
      <div className="db-card-content">
        <h3>{card.title}</h3>
        <p>{card.desc}</p>
      </div>
      <span className="db-card-arrow">→</span>
    </Link>
  );

    const profilePhoto = localStorage.getItem('userProfilePhoto') || '';

  return (
    <div className="db-page">
      {/* ── HERO BANNER ── */}
      <section className="db-hero">
        <div className="db-hero-bg">
          {/* Decorative Orbs */}
          <div className="db-hero-orb orb-1" />
          <div className="db-hero-orb orb-2" />
          {/* Creative Background Image */}
          <div className="db-hero-bg-image">
            <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2670&auto=format&fit=crop" alt="Workspace Background" />
          </div>
        </div>
        <div className="db-container db-hero-inner">
          <div className="db-hero-content">
            <span className="db-role-badge">
              {role === 'STUDENT' ? '🎓' : role === 'ADMIN' ? '⚙️' : '🌟'} {roleTitle}
            </span>
            <h1>{greeting}, <span className="db-hero-name">{name.split(' ')[0]}</span>.</h1>
            <p>Welcome to your personal workspace. Here’s an overview of your activity and quick links to get you started today.</p>
            <div className="db-hero-actions">
              <Link to="/userProfile" className="db-btn db-btn-ghost">Manage Profile</Link>
              {role === 'STUDENT' && (
                <Link to="/study-library" className="db-btn db-btn-primary">
                  Open Study Library <span>→</span>
                </Link>
              )}
            </div>
          </div>

          <div className="db-hero-profile-wrap">
            <div className="db-hero-profile">
              {profilePhoto ? (
                <img src={profilePhoto} alt={name} className="db-profile-img" />
              ) : (
                <div className="db-profile-fallback">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Decorative orbit ring */}
            <div className="db-hero-orbit">
              <div className="db-hero-planet"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="db-main db-container">

        {/* Top Widgets Level */}
        <div className="db-widgets-row">
          <div className="db-widget-main">
            {role === 'ALUMNI' ? (
              <section className="alumni-activity-dashboard">
                <div className="activity-header">
                  <h2>Your University Impact</h2>
                  <span className="activity-badge">Alumni Metrics</span>
                </div>
                <p className="activity-subtitle">Track your contributions to the student community and opportunities you've shared.</p>
                <div className="activity-grid">
                  <article className="activity-card">
                    <h3>Jobs & Internships Posted</h3>
                    <div className="metric-display">0</div>
                    <p className="metric-desc">Help students with career opportunities</p>
                    <Link to="/jobs" className="activity-link">Post an opportunity →</Link>
                  </article>
                  <article className="activity-card">
                    <h3>Mentees Guided</h3>
                    <div className="metric-display">0</div>
                    <p className="metric-desc">Students you've supported</p>
                    <Link to="/userProfile" className="activity-link">Manage mentees →</Link>
                  </article>
                  <article className="activity-card">
                    <h3>Blog Posts Published</h3>
                    <div className="metric-display">0</div>
                    <p className="metric-desc">Share your insights and experiences</p>
                    <Link to="/blog" className="activity-link">Write new post →</Link>
                  </article>
                  <article className="activity-card">
                    <h3>Profile Views This Month</h3>
                    <div className="metric-display">8</div>
                    <p className="metric-desc">Students interested in your profile</p>
                    <Link to="/userProfile" className="activity-link">View analytics →</Link>
                  </article>
                </div>
              </section>
            ) : (
              <ActivityDashboard />
            )}
          </div>
          <div className="db-widget-side">
            {role === 'ALUMNI' ? (
              <section className="alumni-notification-center">
                <div className="notification-header">
                  <h2>Alumni Updates</h2>
                  <span className="notification-badge">3 alerts</span>
                </div>
                <div className="notification-list">
                  <article className="notification-item notification-item-success">
                    <span className="notification-icon">🎓</span>
                    <div className="notification-content">
                      <h4>New Mentee Request</h4>
                      <p>Arjun Sharma (3rd Year) wants you as a mentor</p>
                      <small>2 hours ago</small>
                    </div>
                  </article>
                  <article className="notification-item notification-item-info">
                    <span className="notification-icon">💼</span>
                    <div className="notification-content">
                      <h4>Job Post Interaction</h4>
                      <p>5 students viewed your Data Science role</p>
                      <small>5 hours ago</small>
                    </div>
                  </article>
                  <article className="notification-item notification-item-warning">
                    <span className="notification-icon">📝</span>
                    <div className="notification-content">
                      <h4>Blog Comment</h4>
                      <p>Priya Reddy commented on your career tips post</p>
                      <small>1 day ago</small>
                    </div>
                  </article>
                  <article className="notification-item notification-item-info">
                    <span className="notification-icon">🌐</span>
                    <div className="notification-content">
                      <h4>Network Activity</h4>
                      <p>15 new alumni joined the network this week</p>
                      <small>3 days ago</small>
                    </div>
                  </article>
                </div>
                <Link to="/tickets" className="view-all-link">View all updates →</Link>
              </section>
            ) : (
              <NotificationCenter />
            )}
          </div>
        </div>

        {/* Admin Analytics Panel */}
        {role === 'ADMIN' && (
          <div className="db-section">
            <div className="db-section-header">
              <h2>Analytics Overview</h2>
              <p>Platform metrics and real-time usage data.</p>
            </div>
            <AdminAnalyticsPanel />
          </div>
        )}

        {/* ── STUDENT SECTIONS ── */}
        {role === 'STUDENT' && (
          <>
            <section className="db-section">
              <div className="db-section-header">
                <h2>📚 Learning & Planning</h2>
                <p>Everything you need for study workflow and exam preparation.</p>
              </div>
              <div className="db-grid">
                {studentLearningCards.map(renderCard)}
              </div>
            </section>

            <section className="db-section">
              <div className="db-section-header">
                <h2>🎯 Career Development</h2>
                <p>Discover opportunities and prepare professional applications.</p>
              </div>
              <div className="db-grid">
                {careerCards.map(renderCard)}
              </div>
            </section>

            <section className="db-section">
              <div className="db-section-header">
                <h2>💬 Support & Info</h2>
                <p>Ask questions, open tickets, and review official guidance.</p>
              </div>
              <div className="db-grid">
                {studentSupportCards.map(renderCard)}
              </div>
            </section>
          </>
        )}

        {/* ── ALUMNI SECTIONS ── */}
        {role === 'ALUMNI' && (
          <section className="db-section">
            <div className="db-section-header">
              <h2>🌟 Alumni Tools</h2>
              <p>Share opportunities, post jobs, and support student growth.</p>
            </div>
            <div className="db-grid">
              {alumniCards.map(renderCard)}
            </div>
          </section>
        )}

        {/* ── ADMIN SECTIONS ── */}
        {role === 'ADMIN' && (
          <section className="db-section">
            <div className="db-section-header">
              <h2>⚙️ Platform Management</h2>
              <p>Manage platform content, users, and academic tools.</p>
            </div>
            <div className="db-grid">
              {adminCards.map(renderCard)}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

export default Dashboard;
