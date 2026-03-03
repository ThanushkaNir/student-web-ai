import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './componet/Navbar/Navbar';
import ProtectedRoute from './componet/ProtectedRoute/ProtectedRoute';
import Home from './componet/Home/Home';
import About from './componet/About/About';
import Register from './componet/Register/Register';
import Login from './componet/Login/Login';
import Dashboard from './componet/Dashboard/Dashboard';
import UserProfile from './componet/UserProfile/UserProfile';
import UpdateProfile from './componet/UpdateProfile/UpdateProfile';
import StudyLibrary from './componet/StudyLibrary/StudyLibrary';
import Quiz from './componet/Quiz/Quiz';
import QuizHistory from './componet/QuizHistory/QuizHistory';
import AssignmentTracker from './componet/AssignmentTracker/AssignmentTracker';
import StudyCalendar from './componet/StudyCalendar/StudyCalendar';
import KnowledgeBase from './componet/KnowledgeBase/KnowledgeBase';
import Inquiry from './componet/Inquiry/Inquiry';
import SupportTickets from './componet/SupportTickets/SupportTickets';
import Jobs from './componet/Jobs/Jobs';
import Resume from './componet/Resume/Resume';
import Career from './componet/Career/Career';
import Blog from './componet/Blog/Blog';
import CoverLetter from './componet/CoverLetter/CoverLetter';
import ChatbotTraining from './componet/ChatbotTraining/ChatbotTraining';
import DownloadCenter from './componet/DownloadCenter/DownloadCenter';
import SearchSystem from './componet/SearchSystem/SearchSystem';
import './App.css';

function App() {
  useEffect(() => {
    // validate part
    const handleSubmitCapture = (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const fields = Array.from(form.querySelectorAll('input, textarea, select'));

      fields.forEach((field) => {
        if (field.disabled) return;

        if (
          field.required
          && (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)
          && ['text', 'email', 'password', 'search', 'tel', 'url'].includes(field.type || 'text')
        ) {
          const trimmed = field.value.trim();
          field.setCustomValidity(trimmed ? '' : 'This field is required.');
        } else {
          field.setCustomValidity('');
        }

        if (field instanceof HTMLInputElement && field.type === 'email' && field.value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(field.value.trim())) {
            field.setCustomValidity('Please enter a valid email address.');
          }
        }
      });

      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        form.reportValidity();
      }
    };

    const handleInputCapture = (event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        return;
      }

      if (field.required && (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
        const isTextLike = !(field instanceof HTMLInputElement) || ['text', 'email', 'password', 'search', 'tel', 'url'].includes(field.type || 'text');
        if (isTextLike && !field.value.trim()) {
          field.setCustomValidity('This field is required.');
          return;
        }
      }

      if (field instanceof HTMLInputElement && field.type === 'email' && field.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        field.setCustomValidity(emailRegex.test(field.value.trim()) ? '' : 'Please enter a valid email address.');
        return;
      }

      field.setCustomValidity('');
    };

    document.addEventListener('submit', handleSubmitCapture, true);
    document.addEventListener('input', handleInputCapture, true);

    return () => {
      document.removeEventListener('submit', handleSubmitCapture, true);
      document.removeEventListener('input', handleInputCapture, true);
    };
  }, []);

  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/userProfile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/updateProfile/:id"
              element={
                <ProtectedRoute>
                  <UpdateProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-library"
              element={
                <ProtectedRoute>
                  <StudyLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <ProtectedRoute>
                  <Quiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz-history"
              element={
                <ProtectedRoute>
                  <QuizHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments"
              element={
                <ProtectedRoute>
                  <AssignmentTracker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-calendar"
              element={
                <ProtectedRoute>
                  <StudyCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge-base"
              element={
                <ProtectedRoute>
                  <KnowledgeBase />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inquiry"
              element={
                <ProtectedRoute>
                  <Inquiry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <SupportTickets />
                </ProtectedRoute>
              }
            />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/resume" element={<ProtectedRoute><Resume /></ProtectedRoute>} />
            <Route path="/career" element={<ProtectedRoute><Career /></ProtectedRoute>} />
            <Route path="/blog" element={<ProtectedRoute><Blog /></ProtectedRoute>} />
            <Route path="/cover-letter" element={<ProtectedRoute><CoverLetter /></ProtectedRoute>} />
            <Route path="/chatbot-training" element={<ProtectedRoute><ChatbotTraining /></ProtectedRoute>} />
            <Route path="/download-center" element={<ProtectedRoute><DownloadCenter /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><SearchSystem /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
