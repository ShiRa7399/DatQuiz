import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './utils/authContext';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import QuizDetail from './pages/QuizDetail';
import StudentJoin from './pages/StudentJoin';
import Instructions from './pages/Instructions';
import TakeQuiz from './pages/TakeQuiz';
import QuizResults from './pages/QuizResults';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen bg-[#f6ebd8]">
          <Routes>
            {/* Landing & Authentication Pages */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Faculty Workspace */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create-quiz" element={<ProtectedRoute><CreateQuiz /></ProtectedRoute>} />
            <Route path="/quiz/:code" element={<ProtectedRoute><QuizDetail /></ProtectedRoute>} />
            <Route path="/quiz/:code/results" element={<ProtectedRoute><QuizResults /></ProtectedRoute>} />

            {/* Student Exam Routes */}
            <Route path="/join" element={<StudentJoin />} />
            <Route path="/instructions" element={<Instructions />} />
            <Route path="/take-quiz/:code" element={<TakeQuiz />} />

            {/* Default Catch-all -> Redirect to Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}
