import React, { useState, useEffect } from 'react';
import { getPlans, getRisks, detectRisks, escalateRisk } from '../api/api';
import Loader from '../components/Loader';
import { AlertTriangle, AlertCircle, FileText, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ManagerWiseRiskView from '../components/ManagerWiseRiskView';

const RisksPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const res = await getPlans();
        const approvedPlans = res.data.data.filter(p => p.status === 'approved');
        setPlans(approvedPlans);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchRisks();
    }
  }, [selectedPlanId]);

  const fetchRisks = async () => {
    try {
      const res = await getRisks(selectedPlanId);
      setRisks(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDetectRisks = async () => {
    if (!selectedPlanId) return;
    setDetecting(true);
    try {
      await detectRisks(selectedPlanId);
      fetchRisks();
    } catch (err) {
      alert('Error detecting risks');
    } finally {
      setDetecting(false);
    }
  };

  const handleEscalate = async (id) => {
    try {
      await escalateRisk(id);
      fetchRisks();
    } catch (err) {
      alert('Error escalating risk');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <Loader />;

  if (user?.role === 'leadership' || user?.role === 'PwC Leadership') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <AlertTriangle className="mr-2 text-red-500" /> AI Risk Detection & Oversight
        </h2>

        <ManagerWiseRiskView 
          refreshTrigger={detecting} 
          renderHeader={() => (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center h-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan to Analyze</label>
              <div className="flex items-center justify-between w-full">
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md mr-4"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="" disabled>---Select Plan---</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.application_name}</option>
                  ))}
                </select>
                <button
                  onClick={handleDetectRisks}
                  disabled={detecting || !selectedPlanId}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {detecting ? 'Analyzing...' : 'Run AI Risk Detection'}
                </button>
              </div>
            </div>
          )}
        />
      </div>
    );
  }

  const isManager = user?.role === 'Delivery / Engagement Manager';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <AlertTriangle className="mr-2 text-red-500" /> AI Risk Detection
      </h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div className="flex-1 max-w-md mr-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            <option value="" disabled>---Select Plan---</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.application_name}</option>
            ))}
          </select>
        </div>
        {isManager && (
          <button
            onClick={handleDetectRisks}
            disabled={detecting || !selectedPlanId}
            className="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {detecting ? 'Analyzing Data...' : 'Run AI Risk Detection'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {risks.map((risk) => (
          <div key={risk.id} className={`rounded-xl shadow-sm border p-5 ${getSeverityColor(risk.severity)} bg-opacity-50`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white shadow-sm`}>
                {risk.severity}
              </span>
              <span className="text-xs font-medium opacity-75">{new Date(risk.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm font-medium mb-4 leading-relaxed">{risk.description}</p>
            <div className="flex justify-between items-center border-t pt-3 border-black border-opacity-10">
              <span className="text-xs font-semibold capitalize opacity-75">
                Status: {risk.status}
                {risk.jira_ticket_ref && ` | Jira: ${risk.jira_ticket_ref}`}
              </span>
              {risk.status === 'open' && isManager && (
                <button
                  onClick={() => handleEscalate(risk.id)}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded bg-white hover:bg-gray-50 shadow-sm"
                >
                  <AlertCircle size={14} className="mr-1" /> Escalate
                </button>
              )}
            </div>
          </div>
        ))}
        {risks.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No risks detected for this plan. Run AI detection to analyze tracking data, uploaded knowledge documents, and related tickets to flag risks.
          </div>
        )}
      </div>
      </div>
    
  );
};

export default RisksPage;
