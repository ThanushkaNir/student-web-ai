import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const FEATURES = [
  {
    icon: '🧠',
    title: 'Learning Intelligence',
    desc: 'Convert notes into MCQs & flashcards instantly. AI-powered active recall for faster revision.',
    img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=480&q=80',
  },
  {
    icon: '📅',
    title: 'Deadline Visibility',
    desc: 'Track pending & completed assignments by date, with smart reminders and calendar markers.',
    img: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=480&q=80',
  },
  {
    icon: '🎓',
    title: 'Career Readiness',
    desc: 'Resume scoring, internship boards, alumni-posted jobs, and AI-generated cover letters.',
    img: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=480&q=80',
  },
  {
    icon: '🛠️',
    title: 'Smart Support',
    desc: 'Instant answers from the AI chatbot. Escalate complex queries directly to support tickets.',
    img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=480&q=80',
  },
];

const ROLES = [
  {
    role: 'Students',
    emoji: '🎒',
    color: '#6366f1',
    points: ['Study library & quizzes', 'Assignment planner & calendar', 'AI inquiry assistant', 'Career tools & resume'],
    img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
  },
  {
    role: 'Alumni',
    emoji: '🤝',
    color: '#f59e0b',
    points: ['Post jobs & internships', 'Write mentorship blogs', 'Support student growth', 'Stay connected'],
    img: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=800&q=80',
  },
  {
    role: 'Administrators',
    emoji: '⚙️',
    color: '#10b981',
    points: ['Manage subjects & content', 'Handle support tickets', 'Knowledge base control', 'Analytics & reports'],
    img: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&q=80',
  },
];

const STATS = [
  { value: '10K+', label: 'Active Students' },
  { value: '95%', label: 'Satisfaction Rate' },
  { value: '500+', label: 'Study Resources' },
  { value: '24/7', label: 'AI Support' },
];

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

