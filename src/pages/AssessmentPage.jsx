import React, { useState, useEffect } from 'react';
import { getPlans, getStakeholders, getMeetings, generateQuestions, submitAnswer, getResults } from '../api/api';
import Loader from '../components/Loader';
import { FileQuestion, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AssessmentPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedStakeholderId, setSelectedStakeholderId] = useState('');
  
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [meetings, setMeetings] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Single question form
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [plansRes, stRes, meetingsRes] = await Promise.all([getPlans(), getStakeholders(), getMeetings()]);
        const appPlans = plansRes.data.data.filter(p => p.status === 'approved');
        setPlans(appPlans);
        setStakeholders(stRes.data.data);
        setMeetings(meetingsRes.data.data || []);
        if (appPlans.length > 0) setSelectedPlanId(appPlans[0].id.toString());
        if (stRes.data.data.length > 0) setSelectedStakeholderId(stRes.data.data[0].id.toString());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    if (selectedPlanId) fetchResults();
  }, [selectedPlanId]);

  const fetchResults = async () => {
    try {
      const res = await getResults(selectedPlanId);
      const allResults = res.data.data || [];
      if (user?.role === 'Incoming Team Member (Knowledge Receiver)') {
        setResults(allResults.filter(r => r.stakeholder_name === user.name));
      } else {
        setResults(allResults);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedPlanId) return;
    setGenerating(true);
    try {
      const res = await generateQuestions(selectedPlanId);
      setQuestions(res.data.data);
      if (res.data.data.length > 0) {
        setCurrentQuestion(res.data.data[0]);
      }
    } catch (err) {
      alert('Error generating questions');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitAnswer({
        plan_id: selectedPlanId,
        stakeholder_id: selectedStakeholderId,
        question: currentQuestion,
        answer: answer
      });
      setAnswer('');
      fetchResults();
    } catch (err) {
      alert('Error submitting answer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  const canSetup = user?.role === 'Incoming Team Member (Knowledge Receiver)';
  const canSubmit = user?.role === 'Incoming Team Member (Knowledge Receiver)';

  const hasCompletedMeeting = meetings.some(m => String(m.plan_id) === String(selectedPlanId) && m.status?.toLowerCase() === 'completed');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <FileQuestion className="mr-2 text-indigo-500" /> AI Assessments
      </h2>

      <div className={`grid grid-cols-1 ${canSetup ? 'lg:grid-cols-2' : ''} gap-6`}>
        {canSetup && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Setup Assessment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Plan</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                  >
                    {plans.map(p => <option key={p.id} value={p.id}>{p.application_name}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={generating || !hasCompletedMeeting}
                  className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  title={!hasCompletedMeeting ? 'At least one meeting must be completed to generate questions' : ''}
                >
                  {generating ? 'Generating...' : 'Generate Questions with AI'}
                </button>
              </div>
            </div>

            {questions.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Submit Answer</h3>
                <form onSubmit={handleSubmitAnswer} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stakeholder</label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={selectedStakeholderId}
                      onChange={(e) => setSelectedStakeholderId(e.target.value)}
                    >
                      {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role.replace('_',' ')})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select Question</label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                    >
                      {questions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Your Answer</label>
                    <textarea
                      required
                      rows="4"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                  >
                    {submitting ? 'Scoring...' : 'Submit for AI Scoring'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Assessment Results</h3>
          <div className="space-y-4">
            {results.map(r => (
              <div key={r.id} className="p-4 border rounded-lg bg-gray-50 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-sm text-gray-900">{r.stakeholder_name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${r.ai_score >= 8 ? 'bg-green-100 text-green-800' : r.ai_score >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    Score: {r.ai_score}/10
                  </span>
                </div>
                <p className="text-sm text-gray-800 font-medium mb-1">Q: {r.question}</p>
                <p className="text-sm text-gray-600 mb-3 italic flex-grow">A: {r.answer}</p>
                <div className="bg-white p-3 rounded border text-sm text-gray-700 mt-2">
                  <strong>AI Feedback:</strong> {r.feedback}
                </div>
              </div>
            ))}
            {results.length === 0 && (
              <div className={`text-center text-gray-500 py-8 ${!canSetup ? 'col-span-full' : ''}`}>No results yet for this plan.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;
