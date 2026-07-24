import React, { useState, useEffect } from 'react';
import { getPlans, getRisks, detectRisks, escalateRisk, getStakeholders, getAssignedRisks, addRiskComment, updateRiskStatus } from '../api/api';
import Loader from '../components/Loader';
import { AlertTriangle, AlertCircle, Send, Check, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';
import ManagerWiseRiskView from '../components/ManagerWiseRiskView';

const RisksPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [risks, setRisks] = useState([]);
  const [assignedRisks, setAssignedRisks] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [commentSubmittingId, setCommentSubmittingId] = useState(null);
  
  const { activeOperations, startOperation, endOperation } = useOperations();
  const detecting = activeOperations['risk-detection'];

  // Modal State
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [riskToEscalate, setRiskToEscalate] = useState(null);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [initialNote, setInitialNote] = useState('');
  const [escalationSuccess, setEscalationSuccess] = useState(false);

  // Comment State for Assigned Risks
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedDesc, setExpandedDesc] = useState({});

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [decisionModal, setDecisionModal] = useState({ isOpen: false, type: 'approve', riskId: null, note: '' });

  const openDecisionModal = (riskId, type) => {
      setDecisionModal({ isOpen: true, type, riskId, note: '' });
  };

  const submitDecision = async () => {
      const { riskId, type, note } = decisionModal;
      setDecisionSubmitting(true);
      try {
          const action = type === 'approve' ? 'Approved' : 'Rejected';
          const d = new Date();
          const ts = d.getFullYear() + '-' + 
                     String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(d.getDate()).padStart(2, '0') + ' ' + 
                     String(d.getHours()).padStart(2, '0') + ':' + 
                     String(d.getMinutes()).padStart(2, '0');
          const auditMsg = `[AUDIT] ${action} by ${user?.name} • ${ts}`;
          
          let finalStatus = type === 'approve' ? 'solved' : 'open';
          let baseComment = note.trim() ? `${auditMsg}\n${note}` : auditMsg;
          
          await addRiskComment(riskId, baseComment);
          await updateRiskStatus(riskId, finalStatus);
          
          setDecisionModal({ isOpen: false, type: 'approve', riskId: null, note: '' });
          showToast(`Risk ${action} successfully!`, 'success');
          fetchRisks();
      } catch(err) {
          showToast('Error processing decision', 'error');
      } finally {
          setDecisionSubmitting(false);
      }
  };

  const toggleDesc = (riskId) => {
      setExpandedDesc(prev => ({...prev, [riskId]: !prev[riskId]}));
  };

  useEffect(() => {
    const fetchInit = async () => {
      try {
        if (user?.role === 'Delivery / Engagement Manager' || user?.role === 'leadership' || user?.role === 'PwC Leadership') {
            const res = await getPlans();
            const approvedPlans = res.data.data.filter(p => p.status === 'approved');
            setPlans(approvedPlans);
            if (user?.role === 'Delivery / Engagement Manager') {
                const stkRes = await getStakeholders();
                const allStk = stkRes.data.data;
                const giversReceivers = allStk.filter(s => s.role.includes('Knowledge Giver') || s.role.includes('Knowledge Receiver'));
                const selfManager = allStk.find(s => (s.role.includes('Engagement') || s.role.includes('Manager') || s.role.includes('manager')) && s.name === user?.name);
                
                const filtered = [...giversReceivers];
                if (selfManager) {
                    filtered.unshift(selfManager);
                }
                setStakeholders(filtered);
            }
        } else if (user?.role === 'Outgoing SME (Knowledge Giver)' || user?.role === 'Incoming Team Member (Knowledge Receiver)') {
            fetchAssignedRisks();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, [user]);

  useEffect(() => {
    if (selectedPlanId && user?.role === 'Delivery / Engagement Manager') {
      fetchRisks();
    }
  }, [selectedPlanId]);

  const fetchRisks = async () => {
    setLoadingRisks(true);
    try {
      const res = await getRisks(selectedPlanId);
      setRisks(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRisks(false);
    }
  };

  const fetchAssignedRisks = async () => {
      setLoadingRisks(true);
      try {
          const res = await getAssignedRisks();
          setAssignedRisks(res.data.data);
      } catch(err) {
          console.error(err);
      } finally {
          setLoadingRisks(false);
      }
  }

  const handleDetectRisks = async () => {
    if (!selectedPlanId) return;
    startOperation('risk-detection');
    try {
      await detectRisks(selectedPlanId);
      await fetchRisks();
      showToast('AI Risk Detection Complete', 'success');
    } catch (err) {
      showToast('Error detecting risks', 'error');
    } finally {
      endOperation('risk-detection');
    }
  };

  const openEscalateModal = (risk) => {
      setRiskToEscalate(risk.id);
      setSelectedAssignees(risk.assigned_to || []);
      setInitialNote('');
      setEscalationSuccess(false);
      setShowEscalateModal(true);
  };

  const submitEscalation = async () => {
      if (selectedAssignees.length === 0) return showToast("Select at least one assignee", 'error');
      try {
          await escalateRisk(riskToEscalate, selectedAssignees, initialNote);
          setEscalationSuccess(true);
          fetchRisks();
          setTimeout(() => {
              setShowEscalateModal(false);
          }, 2000);
      } catch(err) {
          showToast('Error escalating risk', 'error');
      }
  }

  const handleStatusChange = async (riskId, newStatus) => {
      setUpdatingStatusId(riskId);
      try {
          const txt = commentInputs[riskId];
          if (txt && txt.trim()) {
              await addRiskComment(riskId, txt);
              setCommentInputs({...commentInputs, [riskId]: ''});
          }
          await updateRiskStatus(riskId, newStatus);
          if (user?.role === 'Delivery / Engagement Manager') {
              await fetchRisks();
          } else {
              await fetchAssignedRisks();
          }
          showToast('Status updated successfully!', 'success');
      } catch(err) {
          showToast('Error updating status', 'error');
      } finally {
          setUpdatingStatusId(null);
      }
  }

  const handleManagerStatusChange = async (riskId, newStatus) => {
      setUpdatingStatusId(riskId);
      try {
          const txt = commentInputs[riskId] || '';
          let finalStatus = newStatus;
          
          let baseComment = txt;
          if (newStatus === 'solved' || newStatus === 'rejected') {
              const action = newStatus === 'solved' ? 'Approved' : 'Rejected';
              const d = new Date();
              const ts = d.getFullYear() + '-' + 
                         String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(d.getDate()).padStart(2, '0') + ' ' + 
                         String(d.getHours()).padStart(2, '0') + ':' + 
                         String(d.getMinutes()).padStart(2, '0');
              const auditMsg = `[AUDIT] ${action} by ${user?.name} • ${ts}`;
              baseComment = txt.trim() ? `${auditMsg}\n${txt}` : auditMsg;
              
              if (newStatus === 'rejected') {
                  finalStatus = 'open'; // Revert to open on reject, per legacy behavior
              }
          }
          
          if (baseComment.trim()) {
              await addRiskComment(riskId, baseComment);
              setCommentInputs({...commentInputs, [riskId]: ''});
          }
          
          await updateRiskStatus(riskId, finalStatus);
          await fetchRisks();
          showToast('Status updated successfully!', 'success');
      } catch(err) {
          showToast('Error updating status', 'error');
      } finally {
          setUpdatingStatusId(null);
      }
  }

  const handleAddComment = async (riskId) => {
      const txt = commentInputs[riskId];
      if (!txt || !txt.trim()) return;
      setCommentSubmittingId(riskId);
      try {
          await addRiskComment(riskId, txt);
          setCommentInputs({...commentInputs, [riskId]: ''});
          if (user?.role === 'Delivery / Engagement Manager') {
              fetchRisks();
          } else {
              fetchAssignedRisks();
          }
      } catch(err) {
          showToast('Error adding comment', 'error');
      } finally {
          setCommentSubmittingId(null);
      }
  }

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleComments = (riskId) => {
      setExpandedComments(prev => ({...prev, [riskId]: !prev[riskId]}));
  };

  if (loading) return <Loader />;

  if (user?.role === 'leadership' || user?.role === 'PwC Leadership') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <AlertTriangle className="mr-2 text-red-500" /> AI Risk Detection & Oversight
        </h2>

        <ManagerWiseRiskView 
          refreshTrigger={detecting} 
          renderHeader={() => (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center h-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan to Analyze</label>
              <div className="flex items-center justify-between w-full">
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md mr-4"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="" disabled>---Select Plan---</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.application_name}</option>
                  ))}
                </select>
                <button
                  onClick={handleDetectRisks}
                  disabled={detecting || !selectedPlanId}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {detecting ? 'Analyzing...' : 'Run AI Risk Detection'}
                </button>
              </div>
            </div>
          )}
        />
      </div>
    );
  }

  if (user?.role === 'Outgoing SME (Knowledge Giver)' || user?.role === 'Incoming Team Member (Knowledge Receiver)') {
      return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-6">
                <AlertTriangle className="mr-2 text-indigo-500" /> Assigned Risks
            </h2>
            {(loading || loadingRisks) ? (
                <div className="p-12 flex justify-center items-center bg-white rounded-xl shadow-sm border border-gray-100">
                    <Loader />
                </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {assignedRisks.map(risk => {
                    const isLocked = risk.status === 'solved' || risk.status === 'resolved';
                    const isWaiting = risk.status === 'deferred';
                    return (
                        <div key={risk.id} className={`rounded-xl shadow-sm border p-4 flex flex-col h-full ${isLocked ? 'bg-green-100 text-green-800 border-green-200' : getSeverityColor(risk.severity)} bg-opacity-30`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white shadow-sm ${isLocked ? 'text-green-700' : ''}`}>
                                    {isLocked ? 'SOLVED' : risk.severity}
                                </span>
                                {updatingStatusId === risk.id ? (
                                    <div className="flex items-center text-xs font-semibold text-gray-500 bg-white border border-gray-300 px-3 py-1 rounded shadow-sm">
                                        <Loader2 className="animate-spin mr-2" size={14} /> Updating...
                                    </div>
                                ) : (
                                    <select 
                                        value={risk.status} 
                                        disabled={isLocked || isWaiting}
                                        onChange={(e) => handleStatusChange(risk.id, e.target.value)}
                                        className={`text-xs font-semibold rounded bg-white border border-gray-300 px-2 py-1 focus:outline-none ${(isLocked || isWaiting) ? 'opacity-50' : ''}`}
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="deferred">Request for Approval</option>
                                    </select>
                                )}
                            </div>
                            <div className="mb-4 flex-grow">
                                <p className="text-sm font-medium leading-relaxed">
                                    {risk.description}
                                </p>
                            </div>
                            {isWaiting && (
                                <div className="mt-2 mb-2 p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium flex items-center">
                                    <AlertCircle size={14} className="mr-2" /> Pending Approval from Manager
                                </div>
                            )}
                            
                            {/* Comments Section */}
                            <div className="mt-4 bg-white bg-opacity-70 rounded-lg border border-white">
                                <div 
                                    className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
                                    onClick={() => toggleComments(risk.id)}
                                >
                                    <h4 className={`text-xs font-bold uppercase ${risk.comments?.length > 0 && risk.comments[risk.comments.length - 1].comment_text.includes('Rejected:') ? 'text-red-500' : 'text-gray-500'}`}>
                                        Approve/Reject Comments
                                    </h4>
                                    {expandedComments[risk.id] ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </div>
                                {expandedComments[risk.id] && (
                                    <div className="p-4 pt-0 max-h-48 overflow-y-auto border-t border-gray-100">
                                        {risk.comments && risk.comments.length > 0 ? (
                                            <div className="space-y-3 mt-3">
                                                {risk.comments.map(c => (
                                                    <div key={c.id} className="text-sm">
                                                        <span className="font-semibold text-gray-800">{c.stakeholder_name}: </span>
                                                        <span className="text-gray-700">{c.comment_text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 italic mt-3">No updates yet.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            {!isLocked && !isWaiting && (
                                <div className="mt-3 flex shadow-sm">
                                    <input 
                                        type="text" 
                                        placeholder="Add an update..."
                                        value={commentInputs[risk.id] || ''}
                                        onChange={(e) => setCommentInputs({...commentInputs, [risk.id]: e.target.value})}
                                        className="flex-1 text-sm border border-gray-300 border-r-0 rounded-l-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <button 
                                        onClick={() => handleAddComment(risk.id)}
                                        disabled={commentSubmittingId === risk.id}
                                        className="bg-indigo-600 text-white px-3 py-2 rounded-r-md hover:bg-indigo-700 border border-indigo-600 transition-colors"
                                    >
                                        {commentSubmittingId === risk.id ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {assignedRisks.length === 0 && (
                    <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                        You have no assigned risks to resolve.
                    </div>
                )}
            </div>
            )}
        </div>
      );
  }

  const isManager = user?.role === 'Delivery / Engagement Manager';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <AlertTriangle className="mr-2 text-red-500" /> AI Risk Detection
      </h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div className="flex-1 max-w-md mr-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            <option value="" disabled>---Select Plan---</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.application_name}</option>
            ))}
          </select>
        </div>
        {isManager && (
          <button
            onClick={handleDetectRisks}
            disabled={detecting || !selectedPlanId}
            className="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {detecting ? 'Analyzing Data...' : 'Run AI Risk Detection'}
          </button>
        )}
      </div>

      {(loadingRisks || detecting) ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-xl shadow-sm border border-gray-100">
              <Loader />
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {risks.map((risk) => {
              const isSolved = risk.status === 'solved' || risk.status === 'resolved';
              const isDeferred = risk.status === 'deferred';
              const isSelfAssigned = risk.assigned_stakeholders && risk.assigned_stakeholders.length > 0 && risk.assigned_stakeholders.includes(user?.name);
              
              // Extract audit info from comments
              let auditLog = null;
              const nonAuditComments = [];
              
              if (risk.comments) {
                  risk.comments.forEach(c => {
                      if (c.comment_text.startsWith('[AUDIT]')) {
                          const parts = c.comment_text.split('\n');
                          auditLog = parts[0].replace('[AUDIT] ', '').replace('Approved / Resolved', 'Approved');
                          if (parts.length > 1) {
                              nonAuditComments.push({...c, comment_text: parts.slice(1).join('\n')});
                          }
                      } else {
                          nonAuditComments.push(c);
                      }
                  });
              }

              return (
              <div key={risk.id} className={`rounded-xl shadow-sm border p-4 flex flex-col h-full ${isSolved ? 'bg-green-100 text-green-800 border-green-200' : getSeverityColor(risk.severity)} bg-opacity-50`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white shadow-sm ${isSolved ? 'text-green-700' : ''}`}>
                    {isSolved ? 'SOLVED' : risk.severity}
                  </span>
                  <span className="text-xs font-medium opacity-75">{new Date(risk.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="mb-3 flex-grow">
                    <p className="text-sm font-medium leading-relaxed">
                        {risk.description}
                    </p>
                </div>
                
                {auditLog && (
                    <div className="mb-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 shadow-sm self-start">
                        {auditLog.includes('Approved') ? <Check size={12} className="mr-1.5 text-green-600 flex-shrink-0" /> : <X size={12} className="mr-1.5 text-red-600 flex-shrink-0" />}
                        <span>{auditLog}</span>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                    {risk.assigned_stakeholders && risk.assigned_stakeholders.length > 0 ? (
                        <div>
                            <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Assigned to:</span>
                            <div className="flex flex-wrap gap-1">
                                {risk.assigned_stakeholders.map((name, idx) => (
                                    <span key={idx} className="bg-white border border-gray-200 text-gray-700 text-[10px] px-1.5 py-0.5 rounded shadow-sm font-medium">
                                        {name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : <div></div>}
                    
                    <div className="flex flex-col justify-end">
                        {(!isSelfAssigned && isDeferred) ? (
                            <>
                                <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Status: Pending for Approval</span>
                                <div className="flex gap-2">
                                    <button onClick={() => openDecisionModal(risk.id, 'approve')} className="flex-1 bg-green-600 text-white text-[11px] font-bold py-1.5 rounded shadow-sm hover:bg-green-700 transition-colors">Approve</button>
                                    <button onClick={() => openDecisionModal(risk.id, 'reject')} className="flex-1 bg-red-600 text-white text-[11px] font-bold py-1.5 rounded shadow-sm hover:bg-red-700 transition-colors">Reject</button>
                                </div>
                            </>
                        ) : isSelfAssigned ? (
                            <>
                                <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Status:</span>
                                <select 
                                    value={risk.status === 'resolved' ? 'solved' : risk.status}
                                    disabled={isSolved}
                                    onChange={(e) => handleManagerStatusChange(risk.id, e.target.value)}
                                    className={`text-xs font-semibold rounded bg-white border border-gray-300 px-2 py-1.5 focus:outline-none w-full shadow-sm ${isSolved ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="deferred">Deferred</option>
                                    <option value="solved">Solved</option>
                                </select>
                            </>
                        ) : (
                            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                Status: <span className="text-gray-500 capitalize ml-1">{risk.status === 'resolved' || risk.status === 'solved' ? 'Approved' : risk.status.replace('_', ' ')}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Collapsible Comments Section for Managers */}
                {isManager && nonAuditComments && nonAuditComments.length > 0 && (
                    <div className="mb-3 bg-white bg-opacity-70 rounded-lg border border-gray-100 shadow-inner overflow-hidden">
                        <div 
                            className="p-2.5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleComments(risk.id)}
                        >
                            <h4 className="text-[10px] font-bold uppercase text-gray-500">
                                Approve/Reject Comments
                            </h4>
                            {expandedComments[risk.id] ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>
                        {expandedComments[risk.id] && (
                            <div className="p-3 pt-0 max-h-32 overflow-y-auto border-t border-gray-100">
                                <div className="space-y-2 mt-2">
                                    {nonAuditComments.map(c => (
                                        <div key={c.id} className="text-xs">
                                            <span className="font-semibold text-gray-800">{c.stakeholder_name}: </span>
                                            <span className="text-gray-700">{c.comment_text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {isManager && isSelfAssigned && !isSolved && (
                    <div className="mb-3 flex shadow-sm">
                        <input 
                            type="text" 
                            placeholder="Add an update..."
                            value={commentInputs[risk.id] || ''}
                            onChange={(e) => setCommentInputs({...commentInputs, [risk.id]: e.target.value})}
                            className="flex-1 text-sm border border-gray-300 border-r-0 rounded-l-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button 
                            onClick={() => handleAddComment(risk.id)}
                            disabled={commentSubmittingId === risk.id}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-r-md hover:bg-indigo-700 border border-indigo-600 transition-colors"
                        >
                            {commentSubmittingId === risk.id ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                        </button>
                    </div>
                )}
                
                {(risk.status === 'open' || risk.status === 'in_progress') && isManager && (
                  <button
                    onClick={() => openEscalateModal(risk)}
                    className="w-full inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold rounded bg-white hover:bg-gray-50 shadow-sm transition-colors border mt-auto"
                  >
                    <AlertCircle size={14} className="mr-1.5 text-gray-500" /> Assign & Escalate
                  </button>
                )}
              </div>
              );
            })}
            {risks.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                No risks detected for this plan. Run AI detection to analyze tracking data, uploaded knowledge documents, and related tickets to flag risks.
              </div>
            )}
          </div>
      )}
      
      {/* Escalate Modal */}
      {showEscalateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Risk to Team Members</h3>
                  
                  {escalationSuccess && (
                      <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md flex items-center shadow-sm">
                          <Check size={18} className="mr-2" />
                          <span className="text-sm font-medium">Risk assigned & escalated successfully!</span>
                      </div>
                  )}

                  {!escalationSuccess && (
                      <>
                          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto p-1">
                              {stakeholders.map(stk => {
                                  const isSelf = stk.name === user?.name;
                                  return (
                                  <label key={stk.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                                      <input 
                                          type="checkbox" 
                                          className="form-checkbox h-4 w-4 text-indigo-600 mr-3 rounded"
                                          checked={selectedAssignees.includes(stk.id)}
                                          onChange={(e) => {
                                              if (e.target.checked) setSelectedAssignees([...selectedAssignees, stk.id]);
                                              else setSelectedAssignees(selectedAssignees.filter(id => id !== stk.id));
                                          }}
                                      />
                                      <div>
                                          <div className="text-sm font-semibold text-gray-900">{isSelf ? 'Self (Manager)' : stk.name}</div>
                                          <div className="text-xs text-gray-500">{stk.role}</div>
                                      </div>
                                  </label>
                                  );
                              })}
                              {stakeholders.length === 0 && (
                                  <div className="text-sm text-gray-500 italic">No assignable team members found.</div>
                              )}
                          </div>
                          
                          <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Initial Note / Instructions (Optional)</label>
                              <textarea
                                  value={initialNote}
                                  onChange={(e) => setInitialNote(e.target.value)}
                                  placeholder="Provide any context or instructions to the assignees..."
                                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-3"
                                  rows={3}
                              />
                          </div>

                          <div className="flex justify-end space-x-3 pt-4 border-t">
                              <button 
                                  onClick={() => setShowEscalateModal(false)}
                                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                  Cancel
                              </button>
                              <button 
                                  onClick={submitEscalation}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                              >
                                  Assign & Escalate
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* Decision Modal */}
      {decisionModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {decisionModal.type === 'approve' ? 'Approve Risk Resolution' : 'Reject Risk Resolution'}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                      {decisionModal.type === 'approve' 
                          ? 'This will mark the risk as Approved/Solved.' 
                          : 'This will reject the resolution and reopen the risk.'}
                  </p>
                  
                  <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manager Note (Optional)</label>
                      <textarea
                          value={decisionModal.note}
                          onChange={(e) => setDecisionModal({ ...decisionModal, note: e.target.value })}
                          placeholder="Provide any feedback or instructions..."
                          className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-3"
                          rows={3}
                      />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button 
                          onClick={() => setDecisionModal({ isOpen: false, type: 'approve', riskId: null, note: '' })}
                          className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                          disabled={decisionSubmitting}
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={submitDecision}
                          disabled={decisionSubmitting}
                          className={`px-4 py-2 text-white rounded-md transition-colors shadow-sm flex items-center text-sm ${decisionModal.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${decisionSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                          {decisionSubmitting && <Loader2 className="animate-spin mr-2" size={14} />}
                          Confirm {decisionModal.type === 'approve' ? 'Approval' : 'Rejection'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
          <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium flex items-center ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
              {toast.type === 'error' ? <AlertTriangle className="mr-2 h-5 w-5" /> : <Check className="mr-2 h-5 w-5" />}
              {toast.message}
          </div>
      )}
    </div>
  );
};

export default RisksPage;
