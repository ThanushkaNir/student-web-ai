import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Blog.css';

const API = 'http://localhost:8080/api';

function Blog() {
  const TITLE_MIN = 5;
  const TITLE_MAX = 120;
  const CONTENT_MIN = 30;
  const CONTENT_MAX = 5000;

  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole');
  const isAlumni = role === 'ALUMNI';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [formErrors, setFormErrors] = useState({ title: '', content: '', submit: '' });
  const [viewId, setViewId] = useState(null);
  const [viewPost, setViewPost] = useState(null);

  const validateForm = (values) => {
    const next = { title: '', content: '', submit: '' };

    const title = values.title.trim();
    const content = values.content.trim();

    if (!title) {
      next.title = 'Title is required.';
    } else if (title.length < TITLE_MIN) {
      next.title = `Title must be at least ${TITLE_MIN} characters.`;
    } else if (title.length > TITLE_MAX) {
      next.title = `Title must be under ${TITLE_MAX} characters.`;
    }

    if (!content) {
      next.content = 'Content is required.';
    } else if (content.length < CONTENT_MIN) {
      next.content = `Content must be at least ${CONTENT_MIN} characters.`;
    } else if (content.length > CONTENT_MAX) {
      next.content = `Content must be under ${CONTENT_MAX} characters.`;
    }

    return next;
  };

  const hasErrors = (errors) => Boolean(errors.title || errors.content);

  const handleChange = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    const nextErrors = validateForm(nextForm);
    setFormErrors((prev) => ({ ...prev, title: nextErrors.title, content: nextErrors.content, submit: '' }));
  };

  const loadPosts = async () => {
    try {
      const res = await axios.get(`${API}/blog`);
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (!viewId) { setViewPost(null); return; }
    axios.get(`${API}/blog/${viewId}`).then((res) => setViewPost(res.data)).catch(() => setViewPost(null));
  }, [viewId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm(form);
    if (hasErrors(errors)) {
      setFormErrors(errors);
      return;
    }

    try {
      await axios.post(`${API}/blog`, {
        title: form.title.trim(),
        content: form.content.trim(),
        authorId: Number(userId),
      });
      setForm({ title: '', content: '' });
      setFormErrors({ title: '', content: '', submit: '' });
      setShowForm(false);
      loadPosts();
    } catch (e) {
      setFormErrors((prev) => ({ ...prev, submit: 'Failed to publish blog post. Please try again.' }));
    }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API}/blog/${id}`);
      setViewId(null);
      loadPosts();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '');

  if (!userId) {
    return <div className="blog-page"><div className="container"><p className="muted">Please log in.</p></div></div>;
  }

  return (
    <div className="blog-page">
      <div className="container">
        <header className="page-header">
          <h1>Alumni Blog</h1>
          <p>A knowledge-sharing space where alumni can publish experiences and students can learn from real career journeys.</p>
        </header>

        {isAlumni && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>+ Write New Blog</button>
            {showForm && (
              <form onSubmit={handleSubmit} className="card blog-form">
                <h3>Write Blog Post</h3>
                <input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  maxLength={TITLE_MAX}
                  aria-invalid={Boolean(formErrors.title)}
                  aria-describedby={formErrors.title ? 'blog-title-error' : undefined}
                  required
                />
                {formErrors.title && <p id="blog-title-error" className="form-error">{formErrors.title}</p>}

                <textarea
                  placeholder="Content..."
                  value={form.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  rows={8}
                  maxLength={CONTENT_MAX}
                  aria-invalid={Boolean(formErrors.content)}
                  aria-describedby={formErrors.content ? 'blog-content-error' : undefined}
                  required
                />
                {formErrors.content && <p id="blog-content-error" className="form-error">{formErrors.content}</p>}
                {formErrors.submit && <p className="form-error">{formErrors.submit}</p>}

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Publish</button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowForm(false);
                      setFormErrors({ title: '', content: '', submit: '' });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : viewPost ? (
          <article className="card blog-full">
            <button type="button" className="back-btn" onClick={() => setViewId(null)}>← Back to list</button>
            <h2>{viewPost.title}</h2>
            <p className="blog-meta">{formatDate(viewPost.createdAt)}</p>
            <div className="blog-body">{viewPost.content}</div>
            {isAlumni && (
              <button type="button" className="btn-sm btn-danger" onClick={() => deletePost(viewPost.id)}>Delete</button>
            )}
          </article>
        ) : (
          <div className="blog-list">
            {posts.length === 0 ? (
              <p className="muted">No posts yet.</p>
            ) : (
              posts.map((p) => (
                <article key={p.id} className="card blog-card" onClick={() => setViewId(p.id)}>
                  <h3>{p.title}</h3>
                  <p className="blog-meta">{formatDate(p.createdAt)}</p>
                  <p className="blog-preview">{p.content?.slice(0, 120)}…</p>
                  {isAlumni && (
                    <div className="blog-card-actions">
                      <button
                        type="button"
                        className="btn-sm btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePost(p.id);
                        }}
                      >
                        Delete Blog
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        )}

        <div className="page-links">
          <Link to="/jobs" className="btn btn-primary">Jobs</Link>
          <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default Blog;