function AnimSection({ children, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} className={`anim-section ${inView ? 'anim-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

function Home() {
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div className="hp">

      {/* ── HERO ── */}
      <section className="hp-hero">
        <div className="hp-hero-bg" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1600&q=85"
            alt=""
            className="hp-hero-img"
          />
          <div className="hp-hero-overlay" />
        </div>
        <div className="hp-container hp-hero-content">
          <div className="hp-hero-text">
            <span className="hp-badge">🎓 Academic Operations Platform</span>
            <h1 className="hp-hero-h1">
              The <span className="hp-gradient-text">Smart Hub</span><br />
              for Modern Students
            </h1>
            <p className="hp-hero-lead">
              Student Hub unifies note intelligence, assignment scheduling,
              AI-powered inquiry handling, and career readiness — all in one
              professional platform.
            </p>
            <div className="hp-hero-actions">
              <Link to="/register" className="hp-btn hp-btn-primary">
                Get Started Free <span className="hp-btn-arrow">→</span>
              </Link>
              <Link to="/login" className="hp-btn hp-btn-ghost">
                Sign In
              </Link>
            </div>
          </div>

        </div>

        {/* Stats Bar */}
        <div className="hp-stats-bar">
          {STATS.map((s) => (
            <div key={s.label} className="hp-stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="hp-section">
        <div className="hp-container">
          <AnimSection>
            <div className="hp-section-head">
              <span className="hp-label">Platform Highlights</span>
              <h2>Built for Real Academic Work</h2>
              <p>Everything a modern student needs — from first lecture to first job offer.</p>
            </div>
          </AnimSection>
          <div className="hp-feature-grid">
            {FEATURES.map((f, i) => (
              <AnimSection key={f.title} className="hp-feature-card-wrap" style={{ animationDelay: `${i * 80}ms` }}>
                <article className="hp-feature-card">
                  <div className="hp-feature-img-wrap">
                    <img src={f.img} alt={f.title} className="hp-feature-img" />
                    <div className="hp-feature-img-overlay" />
                    <span className="hp-feature-icon">{f.icon}</span>
                  </div>
                  <div className="hp-feature-body">
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                </article>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="hp-section hp-roles-section">
        <div className="hp-container">
          <AnimSection>
            <div className="hp-section-head">
              <span className="hp-label">Role-Based Experience</span>
              <h2>Designed for Everyone on Campus</h2>
              <p>One platform, three powerful roles — each with a tailored experience.</p>
            </div>
          </AnimSection>
          <div className="hp-role-tabs">
            {ROLES.map((r, i) => (
              <button
                key={r.role}
                className={`hp-role-tab ${activeRole === i ? 'active' : ''}`}
                style={{ '--tab-color': r.color }}
                onClick={() => setActiveRole(i)}
              >
                {r.emoji} {r.role}
              </button>
            ))}
          </div>
          <AnimSection className="hp-role-panel">
            <div className="hp-role-img-col">
              <img
                src={ROLES[activeRole].img}
                alt={ROLES[activeRole].role}
                className="hp-role-img"
              />
            </div>
            <div className="hp-role-info-col">
              <span className="hp-role-emoji">{ROLES[activeRole].emoji}</span>
              <h3>{ROLES[activeRole].role}</h3>
              <ul className="hp-role-points">
                {ROLES[activeRole].points.map((p) => (
                  <li key={p}>
                    <span className="hp-checkmark">✓</span> {p}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="hp-btn hp-btn-primary">
                Join as {ROLES[activeRole].role.replace(/s$/, '')} →
              </Link>
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── ALUMNI BANNER ── */}
      <section className="hp-section hp-alumni-section">
        <div className="hp-container">
          <AnimSection>
            <div
              className="hp-alumni-card"
              style={{
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&q=80)',
              }}
            >
              <div className="hp-alumni-overlay" />
              <div className="hp-alumni-content">
                <span className="hp-badge hp-badge-amber">🔗 Alumni Network</span>
                <h2>Alumni Can Post Jobs &amp; Internships</h2>
                <p>
                  Share verified opportunities with the student community. Create job posts,
                  provide role details, and help students connect with real-world industry openings.
                </p>
                <div className="hp-alumni-actions">
                  <Link to="/jobs" className="hp-btn hp-btn-primary">
                    Open Jobs Portal →
                  </Link>
                  <Link to="/register" className="hp-btn hp-btn-ghost hp-btn-ghost-light">
                    Join as Alumni
                  </Link>
                </div>
              </div>
              <div className="hp-alumni-stats">
                <div className="hp-alumni-stat">
                  <strong>200+</strong>
                  <span>Jobs Posted</span>
                </div>
                <div className="hp-alumni-stat">
                  <strong>50+</strong>
                  <span>Partner Companies</span>
                </div>
                <div className="hp-alumni-stat">
                  <strong>1K+</strong>
                  <span>Alumni Members</span>
                </div>
              </div>
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="hp-section">
        <div className="hp-container">
          <AnimSection>
            <div className="hp-section-head">
              <span className="hp-label">How It Works</span>
              <h2>Up and Running in Minutes</h2>
            </div>
          </AnimSection>
          <div className="hp-steps">
            {[
              { num: '01', title: 'Create Account', desc: 'Register as a Student, Alumni, or wait for Admin access.', icon: '📝' },
              { num: '02', title: 'Set Up Profile', desc: 'Add your interests, subjects, and career goals.', icon: '👤' },
              { num: '03', title: 'Explore Features', desc: 'Access your tailored dashboard, tools, and resources.', icon: '🚀' },
              { num: '04', title: 'Grow Every Day', desc: 'Track progress, complete quizzes, apply for jobs.', icon: '📈' },
            ].map((step, i) => (
              <AnimSection key={step.num} className="hp-step" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="hp-step-num">{step.num}</div>
                <div className="hp-step-icon">{step.icon}</div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="hp-section hp-testimonials-section">
        <div className="hp-container">
          <AnimSection>
            <div className="hp-section-head hp-section-head-light">
              <span className="hp-label hp-label-light">What Students Say</span>
              <h2>Trusted by Students Everywhere</h2>
            </div>
          </AnimSection>
          <div className="hp-testi-grid">
            {[
              {
                name: 'Ashan Perera',
                role: 'Year 3 CS Student',
                avatar: 'https://picsum.photos/seed/person12/80/80',
                text: 'Student Hub completely changed how I study. The quiz generator saved me hours of manual flashcard creation!',
                stars: 5,
              },
              {
                name: 'Nimasha Silva',
                role: 'Alumni — Software Engineer',
                avatar: 'https://picsum.photos/seed/person45/80/80',
                text: 'I posted a job opening and had qualified student applicants within a day. The alumni network is incredibly active.',
                stars: 5,
              },
              {
                name: 'Kavindu Rajapaksa',
                role: 'Year 2 IT Student',
                avatar: 'https://picsum.photos/seed/person33/80/80',
                text: 'The assignment tracker and calendar keep me on top of every deadline. I haven\'t missed a submission since!',
                stars: 5,
              },
            ].map((t) => (
              <AnimSection key={t.name}>
                <article className="hp-testi-card">
                  <div className="hp-stars">{'★'.repeat(t.stars)}</div>
                  <p className="hp-testi-text">"{t.text}"</p>
                  <div className="hp-testi-author">
                    <img src={t.avatar} alt={t.name} className="hp-testi-avatar" />
                    <div>
                      <strong>{t.name}</strong>
                      <span>{t.role}</span>
                    </div>
                  </div>
                </article>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="hp-cta">
        <div className="hp-container">
          <AnimSection>
            <div className="hp-cta-box">
              <div className="hp-cta-img-wrap">
                <img
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80"
                  alt="Students collaborating"
                  className="hp-cta-img"
                />
              </div>
              <div className="hp-cta-copy">
                <h2>Start Your Academic Journey Today</h2>
                <p>
                  Join thousands of students who have moved from scattered tools to one professional
                  platform. Set up in minutes, succeed all semester.
                </p>
                <div className="hp-cta-actions">
                  <Link to="/register" className="hp-btn hp-btn-primary hp-btn-lg">
                    Create Free Account →
                  </Link>
                  <Link to="/login" className="hp-btn hp-btn-outline">
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </AnimSection>
        </div>
      </section>

    </div>
  );
}

export default Home;
