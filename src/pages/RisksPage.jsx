import React, { useState, useEffect } from 'react';
import { getPlans, getRisks, detectRisks, escalateRisk, getStakeholders, getAssignedRisks, addRiskComment, updateRiskStatus } from '../api/api';
import Loader from '../components/Loader';
import { AlertTriangle, AlertCircle, Send, Check } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const { activeOperations, startOperation, endOperation } = useOperations();
  const detecting = activeOperations['risk-detection'];

  // Modal State
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [riskToEscalate, setRiskToEscalate] = useState(null);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [initialNote, setInitialNote] = useState('');
  const [escalationSuccess, setEscalationSuccess] = useState(false);

  // Manager Approval/Rejection State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [riskToReject, setRiskToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSuccess, setRejectSuccess] = useState(false);

  // Comment State for Assigned Risks
  const [commentInputs, setCommentInputs] = useState({});

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
    try {
      const res = await getRisks(selectedPlanId);
      setRisks(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssignedRisks = async () => {
      try {
          const res = await getAssignedRisks();
          setAssignedRisks(res.data.data);
      } catch(err) {
          console.error(err);
      }
  }

  const handleDetectRisks = async () => {
    if (!selectedPlanId) return;
    startOperation('risk-detection');
    try {
      await detectRisks(selectedPlanId);
      fetchRisks();
    } catch (err) {
      alert('Error detecting risks');
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
      if (selectedAssignees.length === 0) return alert("Select at least one assignee");
      try {
          await escalateRisk(riskToEscalate, selectedAssignees, initialNote);
          setEscalationSuccess(true);
          fetchRisks();
          setTimeout(() => {
              setShowEscalateModal(false);
          }, 2000);
      } catch(err) {
          alert('Error escalating risk');
      }
  }

  const handleStatusChange = async (riskId, newStatus) => {
      try {
          const txt = commentInputs[riskId];
          if (txt && txt.trim()) {
              await addRiskComment(riskId, txt);
              setCommentInputs({...commentInputs, [riskId]: ''});
          }
          await updateRiskStatus(riskId, newStatus);
          if (user?.role === 'Delivery / Engagement Manager') {
              fetchRisks();
          } else {
              fetchAssignedRisks();
          }
      } catch(err) {
          alert('Error updating status');
      }
  }

  const handleAddComment = async (riskId) => {
      const txt = commentInputs[riskId];
      if (!txt || !txt.trim()) return;
      try {
          await addRiskComment(riskId, txt);
          setCommentInputs({...commentInputs, [riskId]: ''});
          if (user?.role === 'Delivery / Engagement Manager') {
              fetchRisks();
          } else {
              fetchAssignedRisks();
          }
      } catch(err) {
          alert('Error adding comment');
      }
  }

  const handleApproveRisk = async (riskId) => {
      try {
          await updateRiskStatus(riskId, 'solved');
          fetchRisks();
      } catch (err) {
          alert('Error approving risk');
      }
  };

  const openRejectModal = (risk) => {
      setRiskToReject(risk.id);
      setRejectReason('');
      setRejectSuccess(false);
      setShowRejectModal(true);
  };

  const handleRejectRisk = async () => {
      try {
          if (rejectReason.trim()) {
              await addRiskComment(riskToReject, `Rejected: ${rejectReason}`);
          }
          await updateRiskStatus(riskToReject, 'open');
          setRejectSuccess(true);
          fetchRisks();
          setTimeout(() => {
              setShowRejectModal(false);
          }, 2000);
      } catch (err) {
          alert('Error rejecting risk');
      }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
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
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <AlertTriangle className="mr-2 text-indigo-500" /> Assigned Risks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assignedRisks.map(risk => {
                    const isLocked = risk.status === 'solved' || risk.status === 'resolved';
                    const isWaiting = risk.status === 'waiting_for_approval';
                    return (
                        <div key={risk.id} className={`rounded-xl shadow-sm border p-5 ${isLocked ? 'bg-green-100 text-green-800 border-green-200' : getSeverityColor(risk.severity)} bg-opacity-30`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white shadow-sm ${isLocked ? 'text-green-700' : ''}`}>
                                    {isLocked ? 'SOLVED' : risk.severity}
                                </span>
                                <select 
                                    value={risk.status} 
                                    disabled={isLocked || isWaiting}
                                    onChange={(e) => handleStatusChange(risk.id, e.target.value)}
                                    className={`text-xs font-semibold rounded bg-white border border-gray-300 px-2 py-1 focus:outline-none ${(isLocked || isWaiting) ? 'opacity-50' : ''}`}
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="waiting_for_approval">Waiting for Approval</option>
                                </select>
                            </div>
                            <p className="text-sm font-medium mb-4 leading-relaxed">{risk.description}</p>
                            
                            {isWaiting && (
                                <div className="mt-2 mb-2 p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium flex items-center">
                                    <AlertCircle size={14} className="mr-2" /> Pending Approval from Manager
                                </div>
                            )}
                            
                            {/* Comments Section */}
                            <div className="mt-4 bg-white bg-opacity-70 rounded-lg p-4 max-h-48 overflow-y-auto border border-white">
                                <h4 className={`text-xs font-bold uppercase mb-2 ${risk.comments?.length > 0 && risk.comments[risk.comments.length - 1].comment_text.startsWith('Rejected:') ? 'text-red-500' : 'text-gray-500'}`}>
                                    {risk.comments?.length > 0 && risk.comments[risk.comments.length - 1].comment_text.startsWith('Rejected:') ? 'Rejection Reason' : 'Resolution Updates'}
                                </h4>
                                {risk.comments && risk.comments.length > 0 ? (
                                    <div className="space-y-3">
                                        {risk.comments.map(c => (
                                            <div key={c.id} className="text-sm">
                                                <span className="font-semibold text-gray-800">{c.stakeholder_name}: </span>
                                                <span className="text-gray-700">{c.comment_text}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No updates yet.</p>
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
                                        className="bg-indigo-600 text-white px-3 py-2 rounded-r-md hover:bg-indigo-700 border border-indigo-600 transition-colors"
                                    >
                                        <Send size={16} />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {risks.map((risk) => {
          const isSolved = risk.status === 'solved' || risk.status === 'resolved';
          return (
          <div key={risk.id} className={`rounded-xl shadow-sm border p-5 ${isSolved ? 'bg-green-100 text-green-800 border-green-200' : getSeverityColor(risk.severity)} bg-opacity-50`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white shadow-sm ${isSolved ? 'text-green-700' : ''}`}>
                {isSolved ? 'SOLVED' : risk.severity}
              </span>
              <span className="text-xs font-medium opacity-75">{new Date(risk.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm font-medium mb-4 leading-relaxed">{risk.description}</p>
            {risk.assigned_stakeholders && risk.assigned_stakeholders.length > 0 && (
                <div className="mb-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Assigned to:</span>
                    <div className="flex flex-wrap gap-1">
                        {risk.assigned_stakeholders.map((name, idx) => (
                            <span key={idx} className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded shadow-sm font-medium">
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Comments Section for Managers */}
            {isManager && risk.comments && risk.comments.length > 0 && (
                <div className="mb-4 bg-white bg-opacity-70 rounded-lg p-3 max-h-32 overflow-y-auto border border-gray-100 shadow-inner">
                    <h4 className={`text-xs font-bold uppercase mb-2 ${risk.comments[risk.comments.length - 1].comment_text.startsWith('Rejected:') ? 'text-red-500' : 'text-gray-500'}`}>
                        {risk.comments[risk.comments.length - 1].comment_text.startsWith('Rejected:') ? 'Rejection Reason' : 'Resolution Updates'}
                    </h4>
                    <div className="space-y-2">
                        {risk.comments.map(c => (
                            <div key={c.id} className="text-xs">
                                <span className="font-semibold text-gray-800">{c.stakeholder_name}: </span>
                                <span className="text-gray-700">{c.comment_text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Manager Comment Input for Self-Assigned Risks */}
            {isManager && risk.assigned_stakeholders && risk.assigned_stakeholders.includes(user?.name) && !isSolved && (
                <div className="mt-2 mb-4 flex shadow-sm">
                    <input 
                        type="text" 
                        placeholder="Add an update..."
                        value={commentInputs[risk.id] || ''}
                        onChange={(e) => setCommentInputs({...commentInputs, [risk.id]: e.target.value})}
                        className="flex-1 text-xs border border-gray-300 border-r-0 rounded-l-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button 
                        onClick={() => handleAddComment(risk.id)}
                        className="bg-indigo-600 text-white px-3 py-2 rounded-r-md hover:bg-indigo-700 border border-indigo-600 transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </div>
            )}
            
            <div className="flex justify-between items-center border-t pt-3 border-black border-opacity-10">
              {risk.assigned_stakeholders && risk.assigned_stakeholders.includes(user?.name) ? (
                  <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold capitalize opacity-75">Status:</span>
                      <select 
                          value={risk.status}
                          disabled={isSolved}
                          onChange={(e) => handleStatusChange(risk.id, e.target.value)}
                          className={`text-xs font-semibold rounded bg-white border border-gray-300 px-1 py-1 focus:outline-none ${isSolved ? 'opacity-50' : ''}`}
                      >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="solved">Solved</option>
                      </select>
                  </div>
              ) : (
                  <span className={`text-xs font-semibold capitalize opacity-75 ${isSolved ? 'text-green-700' : ''}`}>
                    Status: {risk.status}
                  </span>
              )}
              <div className="flex space-x-2">
                  {(risk.status === 'open' || risk.status === 'in_progress') && isManager && (
                    <button
                      onClick={() => openEscalateModal(risk)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded bg-white hover:bg-gray-50 shadow-sm transition-colors border"
                    >
                      <AlertCircle size={14} className="mr-1" /> Escalate
                    </button>
                  )}
                  {risk.status === 'waiting_for_approval' && isManager && (
                    <>
                        <button
                          onClick={() => handleApproveRisk(risk.id)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 shadow-sm transition-colors"
                        >
                          <Check size={14} className="mr-1" /> Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(risk)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors"
                        >
                          Reject
                        </button>
                    </>
                  )}
              </div>
            </div>
          </div>
          );
        })}
        {risks.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No risks detected for this plan. Run AI detection to analyze tracking data, uploaded knowledge documents, and related tickets to flag risks.
          </div>
        )}
      </div>
      
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

      {/* Reject Modal */}
      {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Risk Resolution</h3>
                  
                  {rejectSuccess && (
                      <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md flex items-center shadow-sm">
                          <Check size={18} className="mr-2" />
                          <span className="text-sm font-medium">Risk resolution rejected successfully!</span>
                      </div>
                  )}

                  {!rejectSuccess && (
                      <>
                          <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason (Optional)</label>
                              <textarea
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Provide feedback on why this is rejected..."
                                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-3"
                                  rows={3}
                              />
                          </div>

                          <div className="flex justify-end space-x-3 pt-4 border-t">
                              <button 
                                  onClick={() => setShowRejectModal(false)}
                                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                  Cancel
                              </button>
                              <button 
                                  onClick={handleRejectRisk}
                                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm"
                              >
                                  Reject Risk
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default RisksPage;
