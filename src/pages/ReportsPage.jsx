import React, { useState, useEffect } from 'react';
import { getPlans, generateWeeklyReport, generateFinalReport, getReports } from '../api/api';
import Loader from '../components/Loader';
import { FileText, Download } from 'lucide-react';

const ReportsPage = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [plansRes, reportsRes] = await Promise.all([getPlans(), getReports()]);
        const appPlans = plansRes.data.data.filter(p => p.status === 'approved');
        setPlans(appPlans);
        if (appPlans.length > 0) setSelectedPlanId(appPlans[0].id.toString());
        setReports(reportsRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async (type) => {
    if (!selectedPlanId) return;
    setGenerating(true);
    try {
      if (type === 'weekly') {
        await generateWeeklyReport(selectedPlanId);
      } else {
        await generateFinalReport(selectedPlanId);
      }
      fetchReports();
    } catch (err) {
      alert('Error generating report');
    } finally {
      setGenerating(false);
    }
  };

  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Reports Generation</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate Report</h3>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.map(p => <option key={p.id} value={p.id}>{p.application_name}</option>)}
            </select>
          </div>
          <div className="flex gap-4 mt-4 md:mt-6">
            <button
              onClick={() => handleGenerate('weekly')}
              disabled={generating || !selectedPlanId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Weekly Report'}
            </button>
            <button
              onClick={() => handleGenerate('final')}
              disabled={generating || !selectedPlanId}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Final Report'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Generated Reports</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated At</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Download</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${r.report_type === 'final' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {r.report_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                  <FileText size={16} className="mr-2 text-gray-400" />
                  {r.file_path}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.generated_at).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a
                    href={`${baseURL}/reports/download/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                  >
                    <Download size={16} className="mr-1" /> Download
                  </a>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No reports generated yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsPage;
