import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect } from 'react';
import { getPlans, getProjects, getStakeholders, getMeetings, getRisks, getLeadershipCompletionSummary, getLeadershipGiverSummary } from '../api/api';
import Loader from '../components/Loader';
import { Users, FileText, Calendar, AlertTriangle, Clock, BarChart2, Award, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [rawData, setRawData] = useState({
    projects: [],
    plans: [],
    stakeholders: [],
    meetings: [],
    risks: [],
    plansMap: {},
    performanceData: null,
    giverData: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [globalSelectedProject, setGlobalSelectedProject] = useState('All');
  const [rankingTab, setRankingTab] = useState('receivers');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, projectsRes, stakeholdersRes, meetingsRes, risksRes] = await Promise.all([
          getPlans({ for_dropdown: 'true' }),
          getProjects(),
          getStakeholders(),
          getMeetings(),
          getRisks()
        ]);

        let perfData = null;
        let giverData = null;
        if (user?.role === 'leadership' || user?.role === 'PwC Leadership' || user?.role === 'Delivery / Engagement Manager') {
          try {
            const [perfRes, giverRes] = await Promise.all([
              getLeadershipCompletionSummary(),
              getLeadershipGiverSummary()
            ]);
            perfData = perfRes.data.data;
            giverData = giverRes.data.data;
          } catch (e) { console.error(e); }
        }

        const plansData = plansRes.data.data || [];
        let projectsData = projectsRes.data.data || [];

        const isKnowledgeReceiverUser = user?.role === 'Incoming Team Member (Knowledge Receiver)' ||
          user?.role?.toLowerCase().includes('receiver') ||
          user?.role?.toLowerCase().includes('incoming');

        if (isKnowledgeReceiverUser) {
          const assignedProjectIds = new Set(
            plansData.map(p => p.project_id ? String(p.project_id) : null).filter(Boolean)
          );
          projectsData = projectsData.filter(p => assignedProjectIds.has(String(p.id)));
        }

        const plansMap = {};
        plansData.forEach(p => {
          plansMap[p.id] = p.application_name;
        });

        const allMeetings = meetingsRes.data.data || [];
        const allRisks = risksRes.data.data || [];

        const approvedPlans = plansData.filter(p => p.status && p.status.toLowerCase() === 'approved');

        setRawData({
          projects: projectsData,
          plans: approvedPlans,
          stakeholders: stakeholdersRes.data.data || [],
          meetings: allMeetings,
          risks: allRisks,
          plansMap: plansMap,
          performanceData: perfData,
          giverData: giverData
        });
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const computedStats = React.useMemo(() => {
    const { plans, stakeholders, meetings, risks, plansMap } = rawData;
    
    const selectedProjectId = globalSelectedProject === 'All' ? null : globalSelectedProject;

    const filteredPlans = selectedProjectId ? plans.filter(p => p.project_id && p.project_id.toString() === selectedProjectId.toString()) : plans;
    const planCount = filteredPlans.length;
    const validPlanIds = new Set(filteredPlans.map(p => p.id));

    const now = new Date();
    const upcomingMeetings = meetings
      .filter(m => plansMap[m.plan_id])
      .filter(m => validPlanIds.has(m.plan_id))
      .filter(m => new Date(m.scheduled_at) > now && m.status?.toLowerCase() !== 'completed')
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

    const activeRisks = risks
      .filter(r => plansMap[r.plan_id])
      .filter(r => validPlanIds.has(r.plan_id))
      .filter(r => ['open', 'in_progress', 'in progress', 'in-progress'].includes(r.status?.toLowerCase()));

    return {
      filteredPlans,
      validPlanIds,
      plansCount: planCount,
      stakeholdersCount: stakeholders.length,
      upcomingMeetings,
      activeRisks,
    };
  }, [rawData, globalSelectedProject]);

  const allPerfPlans = React.useMemo(() => {
    if (!rawData.performanceData) return [];
    return rawData.performanceData.managers
      .flatMap(m => m.plans || [])
      .filter(p => p.status && !['draft', 'waiting_for_approval'].includes(p.status.toLowerCase()))
      .filter(p => rawData.plansMap[p.plan_id])
      .filter(p => computedStats.validPlanIds.has(p.plan_id))
      .sort((a, b) => b.wmo_score - a.wmo_score);
  }, [rawData.performanceData, rawData.plansMap, computedStats.validPlanIds]);

  const receiverRankings = React.useMemo(() => {
    const plans = allPerfPlans;
    const receiverMap = {};
    plans.forEach(p => {
      if (p.receivers && p.receivers.length > 0) {
        p.receivers.forEach(r => {
          if (!receiverMap[r.name]) receiverMap[r.name] = { name: r.name, plans: [], totalWmo: 0, totalComp: 0, totalAtt: 0 };
          receiverMap[r.name].plans.push(p);
          receiverMap[r.name].totalWmo += r.wmo_score;
          receiverMap[r.name].totalComp += r.completion_percent;
          receiverMap[r.name].totalAtt += r.attendance_percent;
        });
      } else {
        const receivers = p.receiver_name ? p.receiver_name.split(',').map(s => s.trim()) : ['Unassigned'];
        receivers.forEach(r => {
          if (!receiverMap[r]) receiverMap[r] = { name: r, plans: [], totalWmo: 0, totalComp: 0, totalAtt: 0 };
          receiverMap[r].plans.push(p);
          receiverMap[r].totalWmo += p.wmo_score;
          receiverMap[r].totalComp += p.completion_percent;
          receiverMap[r].totalAtt += p.attendance_percent;
        });
      }
    });

    const result = Object.values(receiverMap).map(r => {
      const count = r.plans.length;
      return {
        receiver_name: r.name,
        completion_percent: Math.round(r.totalComp / count),
        attendance_percent: Math.round(r.totalAtt / count),
        wmo_score: Math.round(r.totalWmo / count),
        application_name: r.plans.map(p => p.application_name).join(', ')
      };
    });

    return result.sort((a, b) => b.wmo_score - a.wmo_score);
  }, [allPerfPlans]);

  const displayedPerf = React.useMemo(() => {
    if (!rawData.performanceData) return null;
    if (allPerfPlans.length === 0) {
      return { completion: 0, attendance: 0, wmo: 0, title: 'Project Performance' };
    }
    let sumComp = 0, sumAtt = 0, sumWmo = 0;
    allPerfPlans.forEach(p => {
      sumComp += p.completion_percent || 0;
      sumAtt += p.attendance_percent || 0;
      sumWmo += p.wmo_score || 0;
    });
    return {
      completion: Math.round(sumComp / allPerfPlans.length),
      attendance: Math.round(sumAtt / allPerfPlans.length),
      wmo: Math.round(sumWmo / allPerfPlans.length),
      title: 'Project Performance'
    };
  }, [rawData.performanceData, allPerfPlans]);

  const displayedGivers = React.useMemo(() => {
    if (!rawData.giverData || !rawData.giverData.knowledge_givers) return [];
    
    const filteredGivers = [];
    rawData.giverData.knowledge_givers.forEach(g => {
      const validPlans = (g.plans || []).filter(p => rawData.plansMap[p.plan_id] && computedStats.validPlanIds.has(p.plan_id));
      if (validPlans.length > 0) {
        let totalScore = 0;
        let totalFeedbacks = 0;
        validPlans.forEach(p => {
           totalScore += (p.average_rating * p.total_feedbacks);
           totalFeedbacks += p.total_feedbacks;
        });
        const recalculatedRating = totalFeedbacks > 0 ? (totalScore / totalFeedbacks) : 0;
        
        filteredGivers.push({
          ...g,
          plans: validPlans,
          total_feedbacks: totalFeedbacks,
          average_rating: recalculatedRating
        });
      }
    });

    return filteredGivers.sort((a, b) => b.average_rating - a.average_rating);
  }, [rawData.giverData, rawData.plansMap, computedStats.validPlanIds]);

  if (loading) return <Loader />;

  const highPriorityRisks = computedStats.activeRisks.filter(r => r.severity?.toLowerCase() === 'high' || r.severity?.toLowerCase() === 'critical');
  const isKnowledgeReceiver = user?.role === 'Incoming Team Member (Knowledge Receiver)';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-primary-text">Dashboard</h2>
        
        <div className="flex items-center space-x-2 bg-light-background px-4 py-2 rounded-lg shadow-sm border border-light-border w-full md:w-auto xl:w-[400px]">
          <span className="text-sm font-medium text-secondary-text whitespace-nowrap">Project:</span>
          <CustomSelect 
            value={globalSelectedProject}
            onChange={(e) => setGlobalSelectedProject(e.target.value)}
            className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer text-primary-text font-semibold outline-none py-1 pl-1 w-full truncate"
          >
            <option value="All">All Projects</option>
            {rawData.projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </CustomSelect>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}

      {/* Top Stat Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${!isKnowledgeReceiver ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-input-background text-primary-orange rounded-lg mr-4">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-text">Total Plans</p>
            <h3 className="text-2xl font-bold text-primary-text">{computedStats.plansCount}</h3>
          </div>
        </div>

        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-input-background text-primary-orange rounded-lg mr-4">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-text">Stakeholders</p>
            <h3 className="text-2xl font-bold text-primary-text">{computedStats.stakeholdersCount}</h3>
          </div>
        </div>

        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-lg mr-4">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-text">Upcoming Meetings</p>
            <h3 className="text-2xl font-bold text-primary-text">{computedStats.upcomingMeetings.length}</h3>
          </div>
        </div>

        {!isKnowledgeReceiver && (
          <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-4 bg-red-50 text-red-600 rounded-lg mr-4">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-text">Active Risks</p>
              <h3 className="text-2xl font-bold text-primary-text">{computedStats.activeRisks.length}</h3>
            </div>
          </div>
        )}
      </div>

      {/* Performance & Ranking Section */}
      {!isKnowledgeReceiver && (rawData.performanceData || rawData.giverData) && (
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-primary-text flex items-center">
              <BarChart2 className="mr-2 text-primary-orange" /> KT Performance & Ranking
            </h3>

            {/* Tabs */}
            <div className="flex space-x-1 mt-4 md:mt-0 bg-input-background p-1 rounded-lg">
              <button
                onClick={() => setRankingTab('receivers')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${rankingTab === 'receivers' ? 'bg-light-background text-primary-orange shadow-sm' : 'text-secondary-text hover:text-gray-700'}`}
              >
                Knowledge Receivers
              </button>
              <button
                onClick={() => setRankingTab('givers')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${rankingTab === 'givers' ? 'bg-light-background text-primary-orange shadow-sm' : 'text-secondary-text hover:text-gray-700'}`}
              >
                Knowledge Givers
              </button>
            </div>
          </div>

          {rankingTab === 'receivers' && rawData.performanceData && displayedPerf && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-input-background rounded-lg p-4 flex flex-col justify-center items-center">
                  <span className="text-hover-orange text-sm font-medium mb-1">Assessment (Weight 80%)</span>
                  <span className="text-3xl font-bold text-primary-orange">{Math.round(displayedPerf.completion)}%</span>
                </div>
                <div className="bg-input-background rounded-lg p-4 flex flex-col justify-center items-center border border-input-background">
                  <span className="text-hover-orange text-sm font-medium mb-1">Attendance (Weight 20%)</span>
                  <span className="text-3xl font-bold text-primary-orange">{Math.round(displayedPerf.attendance)}%</span>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 flex flex-col justify-center items-center border border-emerald-100 shadow-sm">
                  <span className="text-emerald-800 text-sm font-medium mb-1 flex items-center">
                    <Award size={16} className="mr-1" /> Weightage Score
                  </span>
                  <span className="text-3xl font-bold text-emerald-600">{Math.round(displayedPerf.wmo)}%</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Receiver Rankings (by W.M.O)</h4>
                <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-light-background">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Receiver Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Assessment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Attendance</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Weightage Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-light-background divide-y divide-gray-200">
                      {receiverRankings.map((p, idx) => (
                        <tr key={idx} className={idx < 3 ? 'bg-yellow-50 bg-opacity-30' : 'hover:bg-light-background'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-text">
                            #{idx + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-text">
                            {p.receiver_name}
                            <div className="text-xs text-secondary-text mt-0.5">{p.application_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                            {p.completion_percent}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                            {p.attendance_percent}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                            {p.wmo_score}%
                          </td>
                        </tr>
                      ))}
                      {receiverRankings.length === 0 && (
                        <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-secondary-text">No plans available for ranking.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {rankingTab === 'givers' && rawData.giverData && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Knowledge Giver Rankings (by Star Rating)</h4>
              <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-light-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Giver Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Feedback Count</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody className="bg-light-background divide-y divide-gray-200">
                    {displayedGivers.map((g, idx) => (
                      <tr key={idx} className={idx < 3 ? 'bg-yellow-50 bg-opacity-30' : 'hover:bg-light-background'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-text">
                          #{idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-text">
                          {g.giver_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                          {g.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                          {g.total_feedbacks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-500 flex items-center">
                          <Star size={16} className="mr-1 fill-current" /> {g.average_rating}
                        </td>
                      </tr>
                    ))}
                    {displayedGivers.length === 0 && (
                      <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-secondary-text">No knowledge giver ratings available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Dynamic Sections */}
      <div className={`grid grid-cols-1 ${!isKnowledgeReceiver ? 'lg:grid-cols-2' : ''} gap-6 mt-8`}>
        {/* Upcoming Meetings Panel */}
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary-text">Upcoming Sessions</h3>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {computedStats.upcomingMeetings.length === 0 ? (
              <p className="text-sm text-secondary-text">No upcoming meetings scheduled.</p>
            ) : (
              computedStats.upcomingMeetings.map(meeting => (
                <div key={meeting.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-lg hover:bg-light-background transition-colors">
                  <div className="flex items-start">
                    <div className="mt-1 mr-3 p-2 bg-input-background text-primary-orange rounded-full">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-primary-text">{meeting.title || 'KT Session'}</h4>
                      <p className="text-xs text-secondary-text mt-1">
                        {new Date(meeting.scheduled_at).toLocaleString(undefined, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {rawData.plansMap && rawData.plansMap[meeting.plan_id] && (
                    <div className="ml-4 flex-shrink-0 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-input-background text-hover-orange border border-orange-border line-clamp-1 max-w-[150px]" title={rawData.plansMap[meeting.plan_id]}>
                        {rawData.plansMap[meeting.plan_id]}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Risks Panel */}
        {!isKnowledgeReceiver && (
          <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-text">High Priority and Critical Risks</h3>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
              {highPriorityRisks.length === 0 ? (
                <p className="text-sm text-secondary-text">No high priority risks detected. You're on track!</p>
              ) : (
                highPriorityRisks.map(risk => (
                  <div key={risk.id} className="flex items-start p-3 border border-gray-100 rounded-lg hover:bg-light-background transition-colors">
                    <div className={`mt-1 mr-3 p-2 rounded-full ${risk.severity === 'high' || risk.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-primary-text">{risk.description}</h4>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${risk.severity === 'high' || risk.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          Severity: {risk.severity || 'Unknown'}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-input-background text-secondary-text">
                          Status: {risk.status || 'Open'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
