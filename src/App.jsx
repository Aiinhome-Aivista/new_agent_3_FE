import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Stakeholders from './pages/Stakeholders';
import PlanPage from './pages/PlanPage';
import SchedulePage from './pages/SchedulePage';
import TrackingPage from './pages/TrackingPage';
import RisksPage from './pages/RisksPage';
import AssessmentPage from './pages/AssessmentPage';
import ReportsPage from './pages/ReportsPage';
import ChatbotPage from './pages/ChatbotPage';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stakeholders" element={<Stakeholders />} />
              <Route path="/plans" element={<PlanPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/risks" element={<RisksPage />} />
              <Route path="/assessment" element={<AssessmentPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/chatbot" element={<ChatbotPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
