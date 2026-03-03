import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SearchSystem.css';

const API = 'http://localhost:8080/api';
const YEARS = [1, 2, 3, 4];

function SearchSystem() {
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole') || 'STUDENT';
  const registeredYear = localStorage.getItem('userYear');
  const isStudentWithFixedYear = userRole === 'STUDENT' && !!registeredYear;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedYearLevel, setSelectedYearLevel] = useState(
    isStudentWithFixedYear ? String(registeredYear) : (localStorage.getItem('selectedYearLevel') || '1')
  );
  const [results, setResults] = useState({
    subjects: [],
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ subjects: [] });
      setSearched(true);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`${API}/search`, {
        params: {
          query: trimmed,
          userId: userId ? Number(userId) : undefined,
          yearLevel: Number(selectedYearLevel),
        },
      });

      setResults({
        subjects: Array.isArray(res.data?.subjects) ? res.data.subjects : [],
      });
      setSearched(true);
    } catch (error) {
      console.error(error);
      setResults({ subjects: [] });
      setSearched(true);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const total = results.subjects.length;

  return (
    <div className="search-system-page">
      <div className="container">
        <header className="page-header">
          <h1>Search System</h1>
          <p>Enter the year and search subjects only.</p>
        </header>

        <section className="card search-form-card">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-row">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subjects..."
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div className="search-filters">
              <label>
                Year
                <select
                  value={selectedYearLevel}
                  onChange={(e) => setSelectedYearLevel(e.target.value)}
                  disabled={isStudentWithFixedYear}
                >
                  {isStudentWithFixedYear ? (
                    <option value={String(registeredYear)}>Year {registeredYear}</option>
                  ) : (
                    YEARS.map((year) => (
                      <option key={year} value={year}>Year {year}</option>
                    ))
                  )}
                </select>
              </label>
            </div>
          </form>
        </section>

        {searched && (
          <section className="search-results">
            <p className="search-summary">Found {total} result(s).</p>

            <article className="card result-card">
              <h3>Subjects ({results.subjects.length})</h3>
              {results.subjects.length === 0 ? (
                <p className="muted">No subjects matched.</p>
              ) : (
                <ul>
                  {results.subjects.map((subject) => (
                    <li key={subject.id}>
                      <div>
                        <strong>{subject.name}</strong>
                        <small>{subject.code || 'No code'} • {subject.lecturerName || 'Lecturer N/A'}</small>
                      </div>
                      <Link to="/study-library" className="link-btn">Open</Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}
      </div>
    </div>
  );
}

export default SearchSystem;
