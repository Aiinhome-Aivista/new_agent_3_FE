import React, { useState, useEffect } from 'react';
import { getPlans, getPlanSummary, getPlanTopics, updateCompletion, getPlanTopicOptions, resyncPlanTopics } from '../api/api';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

const TrackingPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [summary, setSummary] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topicOptions, setTopicOptions] = useState([]);

  // form state
  const [topicName, setTopicName] = useState('');
  const [completionPct, setCompletionPct] = useState(100);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await getPlans();
        const approvedPlans = res.data.data.filter(p => p.status === 'approved');
        setPlans(approvedPlans);
        if (approvedPlans.length > 0) {
          setSelectedPlanId(approvedPlans[0].id.toString());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchTrackingData();
    }
  }, [selectedPlanId]);

  const fetchTrackingData = async () => {
    try {
      const [sumRes, topRes, optRes] = await Promise.all([
        getPlanSummary(selectedPlanId),
        getPlanTopics(selectedPlanId),
        getPlanTopicOptions(selectedPlanId)
      ]);
      setSummary(sumRes.data.data);
      setTopics(topRes.data.data);
      setTopicOptions(optRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTopic = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const isTopicUpdated = topics.some(t => t.topic === topicName);
    if (isTopicUpdated) {
      setErrorMsg('This topic already updated');
      return;
    }

    try {
      await updateCompletion({
        plan_id: parseInt(selectedPlanId),
        topic: topicName,
        completion_percent: parseInt(completionPct)
      });
      setTopicName('');
      setCompletionPct(100);
      fetchTrackingData();
    } catch (err) {
      alert('Error updating completion');
    }
  };

  const handleResyncTopics = async () => {
    try {
      await resyncPlanTopics(selectedPlanId);
      fetchTrackingData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <Loader />;

  const canManage = user?.role === 'Delivery / Engagement Manager' || user?.role === 'Outgoing SME (Knowledge Giver)';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Completion Tracking</h2>

      {user?.role !== 'PwC Leadership' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan to Track</label>
          <select
            className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.application_name}</option>
            ))}
          </select>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Overall Completion</h3>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full" 
                  style={{ width: `${summary.avg_completion_percent}%` }}
                ></div>
              </div>
              <span className="font-bold text-gray-700">{summary.avg_completion_percent}%</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Overall Attendance Rate</h3>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
                <div 
                  className="bg-green-500 h-4 rounded-full" 
                  style={{ width: `${summary.attendance_rate_percent}%` }}
                ></div>
              </div>
              <span className="font-bold text-gray-700">{summary.attendance_rate_percent}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canManage && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Update Topic Progress</h3>
            <form onSubmit={handleUpdateTopic} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Topic Name</label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={topicName}
                  onChange={(e) => {
                    setTopicName(e.target.value);
                    setErrorMsg('');
                  }}
                >
                  <option value="">-- Select Topic --</option>
                  {topicOptions.map(t => (
                    <option key={t.id} value={t.topic_name}>{t.day_label && t.day_label !== 'General' ? `${t.day_label} — ` : ''}{t.topic_name}</option>
                  ))}
                </select>
                {/* Message hidden as per request */}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Completion %</label>
                <input
                  type="number" min="0" max="100" required disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  value={completionPct}
                  onChange={(e) => setCompletionPct(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700"
              >
                Save Progress
              </button>
            </form>
          </div>
        )}

        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${canManage ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Topics</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topics.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.topic}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="mr-2">{t.completion_percent}%</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${t.completion_percent}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.last_updated).toLocaleDateString()}</td>
                </tr>
              ))}
              {topics.length === 0 && (
                <tr><td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No topics tracked yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
