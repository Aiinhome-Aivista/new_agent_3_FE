import React, { useState, useEffect } from 'react';
import { getPlans, getStakeholders, getMeetings, getRisks, getLeadershipCompletionSummary, getLeadershipGiverSummary } from '../api/api';
import Loader from '../components/Loader';
import { Users, FileText, Calendar, AlertTriangle, Clock, BarChart2, Award, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ 
    plans: 0, 
    stakeholders: 0, 
    upcomingMeetings: [], 
    activeRisks: [],
    plansMap: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPerfPlan, setSelectedPerfPlan] = useState('');
  const [rankingTab, setRankingTab] = useState('receivers');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, stakeholdersRes, meetingsRes, risksRes] = await Promise.all([
          getPlans(),
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
        const plansMap = {};
        plansData.forEach(p => {
          plansMap[p.id] = p.application_name;
        });

        const allMeetings = meetingsRes.data.data || [];
        const allRisks = risksRes.data.data || [];

        const now = new Date();
        const upcoming = allMeetings
          .filter(m => new Date(m.scheduled_at) > now && m.status?.toLowerCase() !== 'completed')
          .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

        const active = allRisks.filter(r => ['open', 'in_progress', 'in progress', 'in-progress'].includes(r.status?.toLowerCase()));

        setStats({
          plans: plansData.length,
          stakeholders: stakeholdersRes.data.data.length || 0,
          upcomingMeetings: upcoming,
          activeRisks: active,
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
  }, []);

  const allPerfPlans = React.useMemo(() => {
    if (!stats.performanceData) return [];
    return stats.performanceData.managers
      .flatMap(m => m.plans || [])
      .filter(p => p.status && !['draft', 'waiting_for_approval'].includes(p.status.toLowerCase()))
      .sort((a, b) => b.wmo_score - a.wmo_score);
  }, [stats.performanceData]);

  React.useEffect(() => {
    if (selectedPerfPlan === '' && allPerfPlans.length > 0) {
      setSelectedPerfPlan(allPerfPlans[0].plan_id.toString());
    }
  }, [allPerfPlans, selectedPerfPlan]);

  const receiverRankings = React.useMemo(() => {
    const plans = selectedPerfPlan ? allPerfPlans.filter(p => p.plan_id.toString() === selectedPerfPlan.toString()) : allPerfPlans;
    const receiverMap = {};
    plans.forEach(p => {
        const receivers = p.receiver_name ? p.receiver_name.split(',').map(s => s.trim()) : ['Unassigned'];
        receivers.forEach(r => {
            if (!receiverMap[r]) receiverMap[r] = { name: r, plans: [], totalWmo: 0, totalComp: 0, totalAtt: 0 };
            receiverMap[r].plans.push(p);
            receiverMap[r].totalWmo += p.wmo_score;
            receiverMap[r].totalComp += p.completion_percent;
            receiverMap[r].totalAtt += p.attendance_percent;
        });
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
  }, [allPerfPlans, selectedPerfPlan]);

  const displayedPerf = React.useMemo(() => {
    if (!stats.performanceData) return null;
    if (selectedPerfPlan === '') {
      return {
        completion: stats.performanceData.combined_average_completion_percent,
        attendance: stats.performanceData.combined_average_attendance_percent,
        wmo: stats.performanceData.combined_average_wmo_score,
        title: 'Overall Performance'
      };
    } else {
      const plan = allPerfPlans.find(p => p.plan_id.toString() === selectedPerfPlan.toString());
      if (plan) {
        return {
          completion: plan.completion_percent,
          attendance: plan.attendance_percent,
          wmo: plan.wmo_score,
          title: plan.application_name
        };
      }
    }
    return null;
  }, [stats.performanceData, selectedPerfPlan, allPerfPlans]);

  const displayedGivers = React.useMemo(() => {
    if (!stats.giverData || !stats.giverData.knowledge_givers) return [];
    if (!selectedPerfPlan) return stats.giverData.knowledge_givers;
    
    const filtered = [];
    stats.giverData.knowledge_givers.forEach(g => {
        const planData = g.plans.find(p => p.plan_id.toString() === selectedPerfPlan.toString());
        if (planData) {
            filtered.push({
                ...g,
                total_feedbacks: planData.total_feedbacks,
                average_rating: planData.average_rating
            });
        }
    });
    return filtered.sort((a, b) => b.average_rating - a.average_rating);
  }, [stats.giverData, selectedPerfPlan]);

  if (loading) return <Loader />;

  const highPriorityRisks = stats.activeRisks.filter(r => r.severity?.toLowerCase() === 'high' || r.severity?.toLowerCase() === 'critical');
  const isKnowledgeReceiver = user?.role === 'Incoming Team Member (Knowledge Receiver)';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}

      {/* Top Stat Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${!isKnowledgeReceiver ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-lg mr-4">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total KT Plans</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.plans}</h3>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-lg mr-4">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Stakeholders</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.stakeholders}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-lg mr-4">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Upcoming Meetings</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.upcomingMeetings.length}</h3>
          </div>
        </div>

        {!isKnowledgeReceiver && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-4 bg-red-50 text-red-600 rounded-lg mr-4">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Risks</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.activeRisks.length}</h3>
            </div>
          </div>
        )}
      </div>

      {/* Performance & Ranking Section */}
      {!isKnowledgeReceiver && (stats.performanceData || stats.giverData) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <BarChart2 className="mr-2 text-indigo-500" /> KT Performance & Ranking
            </h3>
            
            {/* Tabs */}
            <div className="flex space-x-1 mt-4 md:mt-0 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setRankingTab('receivers')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${rankingTab === 'receivers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Knowledge Receivers
              </button>
              <button
                onClick={() => setRankingTab('givers')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${rankingTab === 'givers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Knowledge Givers
              </button>
            </div>
          </div>

          <div className="flex justify-end mb-6">
            <div className="w-full md:w-64">
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500"
                value={selectedPerfPlan}
                onChange={(e) => setSelectedPerfPlan(e.target.value)}
              >
                {allPerfPlans.map((p, idx) => (
                  <option key={p.plan_id} value={p.plan_id}>#{idx + 1} - {p.application_name}</option>
                ))}
              </select>
            </div>
          </div>

          {rankingTab === 'receivers' && stats.performanceData && displayedPerf && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-indigo-50 rounded-lg p-4 flex flex-col justify-center items-center border border-indigo-100">
                  <span className="text-indigo-800 text-sm font-medium mb-1">Completion (Weight 80%)</span>
                  <span className="text-3xl font-bold text-indigo-600">{displayedPerf.completion}%</span>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 flex flex-col justify-center items-center border border-blue-100">
                  <span className="text-blue-800 text-sm font-medium mb-1">Attendance (Weight 20%)</span>
                  <span className="text-3xl font-bold text-blue-600">{displayedPerf.attendance}%</span>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 flex flex-col justify-center items-center border border-emerald-100 shadow-sm">
                  <span className="text-emerald-800 text-sm font-medium mb-1 flex items-center">
                    <Award size={16} className="mr-1" /> W.M.O Score
                  </span>
                  <span className="text-3xl font-bold text-emerald-600">{displayedPerf.wmo}</span>
                </div>
              </div>

              <div>
                  <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Receiver Rankings (by W.M.O)</h4>
                  <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">WMO Score</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {receiverRankings.map((p, idx) => (
                          <tr key={idx} className={idx < 3 ? 'bg-yellow-50 bg-opacity-30' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              #{idx + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {p.receiver_name}
                              <div className="text-xs text-gray-400 mt-0.5">{p.application_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {p.completion_percent}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {p.attendance_percent}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                              {p.wmo_score}
                            </td>
                          </tr>
                        ))}
                        {receiverRankings.length === 0 && (
                          <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No plans available for ranking.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </>
          )}

          {rankingTab === 'givers' && stats.giverData && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Knowledge Giver Rankings (by Star Rating)</h4>
              <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giver Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback Count</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedGivers.map((g, idx) => (
                      <tr key={idx} className={idx < 3 ? 'bg-yellow-50 bg-opacity-30' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          #{idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {g.giver_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {g.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {g.total_feedbacks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-500 flex items-center">
                          <Star size={16} className="mr-1 fill-current" /> {g.average_rating}
                        </td>
                      </tr>
                    ))}
                    {displayedGivers.length === 0 && (
                      <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No knowledge giver ratings available.</td></tr>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Upcoming Sessions</h3>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {stats.upcomingMeetings.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming meetings scheduled.</p>
            ) : (
              stats.upcomingMeetings.map(meeting => (
                <div key={meeting.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start">
                    <div className="mt-1 mr-3 p-2 bg-blue-50 text-blue-600 rounded-full">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-800">{meeting.title || 'KT Session'}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(meeting.scheduled_at).toLocaleString(undefined, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {stats.plansMap && stats.plansMap[meeting.plan_id] && (
                    <div className="ml-4 flex-shrink-0 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 line-clamp-1 max-w-[150px]" title={stats.plansMap[meeting.plan_id]}>
                        {stats.plansMap[meeting.plan_id]}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">High Priority and Critical Risks</h3>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {highPriorityRisks.length === 0 ? (
              <p className="text-sm text-gray-500">No high priority risks detected. You're on track!</p>
            ) : (
              highPriorityRisks.map(risk => (
                <div key={risk.id} className="flex items-start p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`mt-1 mr-3 p-2 rounded-full ${risk.severity === 'high' || risk.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">{risk.description}</h4>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${risk.severity === 'high' || risk.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        Severity: {risk.severity || 'Unknown'}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Status: {risk.status || 'Open'}
                        {risk.jira_ticket_ref && ` | Jira: ${risk.jira_ticket_ref}`}
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
