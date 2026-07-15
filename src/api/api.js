import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Stakeholders
export const getStakeholders = () => api.get('/stakeholders/');
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
export const askChatbot = (sessionId, question) => api.post('/chat/ask', { session_id: sessionId, question });
export const getChatHistory = (sessionId) => api.get(`/chat/history/${sessionId}`);

export default api;
