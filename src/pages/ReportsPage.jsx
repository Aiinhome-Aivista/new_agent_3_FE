import React, { useState, useEffect } from 'react';
import { getPlans, generateWeeklyReport, generateFinalReport, getReports, getPlanSummary, viewReport } from '../api/api';
import Loader from '../components/Loader';
import { FileText, Download, ChevronLeft, ChevronRight, Eye, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ReportsPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState(null);
  const [isAllTopicsCovered, setIsAllTopicsCovered] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [plansRes, reportsRes] = await Promise.all([getPlans(), getReports()]);
        const allPlansList = plansRes.data.data || [];
        setAllPlans(allPlansList);
        const appPlans = allPlansList.filter(p => p.status === 'approved');
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

  const getPlanName = (planId) => {
    const plan = allPlans.find(p => p.id.toString() === planId.toString());
    return plan ? plan.application_name : `Plan ${planId}`;
  };

  useEffect(() => {
    if (!selectedPlanId) {
      setIsAllTopicsCovered(false);
      return;
    }
    const checkCoverage = async () => {
      try {
        const res = await getPlanSummary(selectedPlanId);
        if (res.data && res.data.success) {
          setIsAllTopicsCovered(res.data.data.avg_completion_percent === 100);
        } else {
          setIsAllTopicsCovered(false);
        }
      } catch (err) {
        console.error("Error fetching plan summary:", err);
        setIsAllTopicsCovered(false);
      }
    };
    checkCoverage();
  }, [selectedPlanId]);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewReport = async (reportId) => {
    setViewLoading(true);
    try {
      const res = await viewReport(reportId);
      if (res.data && res.data.success) {
        setViewingReport(res.data.data);
      } else {
        alert(res.data.message || 'Failed to fetch report content');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching report content');
    } finally {
      setViewLoading(false);
    }
  };

  const handleGenerate = async (type) => {
    if (!selectedPlanId) return;
    setGeneratingType(type);
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
      setGeneratingType(null);
    }
  };

  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  if (loading) return <Loader />;

  const itemsPerPage = 5;
  const indexOfLastReport = currentPage * itemsPerPage;
  const indexOfFirstReport = indexOfLastReport - itemsPerPage;
  const currentReports = reports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(reports.length / itemsPerPage);

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
            {user?.role === 'Delivery / Engagement Manager' && (
              <button
                onClick={() => handleGenerate('weekly')}
                disabled={generatingType !== null || !selectedPlanId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingType === 'weekly' ? 'Generating...' : 'Generate Weekly Report'}
              </button>
            )}
            {user?.role === 'PwC Leadership' && (
              <div className="flex flex-col items-start gap-1">
                <button
                  onClick={() => handleGenerate('final')}
                  disabled={generatingType !== null || !selectedPlanId /* || !isAllTopicsCovered (Bypassed for testing) */}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {generatingType === 'final' ? 'Generating...' : 'Generate Final Report'}
                </button>
                {/* {!isAllTopicsCovered && selectedPlanId && (
                  // <span className="text-xs text-amber-600 max-w-xs leading-tight mt-1">
                  //   Note: Enabled for testing (plan is not 100% complete).
                  // </span>
                )} */}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Generated Reports</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated At</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentReports.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${r.report_type === 'final' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {r.report_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {getPlanName(r.plan_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                  <FileText size={16} className="mr-2 text-gray-400" />
                  {r.file_path}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.generated_at).toLocaleString(undefined, { timeZone: 'UTC' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button
                    onClick={() => handleViewReport(r.id)}
                    className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                  >
                    <Eye size={16} className="mr-1" /> View
                  </button>
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
              <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No reports generated yet.</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstReport + 1}</span> to <span className="font-medium">{Math.min(indexOfLastReport, reports.length)}</span> of{' '}
                  <span className="font-medium">{reports.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Popup for viewing document */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-indigo-600 w-5 h-5" />
                {viewingReport.filename}
              </h3>
              <button
                onClick={() => setViewingReport(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content - Read Only / A4 Page Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100 select-none">
              <div className="bg-white shadow-lg border border-gray-200 p-12 max-w-2xl mx-auto min-h-[75vh] rounded-sm text-gray-800 font-sans text-left">
                {Array.isArray(viewingReport.content) ? (
                  viewingReport.content.map((item, index) => {
                    if (item.type === 'h1') {
                      return <h1 key={index} className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-6 mt-8 first:mt-0">{item.text}</h1>;
                    } else if (item.type === 'h2') {
                      return <h2 key={index} className="text-base font-bold text-indigo-900 mt-6 mb-3 border-l-4 border-indigo-500 pl-3">{item.text}</h2>;
                    } else if (item.type === 'h3') {
                      return <h3 key={index} className="text-sm font-semibold text-gray-800 mt-4 mb-2">{item.text}</h3>;
                    } else if (item.type === 'list-item') {
                      return (
                        <div key={index} className="flex items-start gap-2 ml-4 mb-2">
                          <span className="text-indigo-500 mt-1.5 text-[8px]">•</span>
                          <p className="text-xs text-gray-700 leading-relaxed">{item.text}</p>
                        </div>
                      );
                    } else {
                      return <p key={index} className="text-xs text-gray-700 leading-relaxed mb-4">{item.text}</p>;
                    }
                  })
                ) : (
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{viewingReport.content}</p>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-150 flex justify-end">
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay spinner for fetching document content */}
      {viewLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-xl shadow-lg flex items-center space-x-3">
            <Loader2 className="animate-spin w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-700">Loading document...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
