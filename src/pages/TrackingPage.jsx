import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect } from 'react';
import { getPlans, getPlanSummary, getPlanTopics, updateCompletion, getPlanTopicOptions, resyncPlanTopics } from '../api/api';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import ManagerWiseCompletionView from '../components/ManagerWiseCompletionView';
import { useToast } from '../context/ToastContext';

const TrackingPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [summary, setSummary] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [topicOptions, setTopicOptions] = useState([]);
  
  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // form state
  const [topicName, setTopicName] = useState('');
  const [completionPct, setCompletionPct] = useState(100);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await getPlans({ for_dropdown: 'true' });
        const approvedPlans = res.data.data.filter(p => p.status === 'approved');
        setPlans(approvedPlans);
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
    setLoadingData(true);
    try {
      const [sumRes, topRes, optRes] = await Promise.all([
        getPlanSummary(selectedPlanId),
        getPlanTopics(selectedPlanId),
        getPlanTopicOptions(selectedPlanId)
      ]);
      setSummary(sumRes.data.data);
      setTopics(topRes.data.data);
      setTopicOptions(optRes.data.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleUpdateTopic = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const isTopicUpdated = topics.some(t => t.topic === topicName);
    if (isTopicUpdated) {
      setErrorMsg('This topic already updated');
      return;
    }

    setIsSaving(true);
    try {
      await updateCompletion({
        plan_id: parseInt(selectedPlanId),
        topic: topicName,
        completion_percent: parseInt(completionPct)
      });
      setTopicName('');
      setCompletionPct(100);
      setSuccessMsg('Progress saved successfully!');
      fetchTrackingData();
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      showToast('Error updating completion', 'error');
    } finally {
      setIsSaving(false);
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

  if (user?.role === 'leadership' || user?.role === 'PwC Leadership') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-primary-text">Completion Tracking</h2>
        <ManagerWiseCompletionView />
      </div>
    );
  }

  const canManage = user?.role === 'Delivery / Engagement Manager' || user?.role === 'Outgoing SME (Knowledge Giver)';

  const indexOfLastTopic = currentPage * itemsPerPage;
  const indexOfFirstTopic = indexOfLastTopic - itemsPerPage;
  const currentTopics = topics.slice(indexOfFirstTopic, indexOfLastTopic);
  const totalPages = Math.ceil(topics.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary-text">Completion Tracking</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {user?.role !== 'PwC Leadership' && (
          <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan to Track</label>
            <CustomSelect
              className="block w-full px-3 py-2 border border-light-border rounded-md"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              <option value="" disabled>---Select Plan---</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.application_name}</option>
              ))}
            </CustomSelect>
          </div>
        )}

        {loadingData ? (
          <div className="md:col-span-2 flex justify-center items-center py-6">
            <Loader />
          </div>
        ) : (
          summary && (
            <>
              <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
                <h3 className="text-lg font-semibold text-primary-text mb-2">Overall Completion</h3>
                <div className="flex items-center">
                  <div className="w-full bg-input-background rounded-full h-4 mr-4">
                    <div 
                      className="bg-primary-orange h-4 rounded-full" 
                      style={{ width: `${summary.avg_completion_percent}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-gray-700">{summary.avg_completion_percent}%</span>
                </div>
              </div>
              <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
                <h3 className="text-lg font-semibold text-primary-text mb-2">Overall Attendance Rate</h3>
                <div className="flex items-center">
                  <div className="w-full bg-input-background rounded-full h-4 mr-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full" 
                      style={{ width: `${summary.attendance_rate_percent}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-gray-700">{summary.attendance_rate_percent}%</span>
                </div>
              </div>
            </>
          )
        )}
      </div>

      {!loadingData && (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canManage && (
          <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
            <h3 className="text-lg font-semibold text-primary-text mb-4">Update Topic Progress</h3>
            <form onSubmit={handleUpdateTopic} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm border border-green-100">
                  {successMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Topic Name</label>
                <CustomSelect
                  required
                  className="mt-1 block w-full px-3 py-1.5 border border-light-border rounded-md truncate text-sm"
                  value={topicName}
                  onChange={(e) => {
                    setTopicName(e.target.value);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  title={topicOptions.find(t => t.topic_name === topicName) 
                    ? (() => {
                        const t = topicOptions.find(opt => opt.topic_name === topicName);
                        return t.day_label && t.day_label !== 'General' ? `${t.day_label} — ${t.topic_name}` : t.topic_name;
                      })() 
                    : ''}
                >
                  <option value="">-- Select Topic --</option>
                  {topicOptions
                    .filter(t => {
                      const label = `${t.day_label || ''} ${t.topic_name}`.toLowerCase();
                      return !label.includes('final assessment') &&
                             !label.includes('shadow phase') &&
                             !label.includes('lead phase');
                    })
                    .map(t => {
                    const fullLabel = t.day_label && t.day_label !== 'General' ? `${t.day_label} — ${t.topic_name}` : t.topic_name;
                    let displayLabel = fullLabel;
                    if (displayLabel.length > 60) {
                      displayLabel = displayLabel.substring(0, 57) + '...';
                    }
                    return (
                      <option key={t.id} value={t.topic_name} title={fullLabel}>{displayLabel}</option>
                    );
                  })}
                </CustomSelect>
                {/* Message hidden as per request */}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Completion %</label>
                <input
                  type="number" min="0" max="100" required disabled
                  className="mt-1 block w-full px-3 py-1.5 border border-light-border rounded-md bg-input-background cursor-not-allowed text-sm"
                  value={completionPct}
                  onChange={(e) => setCompletionPct(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full text-white rounded-md py-2 transition-colors ${isSaving ? 'bg-button-orange cursor-not-allowed' : 'bg-primary-orange hover:bg-hover-orange'}`}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Progress'}
              </button>
            </form>
          </div>
        )}

        <div className={`bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 ${canManage ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h3 className="text-lg font-semibold text-primary-text mb-4">Topics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-light-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Completion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-light-background divide-y divide-gray-200">
                {currentTopics.map((t) => {
                  const matchingOption = topicOptions.find(opt => opt.topic_name === t.topic);
                  const dayLabel = matchingOption && matchingOption.day_label && matchingOption.day_label !== 'General' ? matchingOption.day_label : 'N/A';
                  return (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-text">{dayLabel}</td>
                    <td className="px-6 py-4 text-sm font-medium text-primary-text break-words max-w-[200px]">{t.topic}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      <div className="flex items-center min-w-[120px]">
                        <span className="mr-2">{t.completion_percent}%</span>
                        <div className="w-full bg-input-background rounded-full h-2">
                          <div className="bg-primary-orange h-2 rounded-full" style={{ width: `${t.completion_percent}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{new Date(t.last_updated).toLocaleDateString()}</td>
                  </tr>
                )})}
                {topics.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-secondary-text">No topics tracked yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-secondary-text">
                Page {currentPage} of {totalPages}
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border border-light-border bg-white text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border border-light-border bg-white text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default TrackingPage;
