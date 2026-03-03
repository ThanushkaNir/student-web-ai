import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Inquiry.css';

const API = 'http://localhost:8080/api';
const QUICK_PROMPTS = [
  'How do I register for exams?',
  'What is GPA and how is it calculated?',
  'How should I write a formal email to a lecturer?',
  'What are the attendance rules?',
];

function Inquiry() {
  const userId = localStorage.getItem('userId');
  const [question, setQuestion] = useState('');
  const [chatResult, setChatResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSent, setTicketSent] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setChatResult(null);
    setTicketSent(false);
    setShowSuggestions(false);
    try {
      const res = await axios.post(`${API}/inquiry/ask`, {
        q: question.trim(),
        userId: Number(userId),
        autoTicket: true,
      });
      setChatResult(res.data || null);
    } catch (e) {
      console.error(e);
      setChatResult({
        answered: false,
        answers: [],
        ticketCreated: false,
        message: 'Could not reach chatbot service.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!userId || !ticketSubject.trim() || !ticketDesc.trim()) return;
    try {
      await axios.post(`${API}/tickets`, {
        userId: Number(userId),
        subject: ticketSubject.trim(),
        description: ticketDesc.trim(),
        status: 'OPEN',
      });
      setTicketSent(true);
      setShowTicketForm(false);
      setTicketSubject('');
      setTicketDesc('');
    } catch (e) {
      alert('Failed to create ticket');
    }
  };

  useEffect(() => {
    const query = question.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/knowledge/suggestions`, { params: { q: query } });
        const list = Array.isArray(res.data) ? res.data : [];
        setSuggestions(list);
        setShowSuggestions(inputFocused && list.length > 0);
      } catch (e) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [question, inputFocused]);

  if (!userId) {
    return (
      <div className="inquiry-page">
        <div className="container"><p className="muted">Please log in to ask questions.</p><Link to="/login">Login</Link></div>
      </div>
    );
  }

  return (
    <div className="inquiry-page">
      <div className="container">
        <header className="page-header">
          <div className="inquiry-hero">
            <div className="inquiry-hero-text">
              <div className="hero-badge">AI Student Assistant</div>
              <h1>Ask the Chatbot</h1>
              <p>Get instant answers from the university knowledge base with AI support for general student questions.</p>
            </div>
            <div className="inquiry-hero-art" aria-hidden="true">
              <img
                className="inquiry-hero-image"
                src={`${process.env.PUBLIC_URL}/chatbot-assistant.svg`}
                alt="University AI assistant illustration"
                loading="lazy"
              />
            </div>
          </div>
        </header>

        <section className="card assistant-shell">
          <div className="assistant-shell-header">
            <div>
              <h2>Chat with your university assistant</h2>
              <p>Ask about exams, registration, support, academic writing, study tips, and campus policies.</p>
            </div>
            <div className="assistant-status">
              <span className="status-dot" />
              Online
            </div>
          </div>

          <form onSubmit={handleAsk} className="ask-form">
            <div className="ask-input-wrap">
              <input
                type="text"
                placeholder="e.g. How do I register? What are the exam rules?"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setInputFocused(true);
                  setShowSuggestions(suggestions.length > 0);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setInputFocused(false);
                    setShowSuggestions(false);
                  }, 150);
                }}
                className="ask-input"
                disabled={loading}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="inquiry-suggestions">
                  {suggestions.map((s, index) => (
                    <li key={`${s}-${index}`}>
                      <button
                        type="button"
                        className="inquiry-suggestion-btn"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setQuestion(s);
                          setShowSuggestions(false);
                        }}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="btn btn-primary ask-submit-btn" disabled={loading}>
              {loading ? 'Thinking...' : 'Ask Chatbot'}
            </button>
          </form>

          <div className="quick-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="quick-prompt-chip"
                onClick={() => setQuestion(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        {chatResult !== null && (
          <section className="results-section">
            {chatResult.answered ? (
              <>
                <h2 className="results-title">Latest Response</h2>
                {(chatResult.answers || []).length > 0 ? (
                  <>
                    <div className="results-list">
                      {(chatResult.answers || []).map((k) => (
                        <article key={k.id} className="card result-card">
                          <div className="result-card-top">
                            <span className="result-category">{k.category || 'General'}</span>
                            <span className="result-source-badge">Knowledge Base</span>
                          </div>
                          <h3>{k.title}</h3>
                          <div className="result-content">{k.content}</div>
                        </article>
                      ))}
                    </div>
                    <p className="muted">Still need help? <button type="button" className="link-btn" onClick={() => setShowTicketForm(true)}>Create a support ticket</button></p>
                  </>
                ) : (
                  <article className="card result-card ai-result-card">
                    <div className="result-card-top">
                      <span className="result-category">AI Response</span>
                      <span className="result-source-badge">
                        {chatResult.generalAiAnswer ? (chatResult.answerSource || 'AI') : 'AI'}
                      </span>
                    </div>
                    <h3>Answer</h3>
                    <div className="result-content">{chatResult.aiAnswer || chatResult.message}</div>
                    {chatResult.generalAiAnswer && (
                      <p className="answer-note">
                        Note: This answer is generated by AI and may not reflect your university&apos;s exact policies. Please verify with official sources.
                      </p>
                    )}
                  </article>
                )}
              </>
            ) : (
              <div className="card no-results">
                <h3>Chatbot couldn't find an answer</h3>
                <p>{chatResult.message || 'No matching training data found.'}</p>
                {chatResult.ticketCreated ? (
                  <p className="success-msg">Support ticket auto-created (ID: #{chatResult.ticketId}). Admin will respond soon.</p>
                ) : (!showTicketForm && !ticketSent && (
                  <button type="button" className="btn btn-primary" onClick={() => setShowTicketForm(true)}>
                    Create support ticket
                  </button>
                ))}
                {ticketSent && <p className="success-msg">Ticket created. We&apos;ll get back to you.</p>}
              </div>
            )}
          </section>
        )}

        {showTicketForm && !ticketSent && (
          <form onSubmit={handleCreateTicket} className="card ticket-form">
            <h3>Create support ticket</h3>
            <p className="muted">Send your issue to the support team when the chatbot answer is not enough.</p>
            <input placeholder="Subject" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} required />
            <textarea placeholder="Describe your issue or question…" value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} rows={5} required />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Submit ticket</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowTicketForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="page-links">
          <Link to="/knowledge-base" className="btn btn-ghost">Knowledge Base</Link>
          <Link to="/tickets" className="btn btn-ghost">My Tickets</Link>
          <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default Inquiry;
