import React, { useState, useEffect } from 'react';
import { getLeadershipCompletionSummary } from '../api/api';
import Loader from './Loader';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="flex items-center">
            <span className="mr-2 font-medium">{m.overall_completion_percent}%</span>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${m.overall_completion_percent}%` }}></div>
            </div>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="3" className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="pl-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Plans under {m.manager_name}</h4>
              {m.plans && m.plans.length > 0 ? (
                <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg mb-2">
                  <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Plan Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Completion %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {m.plans.map(plan => (
                        <tr key={plan.plan_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{plan.application_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${plan.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {plan.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div className="flex items-center">
                              <span className="mr-2 w-10">{plan.completion_percent}%</span>
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${plan.completion_percent}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

const ManagerWiseCompletionView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await getLeadershipCompletionSummary();
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <Loader />;

  if (!data) {
    return <div className="text-center text-gray-500 mt-10">No data available yet.</div>;
  }

  const { managers = [], combined_average_completion_percent = 0 } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Overall Completion Across All Engagements</h3>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
              <div 
                className="bg-blue-600 h-4 rounded-full" 
                style={{ width: `${combined_average_completion_percent}%` }}
              ></div>
            </div>
            <span className="font-bold text-gray-700">{combined_average_completion_percent}%</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Completion by Manager</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Plans</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {managers.map((m, idx) => (
              <ManagerRow key={idx} m={m} />
            ))}
            {managers.length === 0 && (
              <tr><td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No data available yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerWiseCompletionView;
