import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ChatbotTraining.css';

const API = 'http://localhost:8080/api';

function ChatbotTraining() {
  const TITLE_MIN = 6;
  const TITLE_MAX = 120;
  const CATEGORY_MAX = 40;
  const CONTENT_MIN = 20;
  const CONTENT_MAX = 4000;

  const role = localStorage.getItem('userRole');
  const isAdmin = role === 'ADMIN';
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [errors, setErrors] = useState({ title: '', category: '', content: '', submit: '' });

  const validate = (values) => {
    const nextErrors = { title: '', category: '', content: '', submit: '' };
    const nextTitle = values.title.trim();
    const nextCategory = values.category.trim();
    const nextContent = values.content.trim();

    if (!nextTitle) {
      nextErrors.title = 'Question or title is required.';
    } else if (nextTitle.length < TITLE_MIN) {
      nextErrors.title = `Question or title must be at least ${TITLE_MIN} characters.`;
    } else if (nextTitle.length > TITLE_MAX) {
      nextErrors.title = `Question or title must be under ${TITLE_MAX} characters.`;
    }

    if (nextCategory.length > CATEGORY_MAX) {
      nextErrors.category = `Category must be under ${CATEGORY_MAX} characters.`;
    }

    if (!nextContent) {
      nextErrors.content = 'Answer content is required.';
    } else if (nextContent.length < CONTENT_MIN) {
      nextErrors.content = `Answer content must be at least ${CONTENT_MIN} characters.`;
    } else if (nextContent.length > CONTENT_MAX) {
      nextErrors.content = `Answer content must be under ${CONTENT_MAX} characters.`;
    }

    return nextErrors;
  };

  const handleFieldChange = (field, value) => {
    if (field === 'title') setTitle(value);
    if (field === 'category') setCategory(value);
    if (field === 'content') setContent(value);

    const nextValues = {
      title: field === 'title' ? value : title,
      category: field === 'category' ? value : category,
      content: field === 'content' ? value : content,
    };
    const nextErrors = validate(nextValues);
    setErrors((prev) => ({
      ...prev,
      title: nextErrors.title,
      category: nextErrors.category,
      content: nextErrors.content,
      submit: '',
    }));
  };

  useEffect(() => {
    loadEntries();
  }, [filterCategory]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const params = filterCategory ? { category: filterCategory } : {};
      const res = await axios.get(`${API}/knowledge`, { params });
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const startAdd = () => {
    setEditingId(null);
    setTitle('');
    setCategory('');
    setContent('');
    setErrors({ title: '', category: '', content: '', submit: '' });
    setShowForm(true);
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setCategory(entry.category || '');
    setContent(entry.content);
    setErrors({ title: '', category: '', content: '', submit: '' });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle('');
    setCategory('');
    setContent('');
    setErrors({ title: '', category: '', content: '', submit: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validate({ title, category, content });
    if (nextErrors.title || nextErrors.category || nextErrors.content) {
      setErrors(nextErrors);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        category: category.trim() || 'General',
        content: content.trim(),
      };
      if (editingId) {
        await axios.put(`${API}/knowledge/${editingId}`, payload);
      } else {
        await axios.post(`${API}/knowledge`, payload);
      }
      cancelForm();
      loadEntries();
    } catch (e) {
      setErrors((prev) => ({ ...prev, submit: 'Failed to save entry. Please try again.' }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this training entry?')) return;
    try {
      await axios.delete(`${API}/knowledge/${id}`);
      loadEntries();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  if (!isAdmin) {
    return (
      <div className="chatbot-training-page">
        <div className="container">
          <p className="error-msg">Access denied. Admin only.</p>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      </div>
    );
  }

  const categories = [...new Set(entries.map(e => e.category || 'General'))];

  return (
    <div className="chatbot-training-page">
      <div className="container">
        <header className="page-header">
          <h1>🤖 Chatbot Training</h1>
          <p>Train the chatbot by adding questions and answers. Students will get these responses when asking questions.</p>
        </header>

        <div className="training-actions">
          <button type="button" className="btn btn-primary" onClick={startAdd}>
            + Add Training Entry
          </button>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="filter-select">
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card training-form">
            <h3>{editingId ? 'Edit Training Entry' : 'New Training Entry'}</h3>
            <div className="form-group">
              <label>Question / Title</label>
              <input
                value={title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g. How do I register for courses?"
                maxLength={TITLE_MAX}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'training-title-error' : undefined}
                required
              />
              {errors.title && <p id="training-title-error" className="training-error">{errors.title}</p>}
            </div>
            <div className="form-group">
              <label>Category (Optional)</label>
              <input
                value={category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
                placeholder="e.g. Registration, Exams, Rules"
                maxLength={CATEGORY_MAX}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? 'training-category-error' : undefined}
              />
              {errors.category && <p id="training-category-error" className="training-error">{errors.category}</p>}
            </div>
            <div className="form-group">
              <label>Answer / Content</label>
              <textarea
                value={content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                placeholder="Enter the answer that the chatbot should provide when students ask this question..."
                rows={6}
                maxLength={CONTENT_MAX}
                aria-invalid={Boolean(errors.content)}
                aria-describedby={errors.content ? 'training-content-error' : undefined}
                required
              />
              {errors.content && <p id="training-content-error" className="training-error">{errors.content}</p>}
            </div>
            {errors.submit && <p className="training-error">{errors.submit}</p>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Save'} Entry</button>
              <button type="button" className="btn btn-ghost" onClick={cancelForm}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="muted">Loading training data…</p>
        ) : (
          <div className="entries-list">
            {entries.length === 0 ? (
              <div className="card">
                <p className="muted">No training entries yet. Add your first Q&A to train the chatbot.</p>
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="card entry-card">
                  <div className="entry-header">
                    <span className="entry-category">{entry.category || 'General'}</span>
                    <h3>{entry.title}</h3>
                  </div>
                  <div className="entry-content">{entry.content}</div>
                  <div className="entry-meta">
                    {entry.updatedAt && (
                      <span className="muted">Updated: {new Date(entry.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="entry-actions">
                    <button type="button" className="btn-sm" onClick={() => startEdit(entry)}>Edit</button>
                    <button type="button" className="btn-sm btn-danger" onClick={() => handleDelete(entry.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="page-links">
          <Link to="/inquiry" className="btn btn-ghost">Test Chatbot</Link>
          <Link to="/knowledge-base" className="btn btn-ghost">View Knowledge Base</Link>
          <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default ChatbotTraining;
