import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect } from 'react';
import { getPlans, generatePlan, extractPlanInfoFromDoc, approvePlan, closePlan, runFullWorkflow, getStakeholders, assignPlanManager, editPlan, getPlanTopicOptions, resyncPlanTopics, addPlanTopic, deletePlanTopic } from '../api/api';
import Loader from '../components/Loader';
import { FileText, CheckCircle, Play, X, ArrowRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, UserPlus, RefreshCw, Plus, Trash2, List, Upload, FileUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';
import { useToast } from '../context/ToastContext';

const PlanCard = ({ plan, canApprove, handleApproveClick, handleCloseClick, parseMarkdown, stakeholders, onAssignManager, onPlanUpdate }) => {
  const { showToast } = useToast();
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedManager, setSelectedManager] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(plan.generated_content || '');
  const [saving, setSaving] = useState(false);

  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [showTopicsView, setShowTopicsView] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('Day 1');
  const [newTopicName, setNewTopicName] = useState('');
  const [newDuration, setNewDuration] = useState('1 hour');

  useEffect(() => {
    setEditedContent(plan.generated_content || '');
  }, [plan.generated_content]);

  const fetchTopics = async () => {
    setLoadingTopics(true);
    try {
      const res = await getPlanTopicOptions(plan.id);
      setTopics(res.data.data || []);
    } catch (err) {
      console.error("Error fetching topics:", err);
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchTopics();
    }
  }, [expanded, plan.id]);

  const handleEditClick = (e) => {
    e.stopPropagation();
    setEditedContent(plan.generated_content || '');
    setIsEditing(true);
    setExpanded(true);
  };

  const handleSaveClick = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await onPlanUpdate(plan.id, editedContent);
      setIsEditing(false);
      await fetchTopics();
      showToast('Plan updated successfully', 'success');
    } catch (err) {
      showToast('Error updating plan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = (e) => {
    e.stopPropagation();
    setEditedContent(plan.generated_content || '');
    setIsEditing(false);
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    try {
      await addPlanTopic(plan.id, {
        day_label: newDayLabel,
        topic_name: newTopicName,
        estimated_duration_hours: newDuration
      });
      setNewTopicName('');
      await fetchTopics();
      showToast('Topic added successfully', 'success');
    } catch (err) {
      showToast('Error adding topic: ' + err.message, 'error');
    }
  };

  const handleDeleteTopic = (topicId) => {
    setTopicToDelete(topicId);
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    try {
      await deletePlanTopic(topicToDelete);
      await fetchTopics();
      showToast('Topic deleted successfully', 'success');
    } catch (err) {
      showToast('Error deleting topic: ' + err.message, 'error');
    } finally {
      setTopicToDelete(null);
    }
  };

  const handleResync = async () => {
    setLoadingTopics(true);
    try {
      await resyncPlanTopics(plan.id);
      await fetchTopics();
      showToast('Topics re-synced successfully', 'success');
    } catch (err) {
      showToast('Error resyncing topics: ' + err.message, 'error');
    } finally {
      setLoadingTopics(false);
    }
  };

  const manager = stakeholders.find(s => s.id == plan.created_by);
  
  return (
    <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div 
        className="px-6 py-4 border-b border-light-border bg-light-background flex justify-between items-center cursor-pointer hover:bg-input-background transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          {expanded ? <ChevronUp className="mr-3 text-secondary-text" size={20} /> : <ChevronDown className="mr-3 text-secondary-text" size={20} />}
          <div>
            <h3 className="text-lg font-semibold text-primary-text flex items-center">
              <FileText className="mr-2 text-primary-orange" size={20} />
              {plan.application_name} ({plan.plan_type})
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.status === 'closed' ? 'bg-red-100 text-red-800 border border-red-200' : plan.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {plan.status.toUpperCase()}
          </span>
          {(plan.status === 'draft' || plan.status === 'approved') && canApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseClick(plan.id);
              }}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-light-background hover:bg-red-50"
            >
              <X size={16} className="mr-1" /> Close Plan
            </button>
          )}
          {plan.status === 'draft' && (
            <>
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-button-orange hover:bg-hover-orange disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-light-border text-xs font-medium rounded text-gray-700 bg-light-background hover:bg-light-background disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="inline-flex items-center px-3 py-1.5 border border-light-border text-xs font-medium rounded text-gray-700 bg-light-background hover:bg-light-background"
                >
                  Edit
                </button>
              )}
            </>
          )}
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
        <div className="p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
          {/* Sub-header view switcher */}
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowTopicsView(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!showTopicsView ? 'bg-input-background text-primary-orange font-semibold' : 'text-secondary-text hover:bg-input-background'}`}
              >
                Plan Document
              </button>
              <button
                type="button"
                onClick={() => setShowTopicsView(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center ${showTopicsView ? 'bg-input-background text-primary-orange font-semibold' : 'text-secondary-text hover:bg-input-background'}`}
              >
                <List size={14} className="mr-1" />
                Plan Topics ({topics.length})
              </button>
            </div>
            {showTopicsView && (
              <button
                type="button"
                onClick={handleResync}
                disabled={loadingTopics}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-input-background hover:bg-input-background rounded-md"
              >
                <RefreshCw size={12} className={`mr-1 ${loadingTopics ? 'animate-spin' : ''}`} />
                Re-sync from Plan
              </button>
            )}
          </div>

          {!showTopicsView ? (
            <div>
              {isEditing ? (
                <div>
                  <p className="text-xs text-secondary-text mb-2">
                    💡 Tip: Editing and saving this plan document will automatically re-extract and update the topics in the database (<code className="bg-input-background px-1 rounded">plan_topics</code> table).
                  </p>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-96 p-4 border border-light-border rounded-lg text-sm font-mono text-primary-text focus:ring-orange-border focus:border-orange-border outline-none"
                    placeholder="Edit your markdown plan here..."
                  />
                </div>
              ) : (
                <div 
                  className="prose prose-sm max-w-none text-secondary-text whitespace-pre-wrap"
                  dangerouslySetInnerHTML={parseMarkdown(plan.generated_content)}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-primary-text">Plan Topic</h4>
              {loadingTopics ? (
                <p className="text-xs text-secondary-text">Loading topics...</p>
              ) : topics.length === 0 ? (
                <p className="text-xs text-secondary-text italic">No topics stored yet. Click "Re-sync from Plan" or add a topic below.</p>
              ) : (
                <div className="overflow-x-auto border border-light-border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-light-background">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-secondary-text uppercase">Day / Section</th>
                        <th className="px-4 py-2 text-left font-medium text-secondary-text uppercase">Topic / Sub-topic Name</th>
                        <th className="px-4 py-2 text-left font-medium text-secondary-text uppercase">Duration</th>
                        <th className="px-4 py-2 text-right font-medium text-secondary-text uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-light-background">
                      {(() => {
                        const rowSpans = [];
                        for (let i = 0; i < topics.length; i++) {
                          if (i === 0 || topics[i].day_label !== topics[i-1].day_label) {
                            let span = 1;
                            for (let j = i + 1; j < topics.length; j++) {
                              if (topics[j].day_label === topics[i].day_label) {
                                span++;
                              } else {
                                break;
                              }
                            }
                            rowSpans[i] = span;
                          } else {
                            rowSpans[i] = 0;
                          }
                        }

                        return topics.map((t, index) => {
                          const rSpan = rowSpans[index];
                          return (
                            <tr key={t.id} className="hover:bg-light-background">
                              {rSpan > 0 && (
                                <td 
                                  rowSpan={rSpan} 
                                  className="px-4 py-2.5 text-gray-700 whitespace-nowrap font-semibold align-middle border-r border-gray-100"
                                >
                                  {t.day_label || 'General'}
                                </td>
                              )}
                              <td className="px-4 py-2.5 font-medium text-primary-text">{t.topic_name}</td>
                              <td className="px-4 py-2.5 text-secondary-text whitespace-nowrap">{t.estimated_duration_hours || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteTopic(t.id)}
                                  className="text-red-600 hover:text-red-800 inline-flex items-center p-1 rounded"
                                  title="Delete Topic"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add Topic Form */}
              <form onSubmit={handleAddTopic} className="bg-light-background p-3 rounded-lg border border-light-border flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Add Topic:</span>
                <input
                  type="text"
                  placeholder="Day (e.g. Day 1)"
                  value={newDayLabel}
                  onChange={(e) => setNewDayLabel(e.target.value)}
                  className="px-2 py-1 text-xs border border-light-border rounded shadow-sm w-28 focus:ring-orange-border"
                />
                <input
                  type="text"
                  required
                  placeholder="Main topic or sub-topic name"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="px-2 py-1 text-xs border border-light-border rounded shadow-sm flex-1 min-w-[200px] focus:ring-orange-border"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 1 hour)"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="px-2 py-1 text-xs border border-light-border rounded shadow-sm w-32 focus:ring-orange-border"
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-1 bg-primary-orange hover:bg-hover-orange text-white text-xs font-medium rounded shadow-sm"
                >
                  <Plus size={12} className="mr-1" /> Add
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Delete Topic Confirmation Modal */}
      {topicToDelete && (
        <div className="fixed inset-0 z-[200] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setTopicToDelete(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-light-background rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-primary-text">
                    Delete Topic
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-secondary-text">
                      Are you sure you want to delete this topic? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmDeleteTopic}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-light-border shadow-sm px-4 py-2 bg-light-background text-base font-medium text-gray-700 hover:bg-light-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setTopicToDelete(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
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
  const [planToClose, setPlanToClose] = useState(null);
  const [loading, setLoading] = useState(true);
  const { activeOperations, startOperation, endOperation, docExtractionState, setDocExtractionState } = useOperations();
  const generating = activeOperations['create-plan'];
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [workflowResult, setWorkflowResult] = useState(null);
  const [formData, setFormData] = useState({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
  
  const { docFormData, selectedFiles, analyzingDoc, isDocExtracted } = docExtractionState || {
    docFormData: { application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' },
    selectedFiles: [], analyzingDoc: false, isDocExtracted: false
  };

  const setDocFormData = (updater) => setDocExtractionState(prev => ({ ...prev, docFormData: typeof updater === 'function' ? updater(prev.docFormData) : updater }));
  const setSelectedFiles = (files) => setDocExtractionState(prev => ({ ...prev, selectedFiles: files }));
  const setAnalyzingDoc = (val) => setDocExtractionState(prev => ({ ...prev, analyzingDoc: val }));
  const setIsDocExtracted = (val) => setDocExtractionState(prev => ({ ...prev, isDocExtracted: val }));

  const generatingDocPlan = activeOperations['create-plan-doc'];

  const [stakeholders, setStakeholders] = useState([]);

  const fetchPlans = async () => {
    try {
      const res = await getPlans();
      const fetchedPlans = res.data.data || [];
      const statusOrder = { 'draft': 1, 'approved': 2, 'closed': 3 };
      const sortedPlans = [...fetchedPlans].sort((a, b) => 
        (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
      );
      setPlans(sortedPlans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const res = await getStakeholders();
      const filtered = res.data.data.filter(s => s.role === 'engagement_manager' || s.role === 'leadership');
      setStakeholders(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchStakeholders();
  }, []);

  const handleAssignManager = async (planId, stakeholderId) => {
    try {
      await assignPlanManager(planId, stakeholderId);
      fetchPlans();
    } catch (err) {
      alert('Error assigning manager');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    startOperation('create-plan');
    try {
      await generatePlan(formData);
      setFormData({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
      fetchPlans();
    } catch (err) {
      alert('Error generating plan');
    } finally {
      endOperation('create-plan');
    }
  };

  const analyzeFiles = async (filesToAnalyze) => {
    if (!filesToAnalyze || filesToAnalyze.length === 0) {
      alert('Please select at least one document file to extract info.');
      return;
    }
    setAnalyzingDoc(true);
    try {
      const uploadData = new FormData();
      filesToAnalyze.forEach(file => {
        uploadData.append('files', file);
      });
      const res = await extractPlanInfoFromDoc(uploadData);
      if (res.data?.success && res.data?.data) {
        setDocFormData(prev => ({
          ...prev,
          application_name: res.data.data.application_name || '',
          scope_description: res.data.data.scope_description || ''
        }));
        setIsDocExtracted(true);
      }
    } catch (err) {
      alert('Error analyzing document(s): ' + (err.response?.data?.message || err.message));
    } finally {
      setAnalyzingDoc(false);
    }
  };

  const handleDocFileChange = (e) => {
    const newlySelected = Array.from(e.target.files || []);
    if (newlySelected.length === 0) return;

    const updatedList = [...selectedFiles];
    newlySelected.forEach(file => {
      if (!updatedList.some(f => f.name === file.name && f.size === file.size)) {
        updatedList.push(file);
      }
    });

    setSelectedFiles(updatedList);
    e.target.value = null;
  };

  const handleRemoveFile = (indexToRemove) => {
    const updatedList = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    setSelectedFiles(updatedList);
    if (updatedList.length === 0) {
      setIsDocExtracted(false);
      setDocFormData(prev => ({ ...prev, application_name: '', scope_description: '' }));
    }
  };

  const handleExtractFromDocs = () => {
    analyzeFiles(selectedFiles);
  };

  const handleGenerateWithDoc = async (e) => {
    e.preventDefault();
    if (!docFormData.application_name || !docFormData.scope_description) {
      alert('Please fill out Plan Name and Scope Description or upload document(s) to auto-extract them.');
      return;
    }
    startOperation('create-plan-doc');
    try {
      await generatePlan(docFormData);
      setDocFormData({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
      setSelectedFiles([]);
      setIsDocExtracted(false);
      fetchPlans();
    } catch (err) {
      alert('Error generating plan from document: ' + (err.response?.data?.message || err.message));
    } finally {
      endOperation('create-plan-doc');
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

  const confirmClose = async () => {
    if (!planToClose) return;
    try {
      await closePlan(planToClose);
      setPlanToClose(null);
      fetchPlans();
    } catch (err) {
      alert('Error closing plan');
    }
  };

  const handlePlanUpdate = async (planId, content) => {
    await editPlan(planId, { generated_content: content });
    setPlans(prevPlans => prevPlans.map(p => p.id === planId ? { ...p, generated_content: content } : p));
    await fetchPlans();
  };

  if (loading) return <Loader />;

  const canGenerate = user?.role === 'Outgoing SME (Knowledge Giver)' || user?.role === 'Delivery / Engagement Manager';
  const canApprove = user?.role === 'Delivery / Engagement Manager';

  const parseMarkdown = (text) => {
    if (!text) return { __html: '' };
    let html = text.replace(/```markdown\n?/g, '').replace(/```\n?/g, '');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-primary-text mt-4">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-primary-text mt-6 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-primary-orange mt-2 mb-4 border-b pb-2">$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-primary-text font-semibold">$1</strong>');
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
      <h2 className="text-2xl font-bold text-primary-text">KT Plans</h2>

      {canGenerate && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Generate Plan with AI */}
          <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between border-l-4 border-l-primary-orange h-full">
            <div className="flex-1 flex flex-col justify-between">
              <h3 className="text-lg font-semibold text-primary-text mb-4">Generate Plan with AI</h3>
              <form onSubmit={handleGenerate} className="flex-1 flex flex-col justify-between space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                    <input
                      type="text" required
                      placeholder="e.g. Payment Gateway Service"
                      className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm"
                      value={formData.application_name}
                      onChange={(e) => setFormData({...formData, application_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                    <CustomSelect
                      className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm"
                      value={formData.plan_type}
                      onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
                    >
                      <option value="KT">KT</option>
                      <option value="Reverse-KT">Reverse-KT</option>
                    </CustomSelect>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Scope Description</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Enter main topics or scope details"
                      className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm"
                      value={formData.scope_description}
                      onChange={(e) => setFormData({...formData, scope_description: e.target.value})}
                    />
                  </div>

                  {formData.plan_type === 'Reverse-KT' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Reverse KT Focus Area</label>
                      <input
                        type="text" required
                        placeholder="e.g. Test incident resolution or backend deployment"
                        className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm"
                        value={formData.reverse_kt_focus}
                        onChange={(e) => setFormData({...formData, reverse_kt_focus: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 mt-auto">
                  <button
                    type="submit"
                    disabled={generating}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-orange hover:bg-hover-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border disabled:opacity-50"
                  >
                    {generating ? 'Generating...' : 'Generate Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Card 2: Generate Plan with Document */}
          <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between border-l-4 border-l-primary-orange h-full">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-primary-text flex items-center">
                    <FileUp className="mr-2 text-primary-orange" size={20} />
                    Generate Plan with Document
                  </h3>
                  <span className="text-xs bg-input-background text-primary-orange px-2.5 py-1 rounded-full font-medium border border-input-background">
                    PDF / DOCX File
                  </span>
                </div>

                {/* Document Upload Option */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Document Upload (.pdf, .docx)</label>
                    {selectedFiles.length > 0 && (
                      <span className="text-xs text-primary-orange font-semibold bg-input-background px-2 py-0.5 rounded border border-input-background">
                        {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                      </span>
                    )}
                  </div>
                  
                  {/* Upload Box & Extract Button Side-by-Side */}
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1 border-2 border-dashed border-orange-border rounded-lg p-2 hover:border-button-orange transition-colors bg-input-background/40">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        multiple
                        onChange={handleDocFileChange}
                        disabled={analyzingDoc}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex items-center justify-between text-xs text-secondary-text">
                        <span className="flex items-center font-medium text-hover-orange truncate pr-1">
                          <Upload className="mr-1.5 text-primary-orange flex-shrink-0" size={15} />
                          {selectedFiles.length === 0
                            ? 'Click or drop PDF / Word file(s)...'
                            : 'Click / drop to add more...'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExtractFromDocs}
                      disabled={selectedFiles.length === 0 || analyzingDoc}
                      className="w-[115px] h-[38px] px-3 py-2 bg-primary-orange hover:bg-hover-orange text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                    >
                      {analyzingDoc ? (
                        <>
                          <RefreshCw className="mr-1 animate-spin" size={14} /> Extracting...
                        </>
                      ) : (
                        <>
                          <FileUp className="mr-1.5" size={14} /> Extract
                        </>
                      )}
                    </button>
                  </div>

                  {/* Selected files list */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-light-background rounded-md border border-gray-100">
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="inline-flex items-center bg-light-background border border-orange-border text-hover-orange text-xs px-2 py-1 rounded-md shadow-xs group"
                        >
                          <FileText size={12} className="mr-1 text-primary-orange flex-shrink-0" />
                          <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            disabled={analyzingDoc}
                            className="ml-1.5 text-secondary-text hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Remove file"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleGenerateWithDoc} className="flex-1 flex flex-col justify-between space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                    <input
                      type="text" required
                      disabled={!isDocExtracted || analyzingDoc}
                      placeholder={isDocExtracted ? "Extracted Plan Name" : "Upload document(s) to unlock"}
                      className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm disabled:bg-input-background disabled:text-secondary-text disabled:cursor-not-allowed"
                      value={docFormData.application_name}
                      onChange={(e) => setDocFormData({...docFormData, application_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                    <CustomSelect
                      disabled={!isDocExtracted || analyzingDoc}
                      className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm disabled:bg-input-background disabled:text-secondary-text disabled:cursor-not-allowed"
                      value={docFormData.plan_type}
                      onChange={(e) => setDocFormData({...docFormData, plan_type: e.target.value})}
                    >
                      <option value="KT">KT</option>
                      <option value="Reverse-KT">Reverse-KT</option>
                    </CustomSelect>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Scope Description</label>
                    <textarea
                      required
                      rows={2}
                      disabled={!isDocExtracted || analyzingDoc}
                      placeholder={isDocExtracted ? "Main topic names extracted from document(s)" : "Upload document(s) to unlock & auto-fill"}
                      className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm disabled:bg-input-background disabled:text-secondary-text disabled:cursor-not-allowed"
                      value={docFormData.scope_description}
                      onChange={(e) => setDocFormData({...docFormData, scope_description: e.target.value})}
                    />
                  </div>

                  {docFormData.plan_type === 'Reverse-KT' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Reverse KT Focus Area</label>
                      <input
                        type="text" required
                        disabled={!isDocExtracted || analyzingDoc}
                        placeholder="e.g. Test incident resolution or backend deployment"
                        className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm disabled:bg-input-background disabled:text-secondary-text disabled:cursor-not-allowed"
                        value={docFormData.reverse_kt_focus}
                        onChange={(e) => setDocFormData({...docFormData, reverse_kt_focus: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 mt-auto">
                  <button
                    type="submit"
                    disabled={!isDocExtracted || generatingDocPlan || analyzingDoc}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-orange hover:bg-hover-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingDocPlan ? 'Generating...' : 'Generate Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {workflowResult && (
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 relative">
          <button 
            onClick={() => setWorkflowResult(null)} 
            className="absolute top-4 right-4 text-secondary-text hover:text-secondary-text"
          >
            <X size={20} />
          </button>
          <h3 className="text-lg font-bold text-purple-700 mb-6 flex items-center">
            <Play className="mr-2" /> Multi-Agent Workflow Orchestration Complete
          </h3>
          <div className="relative border-l-2 border-purple-200 ml-3 space-y-6">
            {workflowResult.logs?.map((log, idx) => (
              <div key={idx} className="relative flex items-start">
                <span className="absolute -left-3.5 bg-light-background p-1 rounded-full text-purple-600">
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
            canApprove={canApprove && String(plan.created_by) === String(user?.id)} 
            handleApproveClick={setPlanToApprove} 
            handleCloseClick={setPlanToClose}
            parseMarkdown={parseMarkdown}
            stakeholders={stakeholders}
            onAssignManager={handleAssignManager}
            onPlanUpdate={handlePlanUpdate}
          />
        ))}
        {plans.length === 0 && <p className="text-secondary-text text-center py-8">No plans generated yet.</p>}
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-light-border bg-light-background px-4 py-3 sm:px-6 rounded-xl shadow-sm mt-4">
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
                  Showing <span className="font-medium">{indexOfFirstPlan + 1}</span> to <span className="font-medium">{Math.min(indexOfLastPlan, plans.length)}</span> of{' '}
                  <span className="font-medium">{plans.length}</span> results
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

      {planToApprove && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-background rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-primary-text mb-2">Approve KT Plan</h3>
            <p className="text-secondary-text mb-6">Are you sure you want to approve this plan? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPlanToApprove(null)}
                className="px-4 py-2 border border-light-border rounded-md text-sm font-medium text-gray-700 hover:bg-light-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border"
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

      {planToClose && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-background rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-primary-text mb-2">Close KT Plan</h3>
            <p className="text-secondary-text mb-6">Are you sure you want to close this KT Plan? Closed plans will be archived from active modules.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPlanToClose(null)}
                className="px-4 py-2 border border-light-border rounded-md text-sm font-medium text-gray-700 hover:bg-light-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border"
              >
                Cancel
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Yes, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanPage;
