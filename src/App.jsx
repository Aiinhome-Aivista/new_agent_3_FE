import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Stakeholders from './pages/Stakeholders';
import PlanPage from './pages/PlanPage';
import SchedulePage from './pages/SchedulePage';
import TrackingPage from './pages/TrackingPage';
import RisksPage from './pages/RisksPage';
import AssessmentPage from './pages/AssessmentPage';
import ReportsPage from './pages/ReportsPage';
import ChatbotPage from './pages/ChatbotPage';
import LoginPage from './pages/LoginPage';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected/Internal Routes wrapped in AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/stakeholders" element={<Stakeholders />} />
              <Route path="/plans" element={<PlanPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/risks" element={<RisksPage />} />
              <Route path="/assessment" element={<AssessmentPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/chatbot" element={<ChatbotPage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
