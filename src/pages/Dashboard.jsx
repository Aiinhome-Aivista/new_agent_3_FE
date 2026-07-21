import React, { useState, useEffect } from 'react';
import { getPlans, getStakeholders, getMeetings, getRisks } from '../api/api';
import Loader from '../components/Loader';
import { Users, FileText, Calendar, AlertTriangle, Clock } from 'lucide-react';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, stakeholdersRes, meetingsRes, risksRes] = await Promise.all([
          getPlans(),
          getStakeholders(),
          getMeetings(),
          getRisks()
        ]);

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

        const active = allRisks.filter(r => r.status?.toLowerCase() === 'open');

        setStats({
          plans: plansData.length,
          stakeholders: stakeholdersRes.data.data.length || 0,
          upcomingMeetings: upcoming,
          activeRisks: active,
          plansMap: plansMap
        });
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
