import React, { useState, useEffect } from 'react';
import { getPlans, getStakeholders } from '../api/api';
import Loader from '../components/Loader';
import { Users, FileText, Activity } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({ plans: 0, stakeholders: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, stakeholdersRes] = await Promise.all([
          getPlans(),
          getStakeholders()
        ]);
        setStats({
          plans: plansRes.data.data.length || 0,
          stakeholders: stakeholdersRes.data.data.length || 0
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="p-4 bg-green-50 text-green-600 rounded-lg mr-4">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">System Status</p>
            <h3 className="text-2xl font-bold text-gray-800">Online</h3>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Welcome to Virtual KT Manager</h3>
        <p className="text-gray-600">
          Get started by adding stakeholders, generating an AI-powered Knowledge Transfer plan, and tracking completion. Use the left sidebar to navigate through the modules.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
