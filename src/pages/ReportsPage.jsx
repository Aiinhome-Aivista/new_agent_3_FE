import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect } from 'react';
import { getPlans, generateWeeklyReport, generateFinalReport, getReports, getPlanSummary, viewReport, updateReportStatus } from '../api/api';
import Loader from '../components/Loader';
import { FileText, Download, ChevronLeft, ChevronRight, Eye, X, Loader2, CheckCircle, Clock, Send, Presentation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';
import { useToast } from '../context/ToastContext';

const ReportsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { activeOperations, startOperation, endOperation } = useOperations();
  const generatingType = activeOperations['generate-report'] || null;
  const [isAllTopicsCovered, setIsAllTopicsCovered] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewLoading, setViewLoading] = useState(false);
  const [planCompletionStatus, setPlanCompletionStatus] = useState({});

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [plansRes, reportsRes] = await Promise.all([getPlans({ for_dropdown: 'true' }), getReports()]);
        const allPlansList = plansRes.data.data || [];
        setAllPlans(allPlansList);
        
        let appPlans = allPlansList.filter(p => p.status === 'approved' || p.status === 'closed');
        if (user?.role === 'Delivery / Engagement Manager') {
          appPlans = appPlans.filter(p => p.approved_by === user?.id);
        }
        setPlans(appPlans);
        
        const allowedPlanIds = appPlans.map(plan => plan.id);
        let allReports = reportsRes.data.data || [];
        
        if (user?.role === 'Delivery / Engagement Manager') {
          allReports = allReports.filter(report => allowedPlanIds.includes(report.plan_id));
        }
        
        setReports(allReports);
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
      let allReports = res.data.data || [];
      if (user?.role === 'Delivery / Engagement Manager') {
        const allowedPlanIds = plans.map(plan => plan.id);
        allReports = allReports.filter(report => allowedPlanIds.includes(report.plan_id));
      }
      setReports(allReports);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendForApproval = async (reportId) => {
    try {
      const res = await updateReportStatus(reportId, 'pending');
      if (res.data && res.data.success) {
        fetchReports();
      } else {
        showToast(res.data.message || 'Failed to send approval request', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error sending approval request', 'error');
    }
  };

  const handleApproveReport = async (reportId) => {
    try {
      const res = await updateReportStatus(reportId, 'approved');
      if (res.data && res.data.success) {
        fetchReports();
      } else {
        showToast(res.data.message || 'Failed to approve report', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error approving report', 'error');
    }
  };

  useEffect(() => {
    const fetchPlanStatuses = async () => {
      const uniquePlanIds = [...new Set(reports.map(r => r.plan_id))];
      const statuses = { ...planCompletionStatus };
      let updated = false;

      for (const id of uniquePlanIds) {
        if (statuses[id] === undefined) {
          try {
            const res = await getPlanSummary(id);
            if (res.data && res.data.success) {
              statuses[id] = (res.data.data.avg_completion_percent === 100);
            } else {
              statuses[id] = false;
            }
          } catch (err) {
             statuses[id] = false;
          }
          updated = true;
        }
      }
      
      if (updated) {
        setPlanCompletionStatus(statuses);
      }
    };
    
    if (reports.length > 0) {
      fetchPlanStatuses();
    }
  }, [reports]);

  const handleViewReport = async (reportId) => {
    setViewLoading(true);
    setCurrentSlideIndex(0);
    try {
      const res = await viewReport(reportId);
      if (res.data && res.data.success) {
        setViewingReport(res.data.data);
      } else {
        showToast(res.data.message || 'Failed to fetch report content', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching report content', 'error');
    } finally {
      setViewLoading(false);
    }
  };

  const handleGenerate = async (type) => {
    if (!selectedPlanId) return;
    startOperation('generate-report', type);
    try {
      if (type === 'weekly') {
        await generateWeeklyReport(selectedPlanId);
      } else {
        await generateFinalReport(selectedPlanId);
      }
      fetchReports();
    } catch (err) {
      showToast('Error generating report', 'error');
    } finally {
      endOperation('generate-report');
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
      <h2 className="text-2xl font-bold text-primary-text">Reports Generation</h2>

      {user?.role === 'Delivery / Engagement Manager' && (
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-primary-text mb-4">Generate Report</h3>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
              <CustomSelect
                className="block w-full px-3 py-2 border border-light-border rounded-md"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                <option value="" disabled>---Select Plan---</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.application_name}</option>)}
              </CustomSelect>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-6 w-full sm:w-auto">
              <button
                onClick={() => handleGenerate('weekly')}
                disabled={generatingType !== null || !selectedPlanId}
                className="px-4 py-2 bg-primary-orange text-white rounded-md hover:bg-hover-orange disabled:opacity-50"
              >
                {generatingType === 'weekly' ? 'Generating...' : 'Generate Weekly Report'}
              </button>
              <button
                onClick={() => handleGenerate('final')}
                disabled={generatingType !== null || !selectedPlanId}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {generatingType === 'final' ? 'Generating...' : 'Generate Final Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-primary-text mb-4">Generated Reports</h3>
        <div className="overflow-x-auto custom-scrollbar pb-2">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-light-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">File Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">Generated At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary-text uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-light-background divide-y divide-gray-200">
            {currentReports.map((r) => {
              const isPlanComplete = planCompletionStatus[r.plan_id] === true;
              let displayType = r.report_type;
              if (r.report_type === 'final' && !isPlanComplete) {
                displayType = 'draft';
              }

              const reportStatus = r.status || 'draft';
              const isApproved = reportStatus === 'approved';
              const isPending = reportStatus === 'pending';

              return (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-text capitalize">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    r.report_type === 'final' ? 'bg-purple-100 text-purple-800' : 'bg-input-background text-hover-orange'
                  }`}>
                    {r.report_type === 'weekly' ? 'Weekly Report' : 'Final Report'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {getPlanName(r.plan_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text flex items-center">
                  <Presentation size={16} className="mr-2 text-primary-orange" />
                  {r.file_path?.endsWith('.docx') ? r.file_path.replace('.docx', '.pptx') : r.file_path}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{new Date(r.generated_at).toLocaleString(undefined, { timeZone: 'UTC' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {isApproved ? (
                    <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full inline-flex items-center gap-1 border border-green-200">
                      <CheckCircle size={13} /> Approved
                    </span>
                  ) : isPending ? (
                    user?.role === 'PwC Leadership' ? (
                      <button
                        onClick={() => handleApproveReport(r.id)}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold rounded-full border border-amber-300 transition-all duration-150 cursor-pointer inline-flex items-center gap-1 shadow-sm active:scale-95"
                        title="Click to approve report"
                      >
                        <Clock size={13} /> Pending (Click to Approve)
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full inline-flex items-center gap-1 border border-amber-200" title="Pending approval from PwC Leadership">
                        <Clock size={13} /> Pending
                      </span>
                    )
                  ) : user?.role === 'Delivery / Engagement Manager' ? (
                    <button
                      onClick={() => handleSendForApproval(r.id)}
                      className="px-2.5 py-1 bg-input-background hover:bg-input-background text-primary-orange text-xs font-semibold rounded-full border border-orange-border transition-all duration-150 cursor-pointer inline-flex items-center gap-1 shadow-sm active:scale-95"
                      title="Click to send approval request to PwC Leadership"
                    >
                      <Send size={13} /> Send for Approval
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 bg-input-background text-secondary-text text-xs font-semibold rounded-full inline-flex items-center gap-1 border border-light-border" title="Not submitted for approval yet">
                      <Clock size={13} /> Not Submitted
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button
                    onClick={() => handleViewReport(r.id)}
                    className="text-primary-orange hover:text-hover-orange inline-flex items-center"
                  >
                    <Eye size={16} className="mr-1" /> View
                  </button>
                  {!isApproved ? (
                    <span className="text-secondary-text inline-flex items-center cursor-not-allowed opacity-60" title="Requires PwC Leadership approval to download">
                      <Download size={16} className="mr-1" /> Download
                    </span>
                  ) : (
                    <a
                      href={`${baseURL}/reports/download/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-orange hover:text-hover-orange inline-flex items-center font-medium"
                    >
                      <Download size={16} className="mr-1" /> Download
                    </a>
                  )}
                </td>
              </tr>
            )})}
            {reports.length === 0 && (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-secondary-text">No reports generated yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-light-border bg-light-background px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-light-border bg-light-background px-4 py-2 text-sm font-medium text-gray-700 hover:bg-light-background disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-light-border bg-light-background px-4 py-2 text-sm font-medium text-gray-700 hover:bg-light-background disabled:opacity-50"
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
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-secondary-text ring-1 ring-inset ring-gray-300 hover:bg-light-background focus:z-20 focus:outline-offset-0 disabled:opacity-50"
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
                          ? 'z-10 bg-primary-orange text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange'
                          : 'text-primary-text ring-1 ring-inset ring-gray-300 hover:bg-light-background'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-secondary-text ring-1 ring-inset ring-gray-300 hover:bg-light-background focus:z-20 focus:outline-offset-0 disabled:opacity-50"
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

      {/* Modal Popup for viewing PPT Presentation */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-light-background w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <Presentation className="text-primary-orange w-6 h-6" />
                <div>
                  <h3 className="text-base font-bold text-primary-text">{viewingReport.filename}</h3>
                  <p className="text-xs text-secondary-text">PowerPoint Presentation View</p>
                </div>
              </div>
              
              {/* Slide navigation controls */}
              {viewingReport.slides && viewingReport.slides.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    Slide {currentSlideIndex + 1} of {viewingReport.slides.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentSlideIndex(prev => Math.max(prev - 1, 0))}
                      disabled={currentSlideIndex === 0}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentSlideIndex(prev => Math.min(prev + 1, viewingReport.slides.length - 1))}
                      disabled={currentSlideIndex === viewingReport.slides.length - 1}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setViewingReport(null)}
                    className="text-secondary-text hover:text-gray-700 p-1.5 rounded-lg hover:bg-input-background ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Modal Content - 16:9 PowerPoint Slide Preview */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900 flex flex-col items-center justify-center min-h-[60vh]">
              {viewingReport.slides && viewingReport.slides[currentSlideIndex] ? (
                <div className="w-full max-w-3xl aspect-[16/9] bg-white rounded-xl shadow-2xl p-8 flex flex-col justify-between border-t-8 border-primary-orange relative overflow-hidden text-slate-800 select-none">
                  
                  {/* Top Bar Accent & Header */}
                  <div>
                    <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                          {viewingReport.slides[currentSlideIndex].title || `Slide ${currentSlideIndex + 1}`}
                        </h2>
                        {viewingReport.slides[currentSlideIndex].subtitle && (
                          <p className="text-xs font-medium text-orange-600 mt-0.5">
                            {viewingReport.slides[currentSlideIndex].subtitle}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        PwC Advisory
                      </span>
                    </div>

                    {/* Slide Body Bullets / Cards */}
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                      {currentSlideIndex === 0 ? (
                        <div className="space-y-4 py-2">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full">
                                Executive Program Report
                              </span>
                              <span className="text-xs font-semibold text-slate-500">PwC Advisory</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              This presentation contains executive status updates, knowledge transfer progress metrics, risk evaluations, and completion milestones for governance review.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white border border-slate-200 p-3 rounded-lg">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Persona</span>
                              <span className="font-semibold text-slate-800">Delivery / Engagement Manager</span>
                            </div>
                            <div className="bg-white border border-slate-200 p-3 rounded-lg">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Governance Standard</span>
                              <span className="font-semibold text-slate-800">RAG Grounded & Audit Verified</span>
                            </div>
                          </div>
                        </div>
                      ) : Array.isArray(viewingReport.slides[currentSlideIndex].content) && viewingReport.slides[currentSlideIndex].content.length > 0 ? (
                        viewingReport.slides[currentSlideIndex].content.map((item, idx) => {
                          const cleanItem = String(item).replace(/^\s*#{1,6}\s*/, '').replace(/^\s*[-*•]\s*/, '').replace(/^\s*\d+\.\s*/, '').replace(/\*\*/g, '').trim();
                          if (!cleanItem) return null;
                          const isHeading = cleanItem.endsWith(':') || String(item).includes('####') || String(item).includes('###');
                          return (
                            <div key={idx} className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                              isHeading ? 'bg-orange-50/70 border-orange-200 font-bold text-orange-950' : 'bg-slate-50 border-slate-100 text-slate-700'
                            } shadow-xs`}>
                              <span className={`w-2 h-2 rounded-full ${isHeading ? 'bg-orange-600' : 'bg-primary-orange'} mt-1.5 shrink-0`} />
                              <p className={`text-xs leading-relaxed ${isHeading ? 'font-semibold text-slate-900' : 'font-normal text-slate-700'}`}>{cleanItem}</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-center h-40 text-slate-400 text-xs italic">
                          Executive Status & Summary
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slide Footer */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-gray-100 pt-3 mt-4">
                    <span>Solution Advisory | Autonomous Bid Lifecycle Platform</span>
                    <span className="font-semibold text-slate-500">Slide {currentSlideIndex + 1} of {viewingReport.slides.length}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No slide content available.</p>
              )}
            </div>

            {/* Slide Thumbnails Jump Bar */}
            {viewingReport.slides && viewingReport.slides.length > 1 && (
              <div className="px-6 py-3 border-t border-gray-150 bg-gray-50 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                <span className="text-xs font-semibold text-gray-500 shrink-0 mr-2">Jump to Slide:</span>
                {viewingReport.slides.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all shrink-0 ${
                      currentSlideIndex === idx
                        ? 'bg-primary-orange text-white border-primary-orange shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-150 flex justify-end">
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 bg-input-background text-primary-text font-semibold rounded-lg hover:bg-gray-300 transition-colors text-sm"
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
          <div className="bg-light-background p-4 rounded-xl shadow-lg flex items-center space-x-3">
            <Loader2 className="animate-spin w-5 h-5 text-primary-orange" />
            <span className="text-sm font-semibold text-gray-700">Loading document...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
