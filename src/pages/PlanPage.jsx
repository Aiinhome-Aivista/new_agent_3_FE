import React, { useState, useEffect } from 'react';
import { getPlans, generatePlan, extractPlanInfoFromDoc, approvePlan, runFullWorkflow, getStakeholders, assignPlanManager, editPlan, getPlanTopicOptions, resyncPlanTopics, addPlanTopic, deletePlanTopic } from '../api/api';
import Loader from '../components/Loader';
import { FileText, CheckCircle, Play, X, ArrowRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, UserPlus, RefreshCw, Plus, Trash2, List, Upload, FileUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PlanCard = ({ plan, canApprove, handleApproveClick, parseMarkdown, stakeholders, onAssignManager, onPlanUpdate }) => {
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
    } catch (err) {
      alert('Error updating plan: ' + err.message);
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
    } catch (err) {
      alert('Error adding topic: ' + err.message);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm("Are you sure you want to delete this topic from the database?")) return;
    try {
      await deletePlanTopic(topicId);
      await fetchTopics();
    } catch (err) {
      alert('Error deleting topic: ' + err.message);
    }
  };

  const handleResync = async () => {
    setLoadingTopics(true);
    try {
      await resyncPlanTopics(plan.id);
      await fetchTopics();
    } catch (err) {
      alert('Error resyncing topics: ' + err.message);
    } finally {
      setLoadingTopics(false);
    }
  };

  const manager = stakeholders.find(s => s.id == plan.created_by);
  
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
          </div>
        </div>
        <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {plan.status.toUpperCase()}
          </span>
          {plan.status === 'draft' && (
            <>
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
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
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!showTopicsView ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Plan Document
              </button>
              <button
                type="button"
                onClick={() => setShowTopicsView(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center ${showTopicsView ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <List size={14} className="mr-1" />
                Database Topics ({topics.length})
              </button>
            </div>
            {showTopicsView && (
              <button
                type="button"
                onClick={handleResync}
                disabled={loadingTopics}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
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
                  <p className="text-xs text-gray-500 mb-2">
                    💡 Tip: Editing and saving this plan document will automatically re-extract and update the topics in the database (<code className="bg-gray-100 px-1 rounded">plan_topics</code> table).
                  </p>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-96 p-4 border border-gray-300 rounded-lg text-sm font-mono text-gray-800 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Edit your markdown plan here..."
                  />
                </div>
              ) : (
                <div 
                  className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={parseMarkdown(plan.generated_content)}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-800">Topics Stored in Database (`plan_topics`)</h4>
              {loadingTopics ? (
                <p className="text-xs text-gray-500">Loading topics...</p>
              ) : topics.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No topics stored yet. Click "Re-sync from Plan" or add a topic below.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Day / Section</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Topic / Sub-topic Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Duration</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {topics.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{t.day_label || 'General'}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{t.topic_name}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{t.estimated_duration_hours || 'N/A'}</td>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add Topic Form */}
              <form onSubmit={handleAddTopic} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Add Topic:</span>
                <input
                  type="text"
                  placeholder="Day (e.g. Day 1)"
                  value={newDayLabel}
                  onChange={(e) => setNewDayLabel(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded shadow-sm w-28 focus:ring-blue-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Main topic or sub-topic name"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded shadow-sm flex-1 min-w-[200px] focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 1 hour)"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded shadow-sm w-32 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded shadow-sm"
                >
                  <Plus size={12} className="mr-1" /> Add
                </button>
              </form>
            </div>
          )}
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
  const [docFormData, setDocFormData] = useState({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzingDoc, setAnalyzingDoc] = useState(false);
  const [generatingDocPlan, setGeneratingDocPlan] = useState(false);
  const [isDocExtracted, setIsDocExtracted] = useState(false);

  const [stakeholders, setStakeholders] = useState([]);

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

  const handleDocFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setAnalyzingDoc(true);
    setIsDocExtracted(false);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
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
      alert('Error analyzing document: ' + (err.response?.data?.message || err.message));
    } finally {
      setAnalyzingDoc(false);
    }
  };

  const handleGenerateWithDoc = async (e) => {
    e.preventDefault();
    if (!docFormData.application_name || !docFormData.scope_description) {
      alert('Please fill out Plan Name and Scope Description or upload a document to auto-extract them.');
      return;
    }
    setGeneratingDocPlan(true);
    try {
      await generatePlan(docFormData);
      setDocFormData({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
      setSelectedFile(null);
      setIsDocExtracted(false);
      fetchPlans();
    } catch (err) {
      alert('Error generating plan from document: ' + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingDocPlan(false);
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Generate Plan with AI */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between border-l-4 border-l-blue-600 h-full">
            <div className="flex-1 flex flex-col justify-between">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate Plan with AI</h3>
              <form onSubmit={handleGenerate} className="flex-1 flex flex-col justify-between space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                    <input
                      type="text" required
                      placeholder="e.g. Payment Gateway Service"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      value={formData.application_name}
                      onChange={(e) => setFormData({...formData, application_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      value={formData.plan_type}
                      onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
                    >
                      <option value="KT">KT</option>
                      <option value="Reverse-KT">Reverse-KT</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Scope Description</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Enter main topics or scope details"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {generating ? 'Generating...' : 'Generate Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Card 2: Generate Plan with Document */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between border-l-4 border-l-blue-600 h-full">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FileUp className="mr-2 text-blue-600" size={20} />
                    Generate Plan with Document
                  </h3>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-100">
                    PDF / DOC File
                  </span>
                </div>

                {/* Document Upload Option */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Upload (.pdf, .doc, .docx)</label>
                  <div className="relative border-2 border-dashed border-blue-200 rounded-lg p-2.5 hover:border-blue-400 transition-colors bg-blue-50/40">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleDocFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center font-medium text-blue-800 truncate pr-2">
                        <Upload className="mr-2 text-blue-600 flex-shrink-0" size={16} />
                        {selectedFile ? selectedFile.name : 'Click or drop PDF / Word file here...'}
                      </span>
                      {analyzingDoc && (
                        <span className="text-blue-600 animate-pulse font-semibold flex items-center flex-shrink-0">
                          <RefreshCw className="mr-1 animate-spin" size={12} /> Extracting info...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleGenerateWithDoc} className="flex-1 flex flex-col justify-between space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                    <input
                      type="text" required
                      disabled={!isDocExtracted || analyzingDoc}
                      placeholder={isDocExtracted ? "Extracted Plan Name" : "Upload document to unlock"}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      value={docFormData.application_name}
                      onChange={(e) => setDocFormData({...docFormData, application_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                    <select
                      disabled={!isDocExtracted || analyzingDoc}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      value={docFormData.plan_type}
                      onChange={(e) => setDocFormData({...docFormData, plan_type: e.target.value})}
                    >
                      <option value="KT">KT</option>
                      <option value="Reverse-KT">Reverse-KT</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Scope Description</label>
                    <textarea
                      required
                      rows={2}
                      disabled={!isDocExtracted || analyzingDoc}
                      placeholder={isDocExtracted ? "Main topic names extracted from document" : "Upload document to unlock & auto-fill"}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            stakeholders={stakeholders}
            onAssignManager={handleAssignManager}
            onPlanUpdate={handlePlanUpdate}
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
