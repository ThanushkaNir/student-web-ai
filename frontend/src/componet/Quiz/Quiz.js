import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Quiz.css';

const API = 'http://localhost:8080/api';

function Quiz() {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get('subjectId');
  const documentId = searchParams.get('documentId');
  const mode = searchParams.get('mode') || 'quiz';
  const [questions, setQuestions] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const answersRef = useRef(answers);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitValidationError, setSubmitValidationError] = useState('');
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const submitRef = useRef(null);
  const userId = localStorage.getItem('userId');
  answersRef.current = answers;

  const fetchQuestions = useCallback(async () => {
    if (!subjectId && !documentId) {
      setError('Select a subject or document from Study Library first.');
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (subjectId) params.append('subjectId', subjectId);
      if (documentId) params.append('documentId', documentId);
      if (mode === 'flashcards') {
        let res = await axios.get(`${API}/flashcards?${params}`);
        if (res.data.length === 0 && documentId && userId) {
          try {
            await axios.post(`${API}/documents/${documentId}/generate-flashcards`, null, {
              params: { userId: Number(userId) },
            });
            res = await axios.get(`${API}/flashcards?${params}`);
          } catch (generationError) {
            // Keep existing empty-state UX if auto-generation fails.
          }
        }
        setFlashcards(res.data);
        if (res.data.length === 0) setError('No flashcards yet. Upload or regenerate content from Study Library.');
      } else {
        const res = await axios.get(`${API}/questions?${params}`);
        setQuestions(res.data);
        const calculatedTime = res.data.length * 60; // 1 minute per question
        setTotalTime(calculatedTime);
        setTimeLeft(calculatedTime);
        if (res.data.length === 0) setError('No questions yet. Generate MCQs from a document in Study Library.');
      }
    } catch (e) {
      setError(mode === 'flashcards' ? 'Failed to load flashcards.' : 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [subjectId, documentId, mode]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleAnswer = (questionId, option) => {
    setSubmitValidationError('');
    setAnswers((prev) => ({ ...prev, [String(questionId)]: option }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitted) return;

    if (!userId) {
      setResult({ error: 'Please log in to submit quiz.' });
      return;
    }

    const answeredCount = Object.keys(answersRef.current).length;
    const minimumRequiredAnswers = Math.min(10, questions.length);
    if (answeredCount < minimumRequiredAnswers) {
      setSubmitValidationError(`Please answer at least ${minimumRequiredAnswers} questions before submitting (${answeredCount}/${questions.length} answered).`);
      return;
    }

    setSubmitValidationError('');
    setSubmitted(true);
    const timeSpent = totalTime - timeLeft;
    const answersToSend = answersRef.current;
    try {
      const res = await axios.post(`${API}/quiz/submit`, {
        userId: userId,
        subjectId: subjectId || null,
        documentId: documentId || null,
        answers: answersToSend,
        timeSeconds: timeSpent,
      });
      setResult(res.data);
    } catch (e) {
      setResult({ error: 'Failed to submit quiz.' });
    }
  }, [submitted, timeLeft, totalTime, userId, subjectId, documentId]);

  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (mode === 'flashcards') return;
    if (!started || submitted || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          if (submitRef.current) submitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, submitted, mode, timeLeft]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="quiz-page"><div className="container"><p className="muted">Loading {mode === 'flashcards' ? 'flashcards' : 'questions'}…</p></div></div>;
  if (error) return <div className="quiz-page"><div className="container"><p className="error-msg">{error}</p><Link to="/study-library">Go to Study Library</Link></div></div>;

  if (mode === 'flashcards') {
    if (flashcards.length === 0) {
      return (
        <div className="quiz-page">
          <div className="container">
            <p className="muted">No flashcards available. Generate content from a document first.</p>
            <Link to="/study-library">Study Library</Link>
          </div>
        </div>
      );
    }

    const activeCard = flashcards[activeCardIndex];
    const progressPercent = Math.round(((activeCardIndex + 1) / flashcards.length) * 100);
    return (
      <div className="quiz-page">
        <div className="container">
          <header className="quiz-header">
            <h1>Flashcards</h1>
            <div className="quiz-meta">
              <span className="q-count">Card {activeCardIndex + 1} of {flashcards.length}</span>
              <Link to={`/quiz?subjectId=${subjectId || ''}&documentId=${documentId || ''}`} className="btn btn-ghost">Switch to Quiz</Link>
            </div>
          </header>

          <div className="flashcard-wrap">
            <div className="flashcard-topbar">
              <div className="flashcard-progress-meta">
                <span className="flashcard-badge">{isCardFlipped ? 'Answer Side' : 'Question Side'}</span>
                <span className="flashcard-tip">Flip the card to self-check your answer</span>
              </div>
              <div className="flashcard-progress" aria-hidden="true">
                <span className="flashcard-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <button type="button" className={`flashcard ${isCardFlipped ? 'flipped' : ''}`} onClick={() => setIsCardFlipped((v) => !v)}>
              <span className="flashcard-face flashcard-front">
                <strong>Question</strong>
                <p>{activeCard.frontText}</p>
              </span>
              <span className="flashcard-face flashcard-back">
                <strong>Answer</strong>
                <p>{activeCard.backText}</p>
              </span>
            </button>

            <div className="flashcard-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={activeCardIndex === 0}
                onClick={() => {
                  setIsCardFlipped(false);
                  setActiveCardIndex((i) => Math.max(0, i - 1));
                }}
              >
                Previous
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setIsCardFlipped((v) => !v)}>
                {isCardFlipped ? 'Show Front' : 'Show Back'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={activeCardIndex === flashcards.length - 1}
                onClick={() => {
                  setIsCardFlipped(false);
                  setActiveCardIndex((i) => Math.min(flashcards.length - 1, i + 1));
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result && !result.error) {
    return (
      <div className="quiz-page">
        <div className="container">
          <div className="quiz-result card">
            <h2>Quiz submitted</h2>
            <p className="score-line">Score: <strong>{result.scoreObtained}</strong> / {result.totalQuestions}</p>
            <p className="muted">Time: {result.timeSeconds != null ? formatTime(result.timeSeconds) : '—'}</p>
            <div className="result-actions">
              <Link to="/quiz-history" className="btn btn-primary">View Score History</Link>
              <Link to="/study-library" className="btn btn-ghost">Back to Study Library</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="quiz-page">
        <div className="container">
          <p className="error-msg">{result.error}</p>
          <Link to="/study-library">Study Library</Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-page">
        <div className="container">
          <p className="muted">No questions available. Generate MCQs from a document first.</p>
          <Link to="/study-library">Study Library</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="container">
        <header className="quiz-header">
          <h1>Quiz</h1>
          <div className="quiz-meta">
            {!started ? (
              <button type="button" className="btn btn-primary" onClick={() => setStarted(true)}>Start Quiz</button>
            ) : (
              <>
                <span className="timer">Time: {formatTime(timeLeft)}</span>
                <span className="q-count">{questions.length} questions • {formatTime(totalTime)} total</span>
              </>
            )}
            <Link to={`/quiz?subjectId=${subjectId || ''}&documentId=${documentId || ''}&mode=flashcards`} className="btn btn-ghost">Open Flashcards</Link>
          </div>
        </header>

        {started && (
          <div className="quiz-questions">
            {questions.map((q, idx) => (
              <div key={q.id} className="card question-card">
                <p className="q-num">Question {idx + 1}</p>
                <p className="q-text">{q.questionText}</p>
                <div className="options">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const optionText = q[`option${opt}`];
                    if (!optionText) return null;
                    return (
                      <label key={opt} className="option-row">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[String(q.id)] === opt}
                          onChange={() => handleAnswer(q.id, opt)}
                        />
                        <span className="option-content">
                          <strong className="option-letter">{opt}.</strong>
                          <span className="option-text">{optionText}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="quiz-submit">
              {submitValidationError && <p className="quiz-validation-error">{submitValidationError}</p>}
              <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitted}>
                Submit Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;
