import React, { useState, useEffect } from 'react';
import { getPlans, generatePlan, approvePlan, runFullWorkflow } from '../api/api';
import Loader from '../components/Loader';
import { FileText, CheckCircle, Play, X, ArrowRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PlanCard = ({ plan, canApprove, handleApproveClick, parseMarkdown }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div 
        className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          {expanded ? <ChevronUp className="mr-3 text-gray-500" size={20} /> : <ChevronDown className="mr-3 text-gray-500" size={20} />}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileText className="mr-2 text-blue-500" size={20} />
              {plan.application_name} ({plan.plan_type})
            </h3>
            <span className={`inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {plan.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {plan.status === 'draft' && canApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApproveClick(plan.id);
              }}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={16} className="mr-1" /> Approve Plan
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="p-6">
          <div 
            className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap"
            dangerouslySetInnerHTML={parseMarkdown(plan.generated_content)}
          />
        </div>
      )}
    </div>
  );
};

const PlanPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [planToApprove, setPlanToApprove] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [workflowResult, setWorkflowResult] = useState(null);
  const [formData, setFormData] = useState({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });

  const fetchPlans = async () => {
    try {
      const res = await getPlans();
      setPlans(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await generatePlan(formData);
      setFormData({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
      fetchPlans();
    } catch (err) {
      alert('Error generating plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleRunWorkflow = async () => {
    if (!formData.application_name || !formData.scope_description) {
      alert('Please fill out App Name and Scope Description first');
      return;
    }
    setRunningWorkflow(true);
    try {
      const res = await runFullWorkflow(formData);
      setWorkflowResult(res.data);
      fetchPlans();
    } catch (err) {
      alert('Error running workflow: ' + err.message);
    } finally {
      setRunningWorkflow(false);
    }
  };

  const confirmApprove = async () => {
    if (!planToApprove) return;
    try {
      await approvePlan(planToApprove);
      setPlanToApprove(null);
      fetchPlans();
    } catch (err) {
      alert('Error approving plan');
    }
  };

  if (loading) return <Loader />;

  const canGenerate = user?.role === 'Outgoing SME (Knowledge Giver)';
  const canApprove = user?.role === 'Delivery / Engagement Manager';

  const parseMarkdown = (text) => {
    if (!text) return { __html: '' };
    let html = text.replace(/```markdown\n?/g, '').replace(/```\n?/g, '');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-800 mt-4">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-800 mt-6 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-blue-600 mt-2 mb-4 border-b pb-2">$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-gray-900 font-semibold">$1</strong>');
    html = html.replace(/^\s*\-\s+(.*$)/gim, '<div class="ml-4 flex"><span class="mr-2">•</span><span>$1</span></div>');
    return { __html: html };
  };

  const itemsPerPage = 5;
  const indexOfLastPlan = currentPage * itemsPerPage;
  const indexOfFirstPlan = indexOfLastPlan - itemsPerPage;
  const currentPlans = plans.slice(indexOfFirstPlan, indexOfLastPlan);
  const totalPages = Math.ceil(plans.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">KT Plans</h2>

      {canGenerate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate Plan with AI</h3>
          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">App Name</label>
              <input
                type="text" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={formData.application_name}
                onChange={(e) => setFormData({...formData, application_name: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Scope Description</label>
              <input
                type="text" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={formData.scope_description}
                onChange={(e) => setFormData({...formData, scope_description: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan Type</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={formData.plan_type}
                onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
              >
                <option value="KT">KT</option>
                <option value="Reverse-KT">Reverse-KT</option>
              </select>
            </div>
            
            {formData.plan_type === 'Reverse-KT' && (
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700">Reverse KT Focus Area</label>
                <input
                  type="text" required
                  placeholder="e.g. Test incident resolution or backend deployment"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.reverse_kt_focus}
                  onChange={(e) => setFormData({...formData, reverse_kt_focus: e.target.value})}
                />
              </div>
            )}

            <div className="md:col-span-4 flex justify-end mt-2 space-x-3">
              {/* <button
                type="button"
                onClick={handleRunWorkflow}
                disabled={runningWorkflow}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {runningWorkflow ? 'Running Workflow...' : <><Play size={16} className="mr-2" /> Run Full Workflow</>}
              </button> */}
              <button
                type="submit"
                disabled={generating}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {workflowResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
          <button 
            onClick={() => setWorkflowResult(null)} 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
          <h3 className="text-lg font-bold text-purple-700 mb-6 flex items-center">
            <Play className="mr-2" /> Multi-Agent Workflow Orchestration Complete
          </h3>
          <div className="relative border-l-2 border-purple-200 ml-3 space-y-6">
            {workflowResult.logs?.map((log, idx) => (
              <div key={idx} className="relative flex items-start">
                <span className="absolute -left-3.5 bg-white p-1 rounded-full text-purple-600">
                  <CheckCircle size={20} className="fill-current text-white" />
                </span>
                <div className="ml-6 bg-purple-50 px-4 py-3 rounded-lg shadow-sm w-full border border-purple-100">
                  <span className="text-sm font-medium text-purple-900 flex items-center">
                    Step {idx + 1}
                    <ArrowRight size={14} className="mx-2 text-purple-400" />
                    {log}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {currentPlans.map((plan) => (
          <PlanCard 
            key={plan.id} 
            plan={plan} 
            canApprove={canApprove} 
            handleApproveClick={setPlanToApprove} 
            parseMarkdown={parseMarkdown} 
          />
        ))}
        {plans.length === 0 && <p className="text-gray-500 text-center py-8">No plans generated yet.</p>}
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-xl shadow-sm mt-4">
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
                  Showing <span className="font-medium">{indexOfFirstPlan + 1}</span> to <span className="font-medium">{Math.min(indexOfLastPlan, plans.length)}</span> of{' '}
                  <span className="font-medium">{plans.length}</span> results
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

      {planToApprove && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Approve KT Plan</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to approve this plan? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPlanToApprove(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanPage;
