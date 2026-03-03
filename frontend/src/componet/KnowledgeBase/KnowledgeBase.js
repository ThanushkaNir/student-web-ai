import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './KnowledgeBase.css';

const API = 'http://localhost:8080/api';

function KnowledgeBase() {
  const TITLE_MIN = 4;
  const TITLE_MAX = 120;
  const CATEGORY_MAX = 60;
  const CONTENT_MIN = 20;
  const CONTENT_MAX = 5000;

  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole');
  const isAdmin = role === 'ADMIN';
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', category: '', content: '' });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formErrors, setFormErrors] = useState({ title: '', category: '', content: '', submit: '' });
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState(null);
  const [chatSuggestions, setChatSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [chatInputFocused, setChatInputFocused] = useState(false);
  const defaultChatSuggestions = [
    'How do I register for exams?',
    'What are the university attendance rules?',
    'How can I contact student support?',
    'What is the assignment submission process?',
  ];

  const validateForm = (values) => {
    const errors = { title: '', category: '', content: '', submit: '' };
    const title = values.title.trim();
    const category = values.category.trim();
    const content = values.content.trim();

    if (!title) {
      errors.title = 'Title is required.';
    } else if (title.length < TITLE_MIN) {
      errors.title = `Title must be at least ${TITLE_MIN} characters.`;
    } else if (title.length > TITLE_MAX) {
      errors.title = `Title must be under ${TITLE_MAX} characters.`;
    }

    if (category.length > CATEGORY_MAX) {
      errors.category = `Category must be under ${CATEGORY_MAX} characters.`;
    }

    if (!content) {
      errors.content = 'Content is required.';
    } else if (content.length < CONTENT_MIN) {
      errors.content = `Content must be at least ${CONTENT_MIN} characters.`;
    } else if (content.length > CONTENT_MAX) {
      errors.content = `Content must be under ${CONTENT_MAX} characters.`;
    }

    return errors;
  };

  const updateFormField = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    const errors = validateForm(nextForm);
    setFormErrors((prev) => ({ ...prev, ...errors, submit: '' }));
  };

  const loadEntries = async () => {
    try {
      const params = categoryFilter ? { category: categoryFilter } : {};
      const res = await axios.get(`${API}/knowledge`, { params });
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [categoryFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm(form);
    if (errors.title || errors.category || errors.content) {
      setFormErrors(errors);
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        content: form.content.trim(),
        createdBy: Number(userId),
      };

      if (editingId) {
        await axios.put(`${API}/knowledge/${editingId}`, payload);
      } else {
        await axios.post(`${API}/knowledge`, payload);
      }
      setForm({ title: '', category: '', content: '' });
      setFormErrors({ title: '', category: '', content: '', submit: '' });
      setShowForm(false);
      setEditingId(null);
      loadEntries();
    } catch (e) {
      setFormErrors((prev) => ({ ...prev, submit: 'Failed to save entry. Please try again.' }));
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await axios.delete(`${API}/knowledge/${id}`);
      loadEntries();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const startEdit = (k) => {
    setEditingId(k.id);
    setForm({ title: k.title, category: k.category || '', content: k.content || '' });
    setFormErrors({ title: '', category: '', content: '', submit: '' });
    setShowForm(true);
  };

  const askKnowledgeChatbot = async (e) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    setChatLoading(true);
    setChatResponse(null);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    try {
      const res = await axios.post(`${API}/knowledge/chat`, { message: chatQuestion.trim() });
      setChatResponse(res.data || null);
    } catch (error) {
      console.error(error);
      setChatResponse({
        answer: 'Could not connect to AI chatbot service.',
        confidence: 0,
        sources: [],
        fallback: true,
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatInputChange = (value) => {
    setChatQuestion(value);
    setShowSuggestions(true);
    setActiveSuggestionIndex(-1);
  };

  useEffect(() => {
    const rawQuery = chatQuestion.trim();
    const query = rawQuery.toLowerCase();

    const getLocalSuggestions = () => {
      if (!query) {
        const titles = entries
          .map((entry) => entry.title)
          .filter((title) => title && title.trim().length > 0)
          .filter((text, index, arr) => arr.indexOf(text) === index)
          .slice(0, 6);
        if (titles.length > 0) {
          return titles;
        }
        return defaultChatSuggestions;
      }

      return entries
        .filter((entry) => {
          const title = (entry.title || '').toLowerCase();
          const category = (entry.category || '').toLowerCase();
          const content = (entry.content || '').toLowerCase();
          return title.includes(query) || category.includes(query) || content.includes(query);
        })
        .flatMap((entry) => {
          const list = [];
          if (entry.title) list.push(entry.title);
          if (entry.title) list.push(`What is ${entry.title}?`);
          if (entry.category) list.push(`Explain ${entry.category} rules`);
          return list;
        })
        .filter((text) => text && text.trim().length > 0)
        .filter((text, index, arr) => arr.indexOf(text) === index)
      .slice(0, 6);
    };

    const localSuggestions = getLocalSuggestions();
    const fallbackSuggestions = localSuggestions.length > 0 ? localSuggestions : defaultChatSuggestions;
    setChatSuggestions(fallbackSuggestions);
    setShowSuggestions(chatInputFocused && fallbackSuggestions.length > 0);
    setActiveSuggestionIndex(-1);

    if (!rawQuery) {
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/knowledge/suggestions`, {
          params: { q: rawQuery },
        });
        const remoteSuggestions = Array.isArray(res.data) ? res.data : [];
        const merged = [...fallbackSuggestions, ...remoteSuggestions]
          .filter((text) => text && text.trim().length > 0)
          .filter((text, index, arr) => arr.indexOf(text) === index)
          .slice(0, 6);
        setChatSuggestions(merged);
        setShowSuggestions(chatInputFocused && merged.length > 0);
      } catch (error) {
        // keep local suggestions only
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [chatQuestion, chatInputFocused, entries]);

  const handleChatInputKeyDown = (e) => {
    if (!showSuggestions || chatSuggestions.length === 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => {
        if (prev < chatSuggestions.length - 1) return prev + 1;
        return 0;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => {
        if (prev > 0) return prev - 1;
        return chatSuggestions.length - 1;
      });
      return;
    }

    if (e.key === 'Enter' && activeSuggestionIndex >= 0 && activeSuggestionIndex < chatSuggestions.length) {
      e.preventDefault();
      setChatQuestion(chatSuggestions[activeSuggestionIndex]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const categories = [...new Set(entries.map((e) => e.category).filter(Boolean))].sort();

  if (!userId) {
    return (
      <div className="knowledge-base-page">
        <div className="container"><p className="muted">Please log in.</p></div>
      </div>
    );
  }

  return (
    <div className="knowledge-base-page">
      <div className="container">
        <header className="page-header">
          <h1>Knowledge Base</h1>
          <p>University rules, regulations, and registration info. {isAdmin && 'Admins can add and edit entries.'}</p>
        </header>

        <section className="card kb-chatbot-card">
          <h3>AI Knowledge Chatbot</h3>
          <p className="muted">Ask anything about registration, university rules, exams, and support processes.</p>
          <form onSubmit={askKnowledgeChatbot} className="kb-chatbot-form">
            <div className="kb-chat-input-wrap">
              <input
                type="text"
                placeholder="Ask a question..."
                value={chatQuestion}
                onChange={(e) => handleChatInputChange(e.target.value)}
                onKeyDown={handleChatInputKeyDown}
                onFocus={() => {
                  setChatInputFocused(true);
                  setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => {
                  setChatInputFocused(false);
                  setShowSuggestions(false);
                  setActiveSuggestionIndex(-1);
                }, 150)}
                disabled={chatLoading}
              />
              {showSuggestions && (
                <ul className="kb-suggestions">
                  {chatSuggestions.map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`}>
                      <button
                        type="button"
                        className={`kb-suggestion-btn ${activeSuggestionIndex === index ? 'active' : ''}`}
                        onClick={() => {
                          setChatQuestion(suggestion);
                          setShowSuggestions(false);
                          setActiveSuggestionIndex(-1);
                        }}
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={chatLoading}>
              {chatLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </form>

          {chatResponse && (
            <div className="kb-chatbot-response">
              <p className="kb-chatbot-answer">{chatResponse.answer}</p>
              <p className="kb-chatbot-meta">
                Confidence: {Math.round((Number(chatResponse.confidence || 0)) * 100)}%
              </p>
              {Array.isArray(chatResponse.sources) && chatResponse.sources.length > 0 && (
                <ul className="kb-chatbot-sources">
                  {chatResponse.sources.map((source) => (
                    <li key={source.id}>
                      {source.title} {source.category ? `(${source.category})` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {isAdmin && (
          <>
            <div className="kb-actions">
              <button type="button" className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', category: '', content: '' }); setFormErrors({ title: '', category: '', content: '', submit: '' }); }}>
                + Add Entry
              </button>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="card kb-form">
                <h3>{editingId ? 'Edit' : 'New'} Entry</h3>
                <input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                  maxLength={TITLE_MAX}
                  aria-invalid={Boolean(formErrors.title)}
                  aria-describedby={formErrors.title ? 'kb-title-error' : undefined}
                  required
                />
                {formErrors.title && <p id="kb-title-error" className="kb-error">{formErrors.title}</p>}

                <input
                  placeholder="Category (e.g. Registration, Rules)"
                  value={form.category}
                  onChange={(e) => updateFormField('category', e.target.value)}
                  maxLength={CATEGORY_MAX}
                  aria-invalid={Boolean(formErrors.category)}
                  aria-describedby={formErrors.category ? 'kb-category-error' : undefined}
                />
                {formErrors.category && <p id="kb-category-error" className="kb-error">{formErrors.category}</p>}

                <textarea
                  placeholder="Content (rules, steps, etc.)"
                  value={form.content}
                  onChange={(e) => updateFormField('content', e.target.value)}
                  rows={8}
                  maxLength={CONTENT_MAX}
                  aria-invalid={Boolean(formErrors.content)}
                  aria-describedby={formErrors.content ? 'kb-content-error' : undefined}
                  required
                />
                {formErrors.content && <p id="kb-content-error" className="kb-error">{formErrors.content}</p>}
                {formErrors.submit && <p className="kb-error">{formErrors.submit}</p>}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormErrors({ title: '', category: '', content: '', submit: '' });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {!isAdmin && (
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="kb-list">
            {entries.length === 0 ? (
              <p className="muted">No entries yet. {isAdmin && 'Add an entry above.'}</p>
            ) : (
              entries.map((k) => (
                <article key={k.id} className="card kb-card">
                  <div className="kb-card-header">
                    <span className="kb-category">{k.category || 'General'}</span>
                    <h3>{k.title}</h3>
                  </div>
                  <div className="kb-content">{k.content}</div>
                  {isAdmin && (
                    <div className="kb-card-actions">
                      <button type="button" className="btn-sm btn-primary" onClick={() => startEdit(k)}>Edit</button>
                      <button type="button" className="btn-sm btn-danger" onClick={() => deleteEntry(k.id)}>Delete</button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        )}

        <div className="page-links">
          <Link to="/inquiry" className="btn btn-primary">Ask a Question</Link>
          <Link to="/tickets" className="btn btn-ghost">My Support Tickets</Link>
          <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeBase;
