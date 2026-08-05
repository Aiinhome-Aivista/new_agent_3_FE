import CustomSelect from './CustomSelect';
import React, { useState, useEffect, useMemo } from 'react';
import { getLeadershipRiskSummary, escalateRisk } from '../api/api';
import Loader from './Loader';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const getSeverityColor = (severity) => {
  switch (severity.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-input-background text-primary-text border-light-border';
    default: return 'bg-input-background text-primary-text';
  }
};

const sortRisks = (risksArray) => {
  const severityOrder = { 
    CRITICAL: 1, critical: 1,
    HIGH: 2, high: 2, 
    MEDIUM: 3, medium: 3, 
    LOW: 4, low: 4 
  };
  
  return [...risksArray].sort((a, b) => {
    // 1. Solved risks go to the bottom
    const aIsSolved = ['solved', 'resolved', 'approved'].includes((a.status || '').toLowerCase());
    const bIsSolved = ['solved', 'resolved', 'approved'].includes((b.status || '').toLowerCase());

    if (aIsSolved !== bIsSolved) {
      return aIsSolved ? 1 : -1;
    }

    // 2. Sort by Date (Latest First)
    const dateA = new Date(a.created_at || a.date || 0);
    const dateB = new Date(b.created_at || b.date || 0);
    const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
    const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();
    
    if (dayB !== dayA) {
      return dayB - dayA;
    }

    // 3. Sort by Severity (HIGH -> MEDIUM -> LOW)
    return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
  });
};

const formatCommentDateTime = (dtStr) => {
  if (!dtStr) return '';
  try {
    const safeStr = typeof dtStr === 'string' ? dtStr.replace(' ', 'T') : dtStr;
    const d = new Date(safeStr);
    if (isNaN(d.getTime())) return dtStr;
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dtStr;
  }
};

const ManagerRow = ({ m }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <React.Fragment>
      <tr onClick={() => setExpanded(!expanded)} className="cursor-pointer hover:bg-light-background transition-colors">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-text flex items-center">
          {expanded ? <ChevronUp size={16} className="mr-2 text-secondary-text" /> : <ChevronDown size={16} className="mr-2 text-secondary-text" />}
          {m.manager_name}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{m.total_plans}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{m.open_risks}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
          <div className="flex space-x-2">
            {m.severity_counts.critical > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">{m.severity_counts.critical} Critical</span>}
            {m.severity_counts.high > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">{m.severity_counts.high} High</span>}
            {m.severity_counts.medium > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">{m.severity_counts.medium} Med</span>}
            {m.severity_counts.low > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-input-background text-primary-text">{m.severity_counts.low} Low</span>}
            {m.severity_counts.in_progress > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-input-background text-hover-orange">{m.severity_counts.in_progress} In Progress</span>}
            {m.severity_counts.deferred > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">{m.severity_counts.deferred} Deferred</span>}
            {m.severity_counts.solved > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{m.severity_counts.solved} Solved</span>}
            {m.total_risks === 0 && <span className="text-secondary-text">No Risks</span>}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="4" className="px-6 py-4 bg-light-background border-t border-gray-100">
            <div className="pl-6">
              <h4 className="text-xs font-semibold text-secondary-text uppercase mb-3">Plans under {m.manager_name}</h4>
              {m.plans && m.plans.length > 0 ? (
                <div className="space-y-4 mb-2">
                  {m.plans.map(plan => (
                    <div key={plan.plan_id} className="bg-light-background p-4 rounded-lg shadow-sm border border-light-border">
                      <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <span className="text-sm font-semibold text-primary-text">{plan.application_name}</span>
                        <div className="flex space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${plan.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {plan.status.toUpperCase()}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-input-background text-primary-text">
                                {plan.open_risks} Risks
                            </span>
                        </div>
                      </div>
                      {plan.risks && plan.risks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {sortRisks(plan.risks).map(risk => {
                            const isSolved = risk.status === 'solved' || risk.status === 'resolved';
                            const isWaiting = risk.status === 'deferred';
                            return (
                            <div key={risk.id} className={`rounded-lg shadow-sm border p-3 ${isSolved ? 'bg-green-100 text-green-800 border-green-200' : isWaiting ? 'bg-purple-100 text-purple-800 border-purple-200' : getSeverityColor(risk.severity)} bg-opacity-30`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-light-background shadow-sm ${isSolved ? 'text-green-700' : isWaiting ? 'text-purple-700' : ''}`}>
                                        {isSolved ? 'SOLVED' : isWaiting ? 'DEFERRED' : risk.severity}
                                    </span>
                                </div>
                                <p className="text-xs font-medium mb-3 leading-relaxed">{risk.description}</p>
                                
                                {risk.assigned_stakeholders && risk.assigned_stakeholders.length > 0 && (
                                    <div className="mb-3">
                                        <span className="text-[10px] font-semibold text-secondary-text uppercase block mb-1">Assigned to:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {risk.assigned_stakeholders.map((name, idx) => (
                                                <span key={idx} className="bg-light-background border border-light-border text-gray-700 text-[9px] px-1.5 py-0.5 rounded shadow-sm font-medium">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {risk.comments && risk.comments.length > 0 && (
                                    <div className="mb-3 bg-light-background bg-opacity-70 rounded p-2 max-h-24 overflow-y-auto border border-gray-100 shadow-inner">
                                        <h4 className="text-[10px] font-bold uppercase text-secondary-text mb-1">Resolution Updates</h4>
                                        <div className="space-y-1">
                                            {risk.comments.map(c => (
                                                <div key={c.id} className="text-[10px] border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <span className="font-semibold text-primary-text">{c.stakeholder_name}:</span>
                                                        {c.created_at && (
                                                            <span className="text-[9px] text-secondary-text font-normal whitespace-nowrap">
                                                                {formatCommentDateTime(c.created_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-700 whitespace-pre-wrap">{c.comment_text}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-center border-t pt-2 border-black border-opacity-5">
                                    <span className={`text-[10px] font-semibold capitalize opacity-75 ${isSolved ? 'text-green-700' : isWaiting ? 'text-purple-700' : ''}`}>
                                        Status: {risk.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-secondary-text italic">No open risks for this plan.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary-text italic">No plans assigned yet.</p>
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
    return <div className="text-center text-secondary-text mt-10">No data available yet.</div>;
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
        <div className="lg:col-span-1 bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center">
          <h3 className="text-lg font-semibold text-center text-primary-text mb-2">Total Open Risks Across All Engagements</h3>
          <span className="text-4xl font-bold text-red-600">{total_open_risks}</span>
        </div>
        
        <div className="lg:col-span-2 h-full">
          {renderHeader && renderHeader()}
        </div>
      </div>

      <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-primary-text mb-2 md:mb-0">Risk Summary by Manager</h3>
          <div className="w-full md:w-64">
            <CustomSelect
              className="block w-full px-3 py-2 border border-light-border rounded-md text-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="">All Plans</option>
              {allPlanNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </CustomSelect>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-light-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">Manager</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">Total Plans</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">Total Risks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">Severity Breakdown</th>
            </tr>
          </thead>
          <tbody className="bg-light-background divide-y divide-gray-200">
            {filteredManagers.map((m, idx) => (
              <ManagerRow key={idx} m={m} />
            ))}
            {filteredManagers.length === 0 && (
              <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-secondary-text">No data available yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerWiseRiskView;
