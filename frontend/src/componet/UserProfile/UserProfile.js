import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserProfile.css';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('Please log in to view your profile.');
      setLoading(false);
      return;
    }

    axios
      .get(`http://localhost:8080/user/${userId}`)
      .then((response) => {
        setUser(response.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load profile.');
        setLoading(false);
      });
  }, []);

  const goToUpdate = (id) => navigate(`/updateProfile/${id}`);
  const goToDashboard = () => navigate('/dashboard');

  const deleteAccount = async (id) => {
    if (!window.confirm('Delete your account? This cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:8080/user/${id}`);
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      navigate('/');
    } catch {
      alert('Failed to delete account.');
    }
  };

  if (loading) return <div className="profile-page"><div className="profile-card"><p className="status-message">Loading…</p></div></div>;
  if (error) return <div className="profile-page"><div className="profile-card"><p className="status-message error">{error}</p></div></div>;

  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : user?.role === 'ALUMNI' ? 'Alumni' : 'Student';
  const skills = (user?.skills || '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <h2>Profile</h2>
          <p>Manage your account</p>
        </div>

        {user && (
          <div className="profile-body">
            <div className="profile-avatar-wrap">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="profile-avatar" />
              ) : (
                <div className="profile-avatar profile-avatar-fallback">{(user.name || 'U').charAt(0).toUpperCase()}</div>
              )}
            </div>

            <div className="info-item">
              <span className="label">Role</span>
              <span className="value role-badge">{roleLabel}</span>
            </div>
            <div className="info-item">
              <span className="label">Name</span>
              <span className="value">{user.name}</span>
            </div>
            <div className="info-item">
              <span className="label">Email</span>
              <span className="value">{user.email}</span>
            </div>
            <div className="info-item">
              <span className="label">Password</span>
              <span className="value">********</span>
            </div>

            <div className="info-stack">
              <span className="label">Bio / About</span>
              <p className="stack-value">{user.bio || 'Add your bio to help career matching.'}</p>
            </div>

            <div className="info-stack">
              <span className="label">Skills</span>
              {skills.length ? (
                <div className="skills-wrap">
                  {skills.map((skill) => (
                    <span key={skill} className="skill-chip">{skill}</span>
                  ))}
                </div>
              ) : (
                <p className="stack-value">Add skills to build your career profile.</p>
              )}
            </div>

            <div className="info-stack">
              <span className="label">Education</span>
              <p className="stack-value">{user.education || 'Add your education details.'}</p>
            </div>

            <div className="profile-actions">
              <button type="button" className="btn-update" onClick={() => goToUpdate(user.id)}>Edit Profile</button>
              <button type="button" className="btn-secondary" onClick={goToDashboard}>Dashboard</button>
              <button type="button" className="btn-delete" onClick={() => deleteAccount(user.id)}>Delete Account</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
