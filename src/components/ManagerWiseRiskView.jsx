import React, { useState, useEffect, useMemo } from 'react';
import { getLeadershipRiskSummary, escalateRisk } from '../api/api';
import Loader from './Loader';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const getSeverityColor = (severity) => {
  switch (severity.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const ManagerRow = ({ m }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <React.Fragment>
      <tr onClick={() => setExpanded(!expanded)} className="cursor-pointer hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
          {expanded ? <ChevronUp size={16} className="mr-2 text-gray-500" /> : <ChevronDown size={16} className="mr-2 text-gray-500" />}
          {m.manager_name}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.total_plans}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.open_risks}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="flex space-x-2">
            {m.severity_counts.critical > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">{m.severity_counts.critical} Critical</span>}
            {m.severity_counts.high > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">{m.severity_counts.high} High</span>}
            {m.severity_counts.medium > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">{m.severity_counts.medium} Med</span>}
            {m.severity_counts.low > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{m.severity_counts.low} Low</span>}
            {m.severity_counts.in_progress > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{m.severity_counts.in_progress} In Progress</span>}
            {m.severity_counts.solved > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{m.severity_counts.solved} Solved</span>}
            {m.total_risks === 0 && <span className="text-gray-400">No Risks</span>}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="4" className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="pl-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Plans under {m.manager_name}</h4>
              {m.plans && m.plans.length > 0 ? (
                <div className="space-y-4 mb-2">
                  {m.plans.map(plan => (
                    <div key={plan.plan_id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <span className="text-sm font-semibold text-gray-900">{plan.application_name}</span>
                        <div className="flex space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${plan.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {plan.status.toUpperCase()}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {plan.open_risks} Risks
                            </span>
                        </div>
                      </div>
                      {plan.risks && plan.risks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {plan.risks.map(risk => {
                            const isSolved = risk.status === 'solved' || risk.status === 'resolved';
                            return (
                            <div key={risk.id} className={`rounded-lg shadow-sm border p-3 ${isSolved ? 'bg-green-100 text-green-800 border-green-200' : getSeverityColor(risk.severity)} bg-opacity-30`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white shadow-sm ${isSolved ? 'text-green-700' : ''}`}>
                                        {isSolved ? 'SOLVED' : risk.severity}
                                    </span>
                                </div>
                                <p className="text-xs font-medium mb-3 leading-relaxed">{risk.description}</p>
                                
                                {risk.assigned_stakeholders && risk.assigned_stakeholders.length > 0 && (
                                    <div className="mb-3">
                                        <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Assigned to:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {risk.assigned_stakeholders.map((name, idx) => (
                                                <span key={idx} className="bg-white border border-gray-200 text-gray-700 text-[9px] px-1.5 py-0.5 rounded shadow-sm font-medium">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {risk.comments && risk.comments.length > 0 && (
                                    <div className="mb-3 bg-white bg-opacity-70 rounded p-2 max-h-24 overflow-y-auto border border-gray-100 shadow-inner">
                                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-1">Resolution Updates</h4>
                                        <div className="space-y-1">
                                            {risk.comments.map(c => (
                                                <div key={c.id} className="text-[10px]">
                                                    <span className="font-semibold text-gray-800">{c.stakeholder_name}: </span>
                                                    <span className="text-gray-700">{c.comment_text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-center border-t pt-2 border-black border-opacity-5">
                                    <span className={`text-[10px] font-semibold capitalize opacity-75 ${isSolved ? 'text-green-700' : ''}`}>
                                        Status: {risk.status}
                                    </span>
                                </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No open risks for this plan.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No plans assigned yet.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

const ManagerWiseRiskView = ({ refreshTrigger, renderHeader }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState('');

  const fetchSummary = async () => {
    try {
      const res = await getLeadershipRiskSummary();
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [refreshTrigger]);

  const allPlanNames = useMemo(() => {
    if (!data || !data.managers) return [];
    return Array.from(new Set(
      data.managers.filter(m => m.manager_name !== 'Unassigned').flatMap(m => m.plans || []).map(p => p.application_name)
    )).sort();
  }, [data]);

  const handleEscalate = async (id) => {
    try {
      await escalateRisk(id);
      fetchSummary(); // Refresh data after escalation
    } catch (err) {
      alert('Error escalating risk');
    }
  };

  if (loading) return <Loader />;

  if (!data) {
    return <div className="text-center text-gray-500 mt-10">No data available yet.</div>;
  }

  const { managers = [], total_open_risks = 0 } = data;
  let filteredManagers = managers.filter(m => m.manager_name !== 'Unassigned');

  if (planFilter !== '') {
    filteredManagers = filteredManagers.map(m => {
      const matchingPlans = m.plans ? m.plans.filter(p => p.application_name === planFilter) : [];
      
      let open_risks = 0;
      let total_risks = 0;
      let severity_counts = { critical: 0, high: 0, medium: 0, low: 0, in_progress: 0, solved: 0 };
      
      matchingPlans.forEach(p => {
         open_risks += p.open_risks || 0;
         if (p.risks) {
            p.risks.forEach(r => {
                total_risks++;
                const s = r.severity?.toLowerCase();
                const st = r.status?.toLowerCase();
                if (st === 'solved' || st === 'resolved') {
                    severity_counts.solved++;
                } else if (st === 'in_progress' || st === 'in progress' || st === 'in-progress') {
                    severity_counts.in_progress++;
                } else {
                    if (s === 'critical') severity_counts.critical++;
                    else if (s === 'high') severity_counts.high++;
                    else if (s === 'medium') severity_counts.medium++;
                    else if (s === 'low') severity_counts.low++;
                }
            });
         }
      });
      
      return {
        ...m,
        plans: matchingPlans,
        total_plans: matchingPlans.length,
        open_risks,
        total_risks,
        severity_counts
      };
    }).filter(m => m.plans.length > 0);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center">
          <h3 className="text-lg font-semibold text-center text-gray-800 mb-2">Total Open Risks Across All Engagements</h3>
          <span className="text-4xl font-bold text-red-600">{total_open_risks}</span>
        </div>
        
        <div className="lg:col-span-2 h-full">
          {renderHeader && renderHeader()}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 md:mb-0">Risk Summary by Manager</h3>
          <div className="w-full md:w-64">
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="">All Plans</option>
              {allPlanNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Plans</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Risks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity Breakdown</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredManagers.map((m, idx) => (
              <ManagerRow key={idx} m={m} />
            ))}
            {filteredManagers.length === 0 && (
              <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No data available yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerWiseRiskView;
