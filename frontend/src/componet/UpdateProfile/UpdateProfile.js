import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './UpdateProfile.css';

const ROLES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'ALUMNI', label: 'Alumni' },
  { value: 'ADMIN', label: 'Admin' },
];

function UpdateProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    year: null,
    profilePhoto: '',
    bio: '',
    education: '',
    skills: '',
  });

  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/user/${id}`);
        setFormData({
          name: res.data.name || '',
          email: res.data.email || '',
          password: '',
          role: res.data.role || 'STUDENT',
          year: res.data.year ?? null,
          profilePhoto: res.data.profilePhoto || '',
          bio: res.data.bio || '',
          education: res.data.education || '',
          skills: res.data.skills || '',
        });
        setPhotoPreview(res.data.profilePhoto || '');
      } catch {
        alert('Failed to load profile.');
      }
    };
    fetchUser();
  }, [id]);

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      if (typeof base64 === 'string') {
        setPhotoPreview(base64);
        setFormData((prev) => ({ ...prev, profilePhoto: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoPreview('');
    setFormData((prev) => ({ ...prev, profilePhoto: '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = { name: formData.name, email: formData.email, role: formData.role };
    if (formData.password.trim()) payload.password = formData.password;
    if (formData.year != null && formData.year !== '') payload.year = Number(formData.year);
    payload.profilePhoto = formData.profilePhoto;
    payload.bio = formData.bio;
    payload.education = formData.education;
    payload.skills = formData.skills;

    try {
      await axios.put(`http://localhost:8080/user/${id}`, payload);
      localStorage.setItem('userName', formData.name);
      localStorage.setItem('userRole', formData.role);
      if (formData.profilePhoto) localStorage.setItem('userProfilePhoto', formData.profilePhoto);
      else localStorage.removeItem('userProfilePhoto');
      if (formData.year != null) localStorage.setItem('userYear', String(formData.year));
      else localStorage.removeItem('userYear');
      localStorage.setItem('userBio', formData.bio || '');
      localStorage.setItem('userSkills', formData.skills || '');
      localStorage.setItem('userEducation', formData.education || '');
      alert('Profile updated.');
      navigate('/userProfile');
    } catch {
      alert('Update failed.');
    }
  };

  return (
    <div className="auth-page update-page">
      <div className="auth-card update-container">
        <div className="auth-header update-header">
          <h2>Edit Profile</h2>
          <p>Update your account</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label>Profile Photo</label>
            <div className="photo-upload-box">
              <div className="photo-preview-wrap">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="profile-photo-preview" />
                ) : (
                  <div className="photo-placeholder">No photo selected</div>
                )}
              </div>
              <div className="photo-actions">
                <input type="file" accept="image/*" onChange={onPhotoChange} />
                {photoPreview && (
                  <button type="button" className="remove-photo-btn" onClick={clearPhoto}>
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={onInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Your email"
              value={formData.email}
              onChange={onInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Bio / About</label>
            <textarea
              name="bio"
              placeholder="Tell others about yourself"
              value={formData.bio}
              onChange={onInputChange}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Skills (comma separated)</label>
            <input
              type="text"
              name="skills"
              placeholder="React, Java, Spring Boot"
              value={formData.skills}
              onChange={onInputChange}
            />
          </div>

          <div className="form-group">
            <label>Education Details</label>
            <textarea
              name="education"
              placeholder="University, degree, expected graduation"
              value={formData.education}
              onChange={onInputChange}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={onInputChange}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {formData.role === 'STUDENT' && (
            <div className="form-group">
              <label>Year (for job visibility: 3rd/4th see jobs)</label>
              <select name="year" value={formData.year ?? ''} onChange={onInputChange}>
                <option value="">Select year</option>
                <option value={1}>1st year</option>
                <option value={2}>2nd year</option>
                <option value={3}>3rd year</option>
                <option value={4}>4th year</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>New Password (leave blank to keep current)</label>
            <input
              type="password"
              name="password"
              placeholder="New password"
              value={formData.password}
              onChange={onInputChange}
            />
          </div>
          <div className="button-group">
            <button type="submit" className="save-btn">Save</button>
            <button type="button" className="cancel-btn" onClick={() => navigate('/userProfile')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateProfile;
