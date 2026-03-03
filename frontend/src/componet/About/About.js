import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container about-hero-inner">
          <p className="about-kicker">About Student Hub</p>
          <h1>One Platform for Academic Success and Career Growth</h1>
          <p>
            Student Hub is built to help students, alumni, and administrators manage academic workflows in one
            professional system. From study materials to deadlines and career readiness, each module is connected for
            a smoother experience.
          </p>
        </div>
      </section>

      <section className="about-section">
        <div className="container about-grid">
          <article className="about-card">
            <h2>Our Mission</h2>
            <p>
              Simplify university life through intelligent tools that improve learning performance, time management,
              and communication.
            </p>
          </article>

          <article className="about-card">
            <h2>What We Provide</h2>
            <ul>
              <li>AI-powered quiz and flashcard generation from notes.</li>
              <li>Assignment tracker with reminders and calendar mapping.</li>
              <li>Inquiry assistant with support ticket escalation.</li>
              <li>Career tools including jobs, resume matching, and guidance.</li>
            </ul>
          </article>

          <article className="about-card">
            <h2>Who Uses It</h2>
            <ul>
              <li><strong>Students:</strong> Learn faster and stay organized.</li>
              <li><strong>Alumni:</strong> Share opportunities and mentor careers.</li>
              <li><strong>Admins:</strong> Manage knowledge and platform operations.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="about-cta">
        <div className="container about-cta-inner">
          <h2>Explore the Platform</h2>
          <p>Go to the home page or sign in to access your personalized dashboard.</p>
          <div className="about-actions">
            <Link to="/" className="about-btn about-btn-secondary">Home</Link>
            <Link to="/login" className="about-btn about-btn-primary">Sign In</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
