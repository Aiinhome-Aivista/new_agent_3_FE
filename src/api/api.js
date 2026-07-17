import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Request interceptor to inject the JWT access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear local storage and force reload to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginUser = (data) => api.post('/auth/login', data);


// Stakeholders
export const getStakeholders = (role) => api.get(role ? `/stakeholders/?role=${encodeURIComponent(role)}` : '/stakeholders/');
export const getStakeholder = (id) => api.get(`/stakeholders/${id}`);
export const createStakeholder = (data) => api.post('/stakeholders/', data);
export const updateStakeholder = (id, data) => api.put(`/stakeholders/${id}`, data);
export const deleteStakeholder = (id) => api.delete(`/stakeholders/${id}`);

// Plans
export const generatePlan = (data) => api.post('/plans/generate', data);
export const getPlans = () => api.get('/plans/');
export const approvePlan = (id) => api.put(`/plans/${id}/approve`);

// Schedule
export const createMeeting = (data) => api.post('/schedule/meetings', data);
export const getMeetings = (planId) => {
    const url = planId ? `/schedule/meetings?plan_id=${planId}` : '/schedule/meetings';
    return api.get(url);
};
export const updateMeetingStatus = (id, status) => api.put(`/schedule/meetings/${id}/status`, { status });
export const notifyMeeting = (id) => api.post(`/schedule/meetings/${id}/notify`);

// Tracking
export const markAttendance = (data) => api.post('/tracking/attendance', data);
export const getAttendance = (meetingId) => api.get(`/tracking/attendance/${meetingId}`);
export const updateCompletion = (data) => api.post('/tracking/completion', data);
export const getPlanSummary = (planId) => api.get(`/tracking/plan/${planId}/summary`);
export const getPlanTopics = (planId) => api.get(`/tracking/plan/${planId}/topics`);

// Risks
export const detectRisks = (planId) => api.post('/risks/detect', { plan_id: planId });
export const getRisks = (planId) => {
    const url = planId ? `/risks/?plan_id=${planId}` : '/risks/';
    return api.get(url);
};
export const escalateRisk = (id) => api.put(`/risks/${id}/escalate`);

// Assessments
export const generateQuestions = (planId) => api.post('/assessments/generate-questions', { plan_id: planId });
export const submitAnswer = (data) => api.post('/assessments/submit', data);
export const getResults = (planId) => api.get(`/assessments/plan/${planId}/results`);

// Reports
export const generateWeeklyReport = (planId) => api.post('/reports/weekly', { plan_id: planId });
export const generateFinalReport = (planId) => api.post('/reports/final', { plan_id: planId });
export const getReports = () => api.get('/reports/');

// Chatbot
export const askChatbot = (sessionId, question, planId = null) => 
  api.post('/chat/ask', { session_id: sessionId, question, ...(planId ? { plan_id: planId } : {}) });
export const getChatHistory = (sessionId) => api.get(`/chat/history/${sessionId}`);

// Knowledge Base
export const uploadKnowledgeDocument = (formData) => api.post('/knowledge/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getKnowledgeDocuments = (planId) => api.get(`/knowledge/plan/${planId}`);

// Guardrails
export const getGuardrailLogs = () => api.get('/guardrails/');

// Orchestrator / Full Workflow
export const runFullWorkflow = (data) => api.post('/plans/workflow', data);

export default api;
