import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect } from 'react';
import { getMeetings, createMeeting, bulkScheduleMeetings, updateMeetingStatus, getPlans, getProjects, notifyMeeting, notifyRequirements, rescheduleMeeting, getStakeholders, getAttendance, markAttendance, getMeetingFeedback, submitMeetingFeedback, getResourceMappings, getSudDocuments, getResults, getPlanTopicOptions } from '../api/api';
import Loader from '../components/Loader';
import { Calendar, Bell, CheckCircle, ClipboardList, Clock, Star, UploadCloud, File, X, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';
import * as XLSX from 'xlsx-js-style';

const MultiSelectDropdown = ({ options, selected, onChange, label, placeholder, visibleCount = 4, isOptionDisabledFn, optionClassFn }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="block text-sm font-medium text-gray-700 mb-1">{label}</div>
      <div
        className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md bg-light-background cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-gray-700">
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <svg className="w-4 h-4 text-secondary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
      {isOpen && (
        <div 
          className="absolute z-10 mt-1 w-full bg-light-background border border-light-border rounded-md shadow-lg overflow-y-auto"
          style={{ maxHeight: `${(visibleCount * 32) + ((visibleCount - 1) * 4) + 16}px` }}
        >
          {options.length === 0 ? (
            <div className="p-3 text-sm text-secondary-text">No options available.</div>
          ) : (
            <div className="p-2 space-y-1">
              {options.map(opt => {
                const isDisabled = isOptionDisabledFn ? isOptionDisabledFn(opt) : false;
                const extraClass = optionClassFn ? optionClassFn(opt) : '';
                return (
                  <label key={opt.id} className={`flex items-center px-2 py-1.5 rounded ${isDisabled ? 'cursor-not-allowed' : 'hover:bg-light-background cursor-pointer'} ${extraClass}`}>
                    <input
                      type="checkbox"
                      className={`rounded text-primary-orange focus:ring-orange-border mr-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      checked={selected.includes(opt.id)}
                      disabled={isDisabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onChange([...selected, opt.id]);
                        } else {
                          onChange(selected.filter(id => id !== opt.id));
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">{opt.name} <span className="text-secondary-text text-xs">({opt.role})</span></span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SchedulePage = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [knowledgeGivers, setKnowledgeGivers] = useState([]);
  const [selectedStakeholders, setSelectedStakeholders] = useState([]);
  const [selectedOrganizers, setSelectedOrganizers] = useState([]);
  
  // Specific Requirement Email Recipients
  const [selectedSudRecipients, setSelectedSudRecipients] = useState([]);
  const [shadowMappings, setShadowMappings] = useState([{ organizerId: '', participantIds: [] }]);
  const [selectedLeadRecipients, setSelectedLeadRecipients] = useState([]);
  const [selectedFinalAssessmentRecipients, setSelectedFinalAssessmentRecipients] = useState([]);
  const [activeGlobalTab, setActiveGlobalTab] = useState('KA');

  // Computed requirement flags
  const [isSudMandatory, setIsSudMandatory] = useState(false);
  const [isFinalAssessmentMandatory, setIsFinalAssessmentMandatory] = useState(false);
  const [isShadowResourcing, setIsShadowResourcing] = useState(false);
  const [isLeadResourcing, setIsLeadResourcing] = useState(false);
  const [leadResourcingEntryCriteria, setLeadResourcingEntryCriteria] = useState('Only participants who have completed the Shadow Resourcing phase for this plan are eligible to be selected for Lead Resourcing.');
  const [shadowResourcingEntryCriteria, setShadowResourcingEntryCriteria] = useState('Only participants who have submitted SUD documents and scored above 80% in the Final Assessment are eligible.');
  const [mappedShadowResources, setMappedShadowResources] = useState([]);
  
  const [sudDocs, setSudDocs] = useState([]);
  const [assessmentResults, setAssessmentResults] = useState([]);
  const [isForcePushEnabled, setIsForcePushEnabled] = useState(false);
  const [isSudRequiredForSR, setIsSudRequiredForSR] = useState(false);
  const [isAssessmentRequiredForSR, setIsAssessmentRequiredForSR] = useState(false);

  const getAllowedSROrganizers = () => {
    if (!formData.plan_id) return [];
    
    const planMeetings = meetings.filter(m => m.plan_id === parseInt(formData.plan_id));
    const validIds = new Set();
    planMeetings.forEach(m => {
      if (m.all_stakeholder_ids) {
        m.all_stakeholder_ids.forEach(id => validIds.add(id));
      }
    });

    const allUsers = [...knowledgeGivers, ...stakeholders];
    const seen = new Set();
    return allUsers.filter(u => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      if (!validIds.has(u.id)) return false;
      if (!(u.role.includes('Giver') || u.role.includes('outgoing') || u.role.includes('manager') || u.role.includes('Manager'))) return false;
      return true;
    });
  };

  const getAllowedSRParticipants = () => {
    if (!formData.plan_id) return [];
    
    const selectedPlan = plans.find(p => p.id === parseInt(formData.plan_id));
    
    const planMeetings = meetings.filter(m => m.plan_id === parseInt(formData.plan_id));
    const validIds = new Set();
    planMeetings.forEach(m => {
      if (m.all_stakeholder_ids) {
        m.all_stakeholder_ids.forEach(id => validIds.add(id));
      }
    });
    
    const allUsers = [...knowledgeGivers, ...stakeholders];
    const seen = new Set();
    return allUsers.filter(u => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      if (!validIds.has(u.id)) return false;
      if (!(u.role.includes('Receiver') || u.role.includes('incoming'))) return false;
      return true;
    });
  };

  const getAllowedLRStakeholders = () => {
    if (!formData.plan_id) return [];
    
    const selectedPlan = plans.find(p => p.id === parseInt(formData.plan_id));
    if (!selectedPlan || !selectedPlan.shadow_stakeholder_ids) return [];
    
    const validIds = new Set(selectedPlan.shadow_stakeholder_ids);
    return stakeholders.filter(u => validIds.has(u.id));
  };

  const handleShadowMappingParticipantChange = (mappingIndex, newParticipantIds) => {
    const selectedPlan = plans.find(p => p.id === parseInt(formData.plan_id));
    const eligibleParticipantIds = new Set((selectedPlan?.shadow_eligible_stakeholder_ids || []).map(Number));
    const sudSubmittedIds = new Set((selectedPlan?.sud_submitted_stakeholder_ids || []).map(Number));
    const asmtPassedIds = new Set((selectedPlan?.assessment_passed_stakeholder_ids || []).map(Number));
    
    const currentSelection = shadowMappings[mappingIndex].participantIds;
    const addedIds = newParticipantIds.filter(id => !currentSelection.includes(id));
    
    for (const rawId of addedIds) {
      const id = Number(rawId);
      const isParticipant = stakeholders.some(s => Number(s.id) === id);
      if (isParticipant && !eligibleParticipantIds.has(id)) {
        const userObj = stakeholders.find(s => Number(s.id) === id);
        let reasons = [];
        if (!sudSubmittedIds.has(id)) reasons.push("SUD Document not submitted");
        if (!asmtPassedIds.has(id)) reasons.push("Final Assessment score below 80%");
        
        const reasonText = reasons.length > 0 ? ` (${reasons.join(' AND ')})` : '';
        
        setSchedulePopup({
          message: `${userObj?.name} does not meet the Entry Criteria for Shadow Resourcing${reasonText}.`,
          type: 'error'
        });
        return; // Prevent selection
      }
      
      const alreadySelectedInAnother = shadowMappings.some((mapping, idx) => idx !== mappingIndex && mapping.participantIds.includes(id));
      if (alreadySelectedInAnother) {
        const userObj = stakeholders.find(s => Number(s.id) === id);
        setSchedulePopup({
          message: `${userObj?.name} is already assigned to another Organizer.`,
          type: 'error'
        });
        return; // Prevent selection
      }
    }
    
    setShadowMappings(prev => {
      const newMappings = [...prev];
      newMappings[mappingIndex].participantIds = newParticipantIds;
      return newMappings;
    });
  };

  const handleShadowMappingOrganizerChange = (mappingIndex, newIds) => {
    const organizerId = newIds.length > 0 ? newIds[newIds.length - 1] : '';
    
    if (organizerId) {
      const alreadySelected = shadowMappings.some((mapping, idx) => idx !== mappingIndex && String(mapping.organizerId) === String(organizerId));
      if (alreadySelected) {
        setSchedulePopup({
          message: `This Organizer is already mapped to participants. Add more participants to their existing mapping instead.`,
          type: 'error'
        });
        return;
      }
    }
    
    setShadowMappings(prev => {
      const newMappings = [...prev];
      newMappings[mappingIndex].organizerId = organizerId;
      return newMappings;
    });
  };

  const addShadowMapping = () => {
    setShadowMappings(prev => [...prev, { organizerId: '', participantIds: [] }]);
  };

  const removeShadowMapping = (index) => {
    setShadowMappings(prev => prev.filter((_, idx) => idx !== index));
  };

  const [loading, setLoading] = useState(true);
  const { activeOperations, startOperation, endOperation } = useOperations();
  const scheduling = activeOperations['schedule-meeting'];
  const [notifiedId, setNotifiedId] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '',
    plan_id: '',
    scheduled_at: '',
    meeting_link: ''
  });

  const [schedulePopup, setSchedulePopup] = useState(null);
  const [schedulingMode, setSchedulingMode] = useState('manual');
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  const [selectedExcelFiles, setSelectedExcelFiles] = useState([]);
  const excelFileInputRef = React.useRef(null);
  
  const handleDragOverExcel = (e) => {
    e.preventDefault();
  };

  const handleDropExcel = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedExcelFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelectExcel = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedExcelFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveExcelFile = (index) => {
    setSelectedExcelFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkSchedule = async () => {
    if (selectedExcelFiles.length === 0) return;
    setIsUploadingExcel(true);
    
    try {
      const fd = new FormData();
      selectedExcelFiles.forEach(file => {
        fd.append('files', file);
      });
      
      const res = await bulkScheduleMeetings(fd);
      if (res.data && res.data.success) {
        setSchedulePopup({ message: res.data.message || 'Files processed successfully! Automated scheduling complete.', type: 'success' });
        setSelectedExcelFiles([]);
        fetchData();
      } else {
        setSchedulePopup({ message: res.data?.message || 'Error scheduling meetings in bulk', type: 'error' });
      }
    } catch (err) {
      setSchedulePopup({ message: err.response?.data?.message || 'Server error scheduling bulk meetings', type: 'error' });
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceMeeting, setAttendanceMeeting] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [fetchingAttendees, setFetchingAttendees] = useState(false);

  // Reschedule modal state
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null); // meeting being rescheduled
  const [rescheduleDate, setRescheduleDate] = useState(''); // YYYY-MM-DD
  const [rescheduleTime, setRescheduleTime] = useState(''); // HH:MM
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleSubsequent, setRescheduleSubsequent] = useState(false);
  const [resolveOverdueAsCompleted, setResolveOverdueAsCompleted] = useState(false);
  const [overdueOverrideMeetingId, setOverdueOverrideMeetingId] = useState(null);
  const rescheduling = activeOperations['reschedule-meeting'];

  // Feedback modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackMeeting, setFeedbackMeeting] = useState(null);
  const [feedbackGivers, setFeedbackGivers] = useState([]);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [fetchingFeedback, setFetchingFeedback] = useState(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleOpenFeedbackModal = async (meeting) => {
    setFetchingFeedback(meeting.id);
    try {
      const res = await getMeetingFeedback(meeting.id);
      if (res.data.success) {
        setFeedbackMeeting(res.data.meeting || meeting);
        setFeedbackGivers(res.data.givers || []);
        setIsAlreadySubmitted(Boolean(res.data.already_submitted));
        setIsFeedbackModalOpen(true);
      } else {
        setSchedulePopup({ message: res.data.message || 'Error fetching feedback information.', type: 'error' });
      }
    } catch (err) {
      setSchedulePopup({ message: err?.response?.data?.message || 'Error fetching feedback details.', type: 'error' });
    } finally {
      setFetchingFeedback(null);
    }
  };

  const handleRatingChange = (giverId, rating) => {
    setFeedbackGivers(prev => prev.map(g => g.id === giverId ? { ...g, rating } : g));
  };

  const handleFeedbackTextChange = (giverId, text) => {
    setFeedbackGivers(prev => prev.map(g => g.id === giverId ? { ...g, feedback_text: text } : g));
  };

  const handleSubmitFeedback = async () => {
    const unrated = feedbackGivers.filter(g => !g.rating || g.rating < 1);
    if (unrated.length > 0) {
      setSchedulePopup({ message: `Please select a star rating (1 to 5) for ${unrated.map(u => u.name).join(', ')}.`, type: 'error' });
      return;
    }
    setSubmittingFeedback(true);
    try {
      const payload = {
        feedbacks: feedbackGivers.map(g => ({
          knowledge_giver_id: g.id,
          rating: g.rating,
          feedback_text: g.feedback_text || ''
        }))
      };
      const res = await submitMeetingFeedback(feedbackMeeting.id, payload);
      setSchedulePopup({ message: res.data?.message || 'Feedback & rating submitted successfully!', type: 'success' });
      setIsFeedbackModalOpen(false);
      setFeedbackMeeting(null);
      setFeedbackGivers([]);
    } catch (err) {
      setSchedulePopup({ message: err?.response?.data?.message || 'Error submitting feedback.', type: 'error' });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const isMeetingToday = (dateStr) => {
    if (!dateStr) return false;
    const meetingDate = new Date(dateStr);
    const today = new Date();
    const meetingUTC = meetingDate.toISOString().split('T')[0];
    const todayUTC = today.toISOString().split('T')[0];
    const meetingLocal = `${meetingDate.getFullYear()}-${String(meetingDate.getMonth() + 1).padStart(2, '0')}-${String(meetingDate.getDate()).padStart(2, '0')}`;
    const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return meetingUTC === todayUTC || meetingLocal === todayLocal;
  };

  const isMeetingBeforeToday = (dateStr) => {
    if (!dateStr) return false;
    const meetingDate = new Date(dateStr);
    const today = new Date();
    const meetingUTC = meetingDate.toISOString().split('T')[0];
    const todayUTC = today.toISOString().split('T')[0];
    const meetingLocal = `${meetingDate.getFullYear()}-${String(meetingDate.getMonth() + 1).padStart(2, '0')}-${String(meetingDate.getDate()).padStart(2, '0')}`;
    const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (meetingUTC === todayUTC || meetingLocal === todayLocal) return false;
    return meetingLocal < todayLocal && meetingUTC < todayUTC;
  };

  const isMeetingOverdue = (m) => {
    return m.status !== 'completed' && m.status !== 'cancelled' && isMeetingBeforeToday(m.scheduled_at);
  };

  const handleOpenAttendanceModal = async (meeting, isOverdueOverride = false) => {
    if (!isOverdueOverride && meeting.status !== 'completed' && !isMeetingToday(meeting.scheduled_at)) {
      return;
    }
    setFetchingAttendees(meeting.id);
    try {
      const res = await getAttendance(meeting.id);
      setAttendees(res.data.data || []);
      setAttendanceMeeting(meeting);
      setIsAttendanceModalOpen(true);
    } catch (err) {
      setSchedulePopup({ message: 'Error fetching meeting participants', type: 'error' });
    } finally {
      setFetchingAttendees(false);
    }
  };

  const handleOpenRescheduleModal = (meeting) => {
    // Pre-fill with existing time extracted from scheduled_at
    const existing = new Date(meeting.scheduled_at);
    const yyyy = existing.getUTCFullYear();
    const mm_date = String(existing.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(existing.getUTCDate()).padStart(2, '0');
    const hh = String(existing.getUTCHours()).padStart(2, '0');
    const min = String(existing.getUTCMinutes()).padStart(2, '0');
    setRescheduleDate(`${yyyy}-${mm_date}-${dd}`);
    setRescheduleTime(`${hh}:${min}`);
    setRescheduleReason('');
    setRescheduleSubsequent(false);
    setResolveOverdueAsCompleted(false);
    setRescheduleTarget(meeting);
    setIsRescheduleModalOpen(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      setSchedulePopup({ message: 'Please select a new date and time.', type: 'error' });
      return;
    }
    startOperation('reschedule-meeting');
    try {
      const res = await rescheduleMeeting(rescheduleTarget.id, {
        new_date: rescheduleDate,
        new_time: rescheduleTime,
        reason: rescheduleReason.trim(),
        reschedule_subsequent: rescheduleSubsequent
      });
      setIsRescheduleModalOpen(false);
      setRescheduleTarget(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      setRescheduleSubsequent(false);
      fetchData();
      setSchedulePopup({ message: res.data?.message || 'Meeting rescheduled successfully! All participants have been notified via email.', type: 'success' });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error rescheduling the meeting.';
      setSchedulePopup({ message: msg, type: 'error' });
    } finally {
      endOperation('reschedule-meeting');
    }
  };

  const handleAttendanceChange = (stakeholderId, checked) => {
    setAttendees(prev => prev.map(a =>
      a.stakeholder_id === stakeholderId
        ? { ...a, attended: checked ? 1 : 0 }
        : a
    ));
  };

  const handleNotesChange = (stakeholderId, notes) => {
    setAttendees(prev => prev.map(a =>
      a.stakeholder_id === stakeholderId
        ? { ...a, notes: notes }
        : a
    ));
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      await Promise.all(attendees.map(a =>
        markAttendance({
          meeting_id: attendanceMeeting.id,
          stakeholder_id: a.stakeholder_id,
          attended: a.attended ? 1 : 0,
          notes: a.notes || ''
        })
      ));
      setIsAttendanceModalOpen(false);
      setAttendanceMeeting(null);
      setAttendees([]);
      setSchedulePopup({ message: 'Attendance saved successfully', type: 'success' });
      fetchData();
    } catch (err) {
      setSchedulePopup({ message: 'Error saving attendance', type: 'error' });
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveAttendanceAndComplete = async () => {
    setSavingAttendance(true);
    try {
      await Promise.all(attendees.map(a =>
        markAttendance({
          meeting_id: attendanceMeeting.id,
          stakeholder_id: a.stakeholder_id,
          attended: a.attended ? 1 : 0,
          notes: a.notes || ''
        })
      ));
      await updateMeetingStatus(attendanceMeeting.id, 'completed');
      setIsAttendanceModalOpen(false);
      setAttendanceMeeting(null);
      setAttendees([]);
      setOverdueOverrideMeetingId(null);
      setSchedulePopup({ message: 'Attendance saved and meeting marked completed successfully!', type: 'success' });
      fetchData();
    } catch (err) {
      setSchedulePopup({ message: err?.response?.data?.message || 'Error saving attendance and marking completed', type: 'error' });
    } finally {
      setSavingAttendance(false);
    }
  };

  const fetchData = async () => {
    try {
      const [meetingsRes, plansRes, receiversRes, giversRes, projectsRes] = await Promise.all([
        getMeetings(),
        getPlans({ for_dropdown: 'true' }),
        getStakeholders('Incoming Team Member (Knowledge Receiver)'),
        getStakeholders('Outgoing SME (Knowledge Giver)'),
        getProjects()
      ]);
      const fetchedMeetings = meetingsRes.data.data;
      
      let allPlansData = plansRes.data.data || [];
      let myApprovedPlans = allPlansData.filter(p => p.status === 'approved' || p.status === 'closed');
      
      const allowedPlanIds = myApprovedPlans.map(plan => plan.id);
      
      let filteredMeetings = fetchedMeetings;
      if (user?.role === 'Delivery / Engagement Manager') {
        filteredMeetings = fetchedMeetings.filter(meeting => allowedPlanIds.includes(meeting.plan_id));
      }

      const allGivers = giversRes.data?.data || [];
      const fallbackGivers = allGivers.length > 0 ? allGivers.map(g => g.name).join(', ') : 'N/A';

      const planCounts = {};
      const processedMeetings = filteredMeetings.map(m => {
        if (!planCounts[m.plan_id]) planCounts[m.plan_id] = 1;
        else planCounts[m.plan_id]++;
        let kgNames = m.knowledge_giver_names;
        if (!kgNames || kgNames === 'N/A') {
          kgNames = (Array.isArray(m.knowledge_givers) && m.knowledge_givers.length > 0)
            ? m.knowledge_givers.join(', ')
            : fallbackGivers;
        }
        return { ...m, dayLabel: `Day ${planCounts[m.plan_id]}`, knowledge_giver_names: kgNames };
      });
      
      setMeetings(processedMeetings);
      setPlans(myApprovedPlans);
      setStakeholders(receiversRes.data.data);
      setKnowledgeGivers(giversRes.data.data);
      setProjects(projectsRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (schedulePopup) {
      const timer = setTimeout(() => {
        setSchedulePopup(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [schedulePopup]);

  useEffect(() => {
    if (formData.plan_id) {
      setActiveGlobalTab('KA');
    }
  }, [formData.plan_id]);

  // Compute specific requirements when plan_id changes
  useEffect(() => {
    setIsSudMandatory(false);
    setIsFinalAssessmentMandatory(false);
    setIsShadowResourcing(false);
    setIsLeadResourcing(false);
    setSelectedSudRecipients([]);
    setShadowMappings([{ organizerId: '', participantIds: [] }]);
    setSelectedLeadRecipients([]);
    setSelectedFinalAssessmentRecipients([]);

    if (!formData.plan_id) return;
    
    const selectedPlan = plans.find(p => p.id === parseInt(formData.plan_id));
    if (!selectedPlan) return;
    
    const project = projects.find(p => p.id === selectedPlan.project_id);
    if (!project || !project.config) return;
    
    try {
      const config = typeof project.config === 'string' ? JSON.parse(project.config) : project.config;
      let planConfig = selectedPlan.project_config;
      if (typeof planConfig === 'string') {
        try { planConfig = JSON.parse(planConfig); } catch(e) {}
      }
      
      let track = null;
      if (planConfig && planConfig._meta && planConfig._meta.trackId) {
        track = (config.tracks || []).find(t => String(t.id) === String(planConfig._meta.trackId));
      }
      
      if (!track) {
        track = (config.tracks || []).find(t => 
          selectedPlan.application_name.trim() === t.name.trim() || 
          selectedPlan.application_name.includes(t.name.trim())
        );
      }

      let activeOptions = null;
      let activeInputs = null;
      
      if (track) {
          activeOptions = track.options;
          activeInputs = track.inputs;
          
          if (track.modules && track.modules.length > 0) {
              let module = null;
              if (planConfig && planConfig._meta && planConfig._meta.moduleId) {
                  module = track.modules.find(m => String(m.id) === String(planConfig._meta.moduleId));
              }
              if (!module) {
                  module = track.modules.find(m => 
                      selectedPlan.application_name.trim() === m.name.trim() || 
                      selectedPlan.application_name.includes(m.name.trim())
                  );
              }
              if (module && module.options) {
                  activeOptions = module.options;
                  activeInputs = module.inputs;
              }
          }
      }

      if (activeOptions) {
        setIsSudMandatory(!!activeOptions.sud_mandatory);
        setIsFinalAssessmentMandatory(!!activeOptions.assessment);
        setIsShadowResourcing(!!activeOptions.shadow_resourcing);
        setIsLeadResourcing(!!activeOptions.lead_resourcing);
        
        setIsSudRequiredForSR(!!activeOptions.sud_doc_upload);
        setIsAssessmentRequiredForSR(!!activeOptions.assessment_80);

        if (activeOptions.shadow_resourcing) {
            getResourceMappings(formData.plan_id).then(res => {
                if (res.data?.success) {
                    setMappedShadowResources(res.data.data || []);
                }
            }).catch(err => console.error("Error fetching resource mappings:", err));
            
            if (activeOptions.sud_doc_upload) {
                getSudDocuments(formData.plan_id).then(res => {
                    setSudDocs(res.data?.data || []);
                }).catch(err => console.error(err));
            } else {
                setSudDocs([]);
            }
            
            if (activeOptions.assessment_80) {
                getResults(formData.plan_id).then(res => {
                    setAssessmentResults(res.data?.data || []);
                }).catch(err => console.error(err));
            } else {
                setAssessmentResults([]);
            }
        } else {
            setMappedShadowResources([]);
            setSudDocs([]);
            setAssessmentResults([]);
        }

        let srCriteria = [];
        if (activeOptions.sud_doc_upload) {
          srCriteria.push("submitted SUD documents");
        }
        if (activeOptions.assessment_80) {
          srCriteria.push("scored above 80% in the Final Assessment");
        }
        
        if (srCriteria.length > 0) {
          setShadowResourcingEntryCriteria(`Only participants who have ${srCriteria.join(' AND ')} are eligible.`);
        } else {
          setShadowResourcingEntryCriteria('Only participants who have submitted SUD documents and scored above 80% in the Final Assessment are eligible.');
        }

        let lrCriteria = [];
        if (activeOptions.lr_ticket_resolving) {
          const tickets = activeInputs?.lr_ticket_resolving || '';
          lrCriteria.push(`Need to be involved in resolving ${tickets} tickets`);
        }
        if (activeOptions.lr_weeks_shadow) {
          const weeks = activeInputs?.lr_weeks_shadow || '';
          lrCriteria.push(`Required weeks for shadow resourcing: ${weeks}`);
        }
        
        if (lrCriteria.length > 0) {
          setLeadResourcingEntryCriteria(lrCriteria.join(' AND '));
        } else {
          setLeadResourcingEntryCriteria('Only participants who have completed the Shadow Resourcing phase for this plan are eligible to be selected for Lead Resourcing.');
        }
      }
    } catch (e) {
      console.error("Error parsing project config", e);
    }
  }, [formData.plan_id, plans, projects]);

  const handleStakeholdersChange = (newStakeholders) => {
    const added = newStakeholders.filter(id => !selectedStakeholders.includes(id));
    const removed = selectedStakeholders.filter(id => !newStakeholders.includes(id));
    
    setSelectedStakeholders(newStakeholders);
    
    if (added.length > 0) {
      if (isSudMandatory) {
        setSelectedSudRecipients(prev => [...new Set([...prev, ...added])]);
      }
      if (isFinalAssessmentMandatory) {
        setSelectedFinalAssessmentRecipients(prev => [...new Set([...prev, ...added])]);
      }
    }
    
    if (removed.length > 0) {
      setSelectedSudRecipients(prev => prev.filter(id => !removed.includes(id)));
      setSelectedFinalAssessmentRecipients(prev => prev.filter(id => !removed.includes(id)));
      setShadowMappings(prev => prev.map(m => ({ ...m, participantIds: m.participantIds.filter(id => !removed.includes(id)) })));
      setSelectedLeadRecipients(prev => prev.filter(id => !removed.includes(id)));
    }
  };

  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    const isSRAvailable = shadowMappings.some(m => m.organizerId && m.participantIds.length > 0);
    const hasInvalidSR = activeGlobalTab === 'SR' && shadowMappings.some(m => (!m.organizerId && m.participantIds.length > 0) || (m.organizerId && m.participantIds.length === 0));
    const recipients = activeGlobalTab === 'SR' ? (isSRAvailable ? [1] : []) : selectedLeadRecipients;
    
    if (activeGlobalTab === 'SR' && hasInvalidSR) {
      setSchedulePopup({ message: 'Please ensure each mapping has both an Organizer and at least one Participant selected.', type: 'error' });
      return;
    }
    
    if (recipients.length === 0 && (activeGlobalTab === 'SR' ? shadowMappings.every(m => !m.organizerId && m.participantIds.length === 0) : true)) {
      setSchedulePopup({ message: 'Please select at least one recipient to notify.', type: 'error' });
      return;
    }
    
    startOperation('notify-requirements');
    try {
      const payload = {
        plan_id: formData.plan_id,
        shadow_mappings: (activeGlobalTab === 'SR' && isShadowResourcing) ? shadowMappings.filter(m => m.organizerId && m.participantIds.length > 0) : [],
        lead_recipients: (activeGlobalTab === 'LR' && isLeadResourcing) ? selectedLeadRecipients : []
      };

      const res = await notifyRequirements(payload);
      if (res.data.success) {
        if (activeGlobalTab === 'SR') {
          setShadowMappings([{ organizerId: '', participantIds: [] }]);
        } else {
          setSelectedLeadRecipients([]);
        }
        setSchedulePopup({ message: res.data.message || 'Notification sent successfully!', type: 'success' });
      } else {
        setSchedulePopup({ message: res.data.message || 'Error sending notification', type: 'error' });
      }
    } catch (err) {
      setSchedulePopup({ message: err?.response?.data?.message || 'Server error sending notification', type: 'error' });
    } finally {
      endOperation('notify-requirements');
    }
  };

  const handleDownloadTemplate = async () => {
    if (!formData.plan_id || !formData.project_id) {
      setSchedulePopup({ message: 'Please select a Project and a Plan first.', type: 'error' });
      return;
    }
    
    try {
      startOperation('download-template');
      const res = await getPlanTopicOptions(formData.plan_id);
      const topics = res.data.data;
      
      if (!topics || topics.length === 0) {
        setSchedulePopup({ message: "No topics found to export for the selected plan.", type: "error" });
        return;
      }
      
      const plan = plans.find(p => String(p.id) === String(formData.plan_id));
      const project = projects.find(p => String(p.id) === String(formData.project_id));
      
      const wsData = [];
      const merges = [];
      
      let parsedConfig = plan?.project_config || {};
      if (typeof parsedConfig === 'string') {
        try {
          parsedConfig = JSON.parse(parsedConfig);
        } catch (e) {
          parsedConfig = {};
        }
      }
      
      // 1st Heading (Professional Office Format)
      const projectName = project?.name || 'N/A';
      let trackName = 'N/A';
      if (parsedConfig?._meta?.trackId) {
        const trk = parsedConfig.tracks?.find(t => String(t.id) === String(parsedConfig._meta.trackId));
        if (trk) trackName = trk.name;
      } else if (parsedConfig?.tracks?.[0]) {
        trackName = parsedConfig.tracks[0].name;
      } else {
        trackName = plan?.application_name || 'N/A';
      }
      const planName = `${plan?.application_name || 'Generated Plan'} (${plan?.plan_type || 'KT'})`;

      wsData.push([`Project Name: ${projectName}`, "", "", "", "", "", "", "", ""]);
      wsData.push([`Track Name: ${trackName}`, "", "", "", "", "", "", "", ""]);
      wsData.push([`Plan Name: ${planName}`, "", "", "", "", "", "", "", ""]);
      wsData.push([`Export Date: ${new Date().toLocaleDateString()}`, "", "", "", "", "", "", "", ""]);
      wsData.push(["", "", "", "", "", "", "", "", ""]); 
      
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
      merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });
      merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 8 } });
      merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 8 } });
      merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 8 } });
      
      wsData.push(["Day / Section", "Topic / Sub-topic Name", "Duration (Hours)", "Knowledge Giver", "Knowledge Receiver", "Start Date", "Meeting Link", "SUD Document", "Final Assessment"]);
      
      const excludedKeywords = [
        'assessment evaluation window',
        'shadow experience',
        'shadow phase',
        'shadow resourcing',
        'lead the project independently',
        'lead phase',
        'lead resourcing'
      ];

      const cleanedTopics = topics
        .filter(t => {
          const text = ((t.topic_name || '') + ' ' + (t.day_label || '')).toLowerCase();
          return !excludedKeywords.some(kw => text.includes(kw));
        })
        .map(t => {
          let day = t.day_label || 'General';
          day = day.replace(/:\s*\[Time:.*?\]/gi, '').replace(/\[Time:.*?\]/gi, '').trim();
          return { ...t, clean_day: day };
        });

      let currentRowIndex = 6;
      let startDayRow = 6;
      let currentDay = cleanedTopics[0]?.clean_day;

      cleanedTopics.forEach((t, idx) => {
        wsData.push([
          t.clean_day,
          t.topic_name,
          t.estimated_duration_hours || 'N/A',
          "",
          "",
          "",
          "",
          "",
          ""
        ]);

        if (idx > 0) {
          if (t.clean_day !== currentDay) {
            if (currentRowIndex - 1 > startDayRow) {
              merges.push({ s: { r: startDayRow, c: 0 }, e: { r: currentRowIndex - 1, c: 0 } });
            }
            startDayRow = currentRowIndex;
            currentDay = t.clean_day;
          }
        }
        
        if (idx === cleanedTopics.length - 1) {
          if (currentRowIndex > startDayRow) {
            merges.push({ s: { r: startDayRow, c: 0 }, e: { r: currentRowIndex, c: 0 } });
          }
        }
        currentRowIndex++;
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = merges;
      ws['!cols'] = [{ wch: 20 }, { wch: 70 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
      ws['!sheetViews'] = [{ showGridLines: false }];
      
      const thinBorder = { style: "thin", color: { rgb: "CCCCCC" } };

      for (let r = 0; r < wsData.length; r++) {
        for (let c = 0; c < 9; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
          
          let cellStyle = {
            font: { name: "Calibri", sz: 11 },
            fill: { fgColor: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", wrapText: true },
            border: {
              top: r >= 5 ? thinBorder : null,
              bottom: r >= 5 ? thinBorder : null,
              left: r >= 5 ? thinBorder : null,
              right: r >= 5 ? thinBorder : null
            }
          };

          if (r < 5) {
            cellStyle.alignment.horizontal = "center";
            cellStyle.font.bold = true;
            cellStyle.font.sz = 14;
          } else if (r === 5) {
            cellStyle.fill = { fgColor: { rgb: "D04A02" } }; // PwC orange
            cellStyle.font.color = { rgb: "FFFFFF" };
            cellStyle.font.bold = true;
            cellStyle.alignment.horizontal = "center";
          } else {
            cellStyle.alignment.horizontal = c === 1 ? "left" : "center";
          }

          ws[cellRef].s = cellStyle;
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "KT_Schedule_Template");
      XLSX.writeFile(wb, `Schedule_Template_${planName.replace(/\s+/g, '_')}.xlsx`);

    } catch (err) {
      console.error(err);
      setSchedulePopup({ message: 'Error generating template', type: 'error' });
    } finally {
      endOperation('download-template');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStakeholders.length === 0 && selectedOrganizers.length === 0) {
      setSchedulePopup({ message: 'Please select at least one participant or organizer.', type: 'error' });
      return;
    }
    startOperation('schedule-meeting');
    try {
      const payload = {
        plan_id: formData.plan_id,
        scheduled_at: formData.scheduled_at,
        meeting_link: formData.meeting_link,
        stakeholder_ids: [...selectedOrganizers, ...selectedStakeholders],
        sud_recipients: (activeGlobalTab === 'KA' && isSudMandatory) ? selectedSudRecipients : [],
        final_assessment_recipients: (activeGlobalTab === 'KA' && isFinalAssessmentMandatory) ? selectedFinalAssessmentRecipients : [],
        shadow_mappings: (activeGlobalTab === 'SR' && isShadowResourcing) ? shadowMappings.filter(m => m.organizerId && m.participantIds.length > 0) : [],
        lead_recipients: (activeGlobalTab === 'LR' && isLeadResourcing) ? selectedLeadRecipients : []
      };
      await createMeeting(payload);
      setFormData({
        ...formData,
        scheduled_at: '',
        meeting_link: ''
      });
      setSelectedStakeholders([]);
      setSelectedOrganizers([]);
      setSelectedSudRecipients([]);
      setSelectedFinalAssessmentRecipients([]);
      setShadowMappings([{ organizerId: '', participantIds: [] }]);
      setSelectedLeadRecipients([]);
      fetchData();
      setSchedulePopup({ message: 'Meeting scheduled successfully! Notifications triggered.', type: 'success' });
    } catch (err) {
      setSchedulePopup({ message: 'Error creating meeting', type: 'error' });
    } finally {
      endOperation('schedule-meeting');
    }
  };

  const handleStatusChange = async (id, status) => {
    if (status === 'completed' && user?.role === 'Delivery / Engagement Manager') {
      const meetingObj = meetings.find(m => m.id === id);
      if (meetingObj && (!meetingObj.attendance_rate_percent || Number(meetingObj.attendance_rate_percent) === 0)) {
        setSchedulePopup({ message: 'Give attendance at first then only the meeting can be marked completed.', type: 'error' });
        return;
      }
    }
    try {
      await updateMeetingStatus(id, status);
      fetchData();
    } catch (err) {
      setSchedulePopup({ message: err?.response?.data?.message || 'Error updating status', type: 'error' });
    }
  };

  const handleNotify = async (id) => {
    try {
      const meetingObj = meetings.find(m => m.id === id);
      const isOverdue = meetingObj ? isMeetingOverdue(meetingObj) : false;
      await notifyMeeting(id, { is_overdue: isOverdue });
      setNotifiedId(id);
      setTimeout(() => setNotifiedId(null), 3000);
    } catch (err) {
      setSchedulePopup({ message: 'Error sending notification', type: 'error' });
    }
  };

  const isParticipantEligible = (participantId) => {
    if (isForcePushEnabled) return true;
    
    if (isSudRequiredForSR) {
      const hasSud = sudDocs.some(doc => doc.stakeholder_id === participantId);
      if (!hasSud) return false;
    }
    
    if (isAssessmentRequiredForSR) {
      const result = assessmentResults.find(r => r.stakeholder_id === participantId && r.assessment_type === 'final');
      if (!result || parseFloat(result.overall_score) < 40) return false;
    }
    
    return true;
  };

  if (loading) return <Loader />;

  const canManage = user?.role === 'Delivery / Engagement Manager' || user?.role === 'Outgoing SME (Knowledge Giver)';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary-text">Meeting Schedule</h2>

      {canManage && (
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Project</label>
              <CustomSelect
                className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value, plan_id: '' })}
                required
              >
                <option value="" disabled>---Select Project---</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </CustomSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Plan</label>
              <CustomSelect
                className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md"
                value={formData.plan_id}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                required
                disabled={!formData.project_id}
              >
                <option value="" disabled>---Select Plan---</option>
                {plans
                  .filter(p => String(p.project_id) === String(formData.project_id))
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.application_name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>
        </div>
      )}

      {canManage && formData.project_id && formData.plan_id && (
        <div className="mb-6 border-b border-gray-200 flex justify-between items-end">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveGlobalTab('KA')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeGlobalTab === 'KA' ? 'border-primary-orange text-primary-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Knowledge Acquisition
            </button>
            {isShadowResourcing && (
              <button
                onClick={() => setActiveGlobalTab('SR')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeGlobalTab === 'SR' ? 'border-primary-orange text-primary-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Shadow Resourcing
              </button>
            )}
            {isLeadResourcing && (
              <button
                onClick={() => setActiveGlobalTab('LR')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeGlobalTab === 'LR' ? 'border-primary-orange text-primary-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Lead Resourcing
              </button>
            )}
          </nav>
          <div className="pb-2">
            <button
              onClick={handleDownloadTemplate}
              disabled={isUploadingExcel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-orange border border-primary-orange rounded-md hover:bg-orange-50 transition-colors shadow-sm text-sm"
            >
              <Download size={16} />
              Download Template
            </button>
          </div>
        </div>
      )}

      {canManage && formData.project_id && formData.plan_id && (
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 mb-6">
          {activeGlobalTab === 'KA' && (
            <div className="flex border-b border-gray-100 bg-gray-50/50 rounded-t-xl overflow-hidden">
              <button
                onClick={() => setSchedulingMode('manual')}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${schedulingMode === 'manual' ? 'text-primary-orange border-b-2 border-primary-orange bg-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Manual Scheduling
              </button>
              <button
                onClick={() => setSchedulingMode('upload')}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${schedulingMode === 'upload' ? 'text-primary-orange border-b-2 border-primary-orange bg-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Automated Bulk Scheduling
              </button>
            </div>
          )}

          <div className="p-6">
            {(schedulingMode === 'manual' || activeGlobalTab !== 'KA') ? (
              <div>
                <h3 className="text-lg font-semibold text-primary-text mb-4">
                  {activeGlobalTab === 'KA' ? 'Schedule New Meeting Manually' : `Schedule ${activeGlobalTab === 'SR' ? 'Shadow' : 'Lead'} Resourcing Session`}
                </h3>
                <form onSubmit={activeGlobalTab === 'KA' ? handleSubmit : handleNotifySubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {activeGlobalTab === 'KA' && (
                    <>
                      <div>
                    {user?.role === 'Delivery / Engagement Manager' ? (
                      <MultiSelectDropdown
                        label="Organizers (Knowledge Givers)"
                        placeholder="Select Givers..."
                        options={knowledgeGivers}
                        selected={selectedOrganizers}
                        onChange={setSelectedOrganizers}
                        visibleCount={3}
                      />
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-700">Organizer</label>
                        <input
                          type="text"
                          disabled
                          className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md bg-input-background text-secondary-text cursor-not-allowed"
                          value={user?.name ? `${user.name} (${user.role})` : ''}
                        />
                      </>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date" required
                      className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                    <input
                      type="url"
                      className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md"
                      value={formData.meeting_link}
                      onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>

                  <div>
                    <MultiSelectDropdown
                      label="Participants (Knowledge Receivers)"
                      placeholder="Select Receivers..."
                      options={stakeholders}
                      selected={selectedStakeholders}
                      onChange={handleStakeholdersChange}
                      visibleCount={4}
                    />
                  </div>

                    </>
                  )}

                  <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {activeGlobalTab === 'KA' && (
                      <>
                        {isSudMandatory && (
                          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 h-full">
                            <MultiSelectDropdown
                              label="SUD Document"
                              placeholder="Select Participants..."
                              options={stakeholders.filter(s => selectedStakeholders.includes(s.id))}
                              selected={selectedSudRecipients}
                              onChange={setSelectedSudRecipients}
                              visibleCount={3}
                            />
                          </div>
                        )}
                        {isFinalAssessmentMandatory && (
                          <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 h-full">
                            <MultiSelectDropdown
                              label="Final Assessment"
                              placeholder="Select Participants..."
                              options={stakeholders.filter(s => selectedStakeholders.includes(s.id))}
                              selected={selectedFinalAssessmentRecipients}
                              onChange={setSelectedFinalAssessmentRecipients}
                              visibleCount={3}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {activeGlobalTab === 'SR' && (
                      <div className="md:col-span-3 bg-purple-50/50 p-4 rounded-lg border border-purple-100 flex flex-col gap-4">
                        <div className="p-3 bg-primary-orange rounded-lg text-sm text-white flex items-center shadow-sm">
                          <div>
                            <strong className="block mb-1">Entry Criteria:</strong>
                            {shadowResourcingEntryCriteria}
                          </div>
                        </div>
                        
                        {shadowMappings.map((mapping, index) => (
                          <div key={index} className="flex flex-col md:flex-row gap-4 items-start bg-white p-3 rounded shadow-sm border border-gray-100">
                            <div className="flex-1">
                              <MultiSelectDropdown
                                label="Organizer (Lead)"
                                placeholder="Select Organizer..."
                                options={getAllowedSROrganizers()}
                                selected={mapping.organizerId ? [Number(mapping.organizerId)] : []}
                                onChange={(newIds) => handleShadowMappingOrganizerChange(index, newIds)}
                                visibleCount={3}
                              />
                            </div>
                            <div className="flex-[2]">
                              <MultiSelectDropdown
                                label={
                                  <div className="flex justify-between items-center w-full">
                                    <span>Participants (Shadows)</span>
                                    <label className="flex items-center space-x-1 cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        className="rounded text-primary-orange focus:ring-orange-border"
                                        checked={isForcePushEnabled} 
                                        onChange={(e) => {
                                          if (isForcePushEnabled) {
                                            setIsForcePushEnabled(false);
                                          } else {
                                            if (window.confirm("Are you sure you want to override the entry criteria and allow non-eligible candidates?")) {
                                              setIsForcePushEnabled(true);
                                            }
                                          }
                                        }} 
                                      />
                                      <span className="text-xs text-secondary-text font-normal">Force push</span>
                                    </label>
                                  </div>
                                }
                                placeholder="Select Participants..."
                                options={getAllowedSRParticipants()}
                                selected={mapping.participantIds}
                                onChange={(newIds) => handleShadowMappingParticipantChange(index, newIds)}
                                visibleCount={3}
                                isOptionDisabledFn={(opt) => !isParticipantEligible(opt.id)}
                                optionClassFn={(opt) => !isParticipantEligible(opt.id) ? 'blur-sm opacity-60' : ''}
                              />
                            </div>
                            {shadowMappings.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeShadowMapping(index)}
                                className="mt-6 p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-md transition-colors"
                                title="Remove Mapping"
                              >
                                <X size={20} />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <div className="flex justify-start">
                          <button
                            type="button"
                            onClick={addShadowMapping}
                            className="text-sm font-medium text-primary-orange hover:text-hover-orange underline"
                          >
                            + Add Another Mapping
                          </button>
                        </div>
                        
                        <div className="text-xs text-secondary-text mt-2 italic bg-purple-100/50 p-2 rounded border border-purple-100 shadow-sm">
                          * Disclaimer: Jira ticket integration and tracking for Shadow Resourcing will be available in a future implementation.
                        </div>
                      </div>
                    )}

                    {activeGlobalTab === 'LR' && (
                      <div className="md:col-span-3 bg-orange-50/50 p-4 rounded-lg border border-orange-100 flex flex-col gap-4 h-full">
                        
                        <div className="bg-white p-3 rounded shadow-sm border border-gray-100">
                          <MultiSelectDropdown
                            label="Lead Resourcing"
                            placeholder="Select Participants..."
                            options={getAllowedLRStakeholders()}
                            selected={selectedLeadRecipients}
                            onChange={setSelectedLeadRecipients}
                            visibleCount={3}
                          />
                        </div>
                        
                        <div className="text-xs text-secondary-text mt-2 italic bg-orange-100/50 p-2 rounded border border-orange-100 shadow-sm">
                          * Disclaimer: Jira ticket integration and assignment for Lead Resourcing will be available in a future implementation.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-4 flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={
                        (activeGlobalTab === 'KA' && scheduling) ||
                        (activeGlobalTab !== 'KA' && activeOperations['notify-requirements']) ||
                        (activeGlobalTab === 'KA' && selectedStakeholders.length === 0 && selectedOrganizers.length === 0) ||
                        (activeGlobalTab === 'SR' && shadowMappings.every(m => !m.organizerId && m.participantIds.length === 0)) ||
                        (activeGlobalTab === 'LR' && selectedLeadRecipients.length === 0)
                      }
                      className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors ${
                        ((activeGlobalTab === 'KA' && scheduling) || (activeGlobalTab !== 'KA' && activeOperations['notify-requirements']))
                          ? 'bg-button-orange cursor-not-allowed'
                          : (
                              (activeGlobalTab === 'KA' && selectedStakeholders.length === 0 && selectedOrganizers.length === 0) ||
                              (activeGlobalTab === 'SR' && shadowMappings.every(m => !m.organizerId && m.participantIds.length === 0)) ||
                              (activeGlobalTab === 'LR' && selectedLeadRecipients.length === 0)
                            )
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-primary-orange hover:bg-hover-orange'
                      }`}
                    >
                      {((activeGlobalTab === 'KA' && scheduling) || (activeGlobalTab !== 'KA' && activeOperations['notify-requirements'])) ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          {activeGlobalTab === 'KA' ? 'Scheduling...' : 'Notifying...'}
                        </>
                      ) : (
                        <>
                          {activeGlobalTab === 'KA' ? <Calendar size={16} /> : <span style={{ fontSize: '16px' }}>🔔</span>}
                          {activeGlobalTab === 'KA' ? 'Schedule' : 'Notify'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-primary-text">Automatic Scheduling via Excel</h3>
                </div>
                <div 
                  className="border-2 border-dashed border-light-border rounded-lg p-10 flex flex-col items-center justify-center hover:bg-light-background transition-colors cursor-pointer"
                  onDragOver={handleDragOverExcel}
                  onDrop={handleDropExcel}
                  onClick={() => excelFileInputRef.current?.click()}
                >
                  <UploadCloud className="w-12 h-12 text-secondary-text mb-3" />
                  <p className="text-secondary-text text-center font-medium">
                    Drag & drop Excel files here, or click to select
                  </p>
                  <p className="text-secondary-text text-sm mt-2 text-center">
                    Ensure your file contains plan, project, givers, and receivers day-wise.
                  </p>
                  <p className="text-secondary-text text-xs mt-1">
                    Supported formats: XLS, XLSX
                  </p>
                  <input 
                    type="file" 
                    ref={excelFileInputRef} 
                    className="hidden" 
                    accept=".xls,.xlsx"
                    multiple
                    onChange={handleFileSelectExcel}
                  />
                </div>

                {selectedExcelFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {selectedExcelFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-input-background border border-input-background p-4 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-input-background rounded-lg">
                            <File className="w-6 h-6 text-primary-orange" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary-text">{file.name}</p>
                            <p className="text-xs text-secondary-text">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveExcelFile(idx)} 
                          className="text-secondary-text hover:text-red-500 transition p-1"
                          title="Remove file"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleBulkSchedule}
                    disabled={isUploadingExcel || selectedExcelFiles.length === 0}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors ${
                      isUploadingExcel || selectedExcelFiles.length === 0
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary-orange hover:bg-hover-orange active:scale-95'
                    }`}
                  >
                    {isUploadingExcel ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Calendar size={16} />
                        Schedule
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {(!formData.plan_id || activeGlobalTab === 'KA') && (
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-light-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Plan Name</th>
                {user?.role === 'Delivery / Engagement Manager' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Knowledge Giver(s)</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Meeting Title</th>
                {user?.role === 'Incoming Team Member (Knowledge Receiver)' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Meeting Link</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Attendance Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Feedback</th>
                  </>
                )}
                {user?.role === 'Delivery / Engagement Manager' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Attendance Rate</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Status</th>
                {canManage && <th className="px-6 py-3 text-right text-xs font-medium text-secondary-text uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-light-background divide-y divide-gray-200">
              {meetings.map((m) => {
                const dayStr = m.day_label || '-';
                const cleanTitle = m.title.replace(/^.*?(Day\s*\d+[^:-]*[:-]\s*)/i, '').replace(/^Day\s*\d+\s*/i, '');
                const isOverdue = isMeetingOverdue(m);

                return (
                  <tr key={m.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text font-medium">
                      {plans.find(p => p.id === m.plan_id)?.application_name || 'N/A'}
                    </td>
                    {user?.role === 'Delivery / Engagement Manager' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {m.knowledge_giver_names || 'N/A'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {m.dayLabel || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{new Date(m.scheduled_at).toLocaleString(undefined, { timeZone: 'UTC' })}</td>
                    <td className="px-6 py-4 text-sm font-medium text-primary-text break-words min-w-[150px] max-w-[200px]">{m.title}</td>
                    {user?.role === 'Incoming Team Member (Knowledge Receiver)' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                          {m.meeting_link ? (
                            <div className="relative group inline-block">
                              {m.status === 'completed' ? (
                                <span
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-gray-400 cursor-not-allowed"
                                >
                                  Join Meeting
                                </span>
                              ) : (
                                <a
                                  href={m.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-primary-orange hover:bg-hover-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border transition-colors"
                                >
                                  Join Meeting
                                </a>
                              )}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-max max-w-xs bg-sidebar text-white text-xs rounded py-1 px-2 shadow-lg">
                                {m.meeting_link}
                                <svg className="absolute text-primary-text h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0" /></svg>
                              </div>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {m.status === 'completed' ? (
                            Number(m.attended) === 1 ? (
                              <span className="text-green-600">attended</span>
                            ) : (
                              <span className="text-red-600">missing</span>
                            )
                          ) : null}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {m.status === 'completed' && Number(m.attended) === 1 ? (
                            <button
                              onClick={() => handleOpenFeedbackModal(m)}
                              disabled={fetchingFeedback === m.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors text-xs font-semibold shadow-sm disabled:opacity-50"
                              title="Give Feedback & Rating"
                            >
                              {fetchingFeedback === m.id ? (
                                <svg className="animate-spin h-3.5 w-3.5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                </svg>
                              ) : (
                                <>
                                  <Star size={14} className="fill-amber-400 text-amber-500" />
                                  Feedback
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-secondary-text italic">
                              {m.status !== 'completed' ? 'Available after KT' : 'Not eligible'}
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    {user?.role === 'Delivery / Engagement Manager' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text font-semibold text-primary-orange">
                        {m.attendance_rate_percent !== undefined ? `${m.attendance_rate_percent}%` : 'N/A'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : m.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : m.status === 'cancelled' ? 'bg-gray-50 text-gray-700 border-gray-200' : 'bg-input-background text-primary-orange border-primary-orange/20'}`}>
                        {isOverdue ? 'Overdue' : m.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 flex justify-end items-center h-full">
                        {(!isOverdue && (m.status === 'completed' || isMeetingToday(m.scheduled_at))) && (
                          <button
                            onClick={() => handleOpenAttendanceModal(m)}
                            disabled={fetchingAttendees === m.id}
                            className="text-primary-orange hover:text-hover-orange mr-4 inline-flex items-center"
                            title="Attendance"
                          >
                            {fetchingAttendees === m.id ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                              </svg>
                            ) : (
                              <ClipboardList size={20} />
                            )}
                          </button>
                        )}
                        {m.status === 'scheduled' && (
                          <>
                            {notifiedId === m.id ? (
                              <span className="text-green-600 flex items-center mr-4 transition-all duration-300" title="Sent!">
                                <CheckCircle size={20} />
                              </span>
                            ) : (
                              <button onClick={() => handleNotify(m.id)} className="text-primary-orange hover:text-hover-orange mr-4" title="Notify">
                                <Bell size={20} />
                              </button>
                            )}
                            {user?.role === 'Delivery / Engagement Manager' && (
                              <button
                                onClick={() => handleOpenRescheduleModal(m)}
                                className="text-amber-600 hover:text-amber-800 mr-4 inline-flex items-center"
                                title="Reschedule"
                              >
                                <Clock size={20} />
                              </button>
                            )}
                            {!isOverdue && (
                              <button onClick={() => handleStatusChange(m.id, 'completed')} className="text-green-600 hover:text-green-900" title="Complete">
                                <CheckCircle size={20} />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
      {(formData.plan_id && activeGlobalTab === 'SR') && (
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-primary-text">Mapped Shadow Resources</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-light-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Participant Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Participant Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Lead Organizer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Organizer Role</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mappedShadowResources.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-secondary-text">No mappings found for this plan.</td>
                  </tr>
                ) : (
                  mappedShadowResources.map((mapping, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text">{mapping.participant_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text capitalize">{mapping.participant_role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text">{mapping.organizer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text capitalize">{mapping.organizer_role}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Attendance Modal */}
      {isAttendanceModalOpen && attendanceMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-light-background rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-orange to-primary-orange text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {attendanceMeeting.status === 'completed'
                  ? 'View Attendance: '
                  : overdueOverrideMeetingId === attendanceMeeting.id
                  ? 'Mark Past Attendance & Complete: '
                  : 'Mark Attendance: '}
                {attendanceMeeting.title}
              </h3>
              <button
                onClick={() => { setIsAttendanceModalOpen(false); setAttendanceMeeting(null); setAttendees([]); setOverdueOverrideMeetingId(null); }}
                className="text-white hover:text-gray-200 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-secondary-text">
                {attendanceMeeting.status === 'completed'
                  ? 'Attendance is locked because the meeting is completed.'
                  : 'Please check the box next to each participant who was present in this meeting.'}
              </p>

              <div className="divide-y divide-gray-100 border border-light-border rounded-lg overflow-hidden bg-light-background">
                {attendees.map((attendee) => (
                  <div key={attendee.stakeholder_id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-primary-text">{attendee.stakeholder_name}</div>
                      <div className="text-xs text-secondary-text capitalize">{attendee.role}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="inline-flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary-orange focus:ring-orange-border border-light-border rounded"
                          checked={attendee.attended || false}
                          onChange={(e) => handleAttendanceChange(attendee.stakeholder_id, e.target.checked)}
                          disabled={attendanceMeeting.status === 'completed'}
                        />
                        <span className="text-sm text-gray-700 font-medium">Attended</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        className={`w-full px-3 py-1 text-sm border border-light-border rounded-md focus:ring-orange-border focus:border-orange-border ${attendanceMeeting.status === 'completed' ? 'bg-light-background cursor-not-allowed' : ''}`}
                        value={attendee.notes || ''}
                        onChange={(e) => handleNotesChange(attendee.stakeholder_id, e.target.value)}
                        disabled={attendanceMeeting.status === 'completed'}
                      />
                    </div>
                  </div>
                ))}

                {attendees.length === 0 && (
                  <div className="p-6 text-center text-sm text-secondary-text">
                    No participants invited to this meeting.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-light-background px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setIsAttendanceModalOpen(false); setAttendanceMeeting(null); setAttendees([]); setOverdueOverrideMeetingId(null); }}
                className="px-4 py-2 border border-light-border rounded-md text-sm font-medium text-gray-700 hover:bg-input-background"
                disabled={savingAttendance}
              >
                {attendanceMeeting.status === 'completed' ? 'Close' : 'Cancel'}
              </button>
              {attendanceMeeting.status !== 'completed' && (
                <button
                  type="button"
                  onClick={overdueOverrideMeetingId === attendanceMeeting.id ? handleSaveAttendanceAndComplete : handleSaveAttendance}
                  className="px-4 py-2 bg-primary-orange hover:bg-hover-orange text-white rounded-md text-sm font-medium disabled:bg-button-orange"
                  disabled={savingAttendance || attendees.length === 0}
                >
                  {savingAttendance
                    ? 'Saving...'
                    : overdueOverrideMeetingId === attendanceMeeting.id
                    ? 'Save Attendance & Mark Completed'
                    : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ── */}
      {isRescheduleModalOpen && rescheduleTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-light-background rounded-xl shadow-xl max-w-lg w-full flex flex-col border border-amber-200 overflow-hidden max-h-[90vh]">

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Clock size={20} />
                <h3 className="text-lg font-semibold">Reschedule Meeting</h3>
              </div>
              <button
                onClick={() => { setIsRescheduleModalOpen(false); setRescheduleTarget(null); }}
                className="text-white hover:text-amber-100 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Meeting Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Meeting</p>
                <p className="text-sm font-medium text-primary-text">{rescheduleTarget.title}</p>
              </div>

              {/* Overdue Resolution Option (Option B for Case 2) */}
              {isMeetingOverdue(rescheduleTarget) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-800">Overdue Meeting Resolution</span>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer text-sm text-red-900">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded"
                      checked={resolveOverdueAsCompleted}
                      onChange={(e) => setResolveOverdueAsCompleted(e.target.checked)}
                    />
                    <span>Meeting was already taken — Record past attendance &amp; mark completed</span>
                  </label>
                </div>
              )}

              {/* Alert */}
              <div className="flex items-start space-x-2 bg-input-background border border-input-background rounded-lg px-4 py-3 text-sm text-primary-orange">
                <Bell size={15} className="mt-0.5 flex-shrink-0" />
                <span>
                  {resolveOverdueAsCompleted
                    ? 'You can now record past attendance and immediately mark this meeting as completed.'
                    : 'All participants (Knowledge Giver & Receiver) will be auto-notified via email with the new time once you save.'}
                </span>
              </div>

              {!resolveOverdueAsCompleted && (
                <>
                  {/* New Date picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-primary-text text-sm"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                    />
                  </div>

                  {/* New time picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="reschedule-time-input"
                      type="time"
                      required
                      className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-primary-text text-sm"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                    />
                  </div>

                  {/* Reason field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-xs text-secondary-text">(optional — included in notification email)</span></label>
                    <textarea
                      id="reschedule-reason-input"
                      rows={3}
                      placeholder="e.g. Knowledge Giver is unavailable at the original time..."
                      className="w-full px-3 py-2 border border-light-border rounded-md focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm resize-none"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                    />
                  </div>

                  {/* Reschedule Subsequent Checkbox */}
                  <div className="flex items-center mt-2">
                    <input
                      id="reschedule-subsequent-checkbox"
                      type="checkbox"
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-light-border rounded"
                      checked={rescheduleSubsequent}
                      onChange={(e) => setRescheduleSubsequent(e.target.checked)}
                    />
                    <label htmlFor="reschedule-subsequent-checkbox" className="ml-2 block text-sm text-gray-700">
                      Reschedule all subsequent meetings for this plan
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-amber-50 px-6 py-4 flex justify-end space-x-3 border-t border-amber-100">
              <button
                type="button"
                onClick={() => { setIsRescheduleModalOpen(false); setRescheduleTarget(null); setResolveOverdueAsCompleted(false); }}
                className="px-4 py-2 border border-light-border rounded-md text-sm font-medium text-gray-700 hover:bg-input-background"
                disabled={rescheduling}
              >
                Cancel
              </button>
              {resolveOverdueAsCompleted ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsRescheduleModalOpen(false);
                    setOverdueOverrideMeetingId(rescheduleTarget.id);
                    setResolveOverdueAsCompleted(false);
                    handleOpenAttendanceModal(rescheduleTarget, true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  <CheckCircle size={15} className="mr-1.5" /> Record Attendance &amp; Complete
                </button>
              ) : (
                <button
                  id="reschedule-save-btn"
                  type="button"
                  onClick={handleReschedule}
                  disabled={rescheduling || !rescheduleTime}
                  className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-md text-sm font-medium transition-colors"
                >
                  {rescheduling ? (
                    <><span className="animate-spin mr-2">&#x21BB;</span> Saving...</>
                  ) : (
                    <><Clock size={15} className="mr-1" /> Save &amp; Notify</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Modal ── */}
      {isFeedbackModalOpen && feedbackMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-light-background rounded-xl shadow-xl max-w-xl w-full flex flex-col border border-light-border overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-orange to-primary-orange text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Star size={20} className="fill-amber-300 text-amber-300" />
                <h3 className="text-lg font-semibold">KT Session Feedback</h3>
              </div>
              <button
                onClick={() => { setIsFeedbackModalOpen(false); setFeedbackMeeting(null); setFeedbackGivers([]); }}
                className="text-white hover:text-gray-200 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {/* Meeting Info */}
            <div className="bg-light-background border-b border-light-border px-6 py-3">
              <p className="text-xs font-semibold text-secondary-text uppercase tracking-wide">Meeting Title</p>
              <p className="text-sm font-medium text-primary-text">{feedbackMeeting.title}</p>
            </div>

            {isAlreadySubmitted && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center space-x-2 text-xs font-semibold text-amber-800">
                <CheckCircle size={16} className="text-amber-600 flex-shrink-0" />
                <span>Feedback has already been submitted for this KT session. Changes are not allowed.</span>
              </div>
            )}

            {/* Content List */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {feedbackGivers.length === 0 ? (
                <div className="text-center py-8 text-secondary-text text-sm">
                  No Knowledge Givers associated with this KT meeting session.
                </div>
              ) : (
                feedbackGivers.map((giver) => (
                  <div key={giver.id} className="p-4 border border-light-border rounded-lg bg-light-background space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-primary-text text-base">{giver.name}</span>
                        <span className="ml-2 text-xs bg-input-background text-primary-orange font-medium px-2 py-0.5 rounded-full">
                          Knowledge Giver
                        </span>
                      </div>
                      {/* <div className="text-xs text-secondary-text">{giver.email}</div> */}
                    </div>

                    {/* Star Rating */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Rating (1 to 5 Stars) {!isAlreadySubmitted && <span className="text-red-500">*</span>}
                      </label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            disabled={isAlreadySubmitted}
                            onClick={() => !isAlreadySubmitted && handleRatingChange(giver.id, star)}
                            className={`p-1 focus:outline-none transition-transform ${isAlreadySubmitted ? 'cursor-not-allowed' : 'hover:scale-110'}`}
                            title={`${star} Star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              size={24}
                              className={
                                star <= (giver.rating || 0)
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-gray-300 hover:text-amber-300"
                              }
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-sm font-bold text-gray-700">
                          {giver.rating ? `${giver.rating}/5` : 'Not Rated'}
                        </span>
                      </div>
                    </div>

                    {/* Written Feedback Textarea */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Detailed Feedback
                      </label>
                      <textarea
                        rows={3}
                        disabled={isAlreadySubmitted}
                        readOnly={isAlreadySubmitted}
                        placeholder={isAlreadySubmitted ? "No detailed feedback recorded." : `Share your feedback on the KT provided by ${giver.name}...`}
                        value={giver.feedback_text || ''}
                        onChange={(e) => !isAlreadySubmitted && handleFeedbackTextChange(giver.id, e.target.value)}
                        className={`w-full p-2.5 text-sm border border-light-border rounded-md bg-light-background ${isAlreadySubmitted ? 'bg-input-background text-secondary-text cursor-not-allowed' : 'focus:ring-2 focus:ring-orange-border focus:border-orange-border'}`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-light-background px-6 py-4 flex justify-end space-x-3 border-t border-light-border">
              <button
                type="button"
                onClick={() => { setIsFeedbackModalOpen(false); setFeedbackMeeting(null); setFeedbackGivers([]); }}
                className="px-4 py-2 border border-light-border rounded-md text-sm font-medium text-gray-700 hover:bg-input-background"
                disabled={submittingFeedback}
              >
                Close
              </button>
              {feedbackGivers.length > 0 && !isAlreadySubmitted && (
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className="inline-flex items-center px-4 py-2 bg-primary-orange hover:bg-hover-orange disabled:bg-button-orange text-white rounded-md text-sm font-medium transition-colors"
                >
                  {submittingFeedback ? (
                    <><span className="animate-spin mr-2">&#x21BB;</span> Submitting...</>
                  ) : (
                    <><CheckCircle size={16} className="mr-1.5" /> Submit Feedback</>
                  )}
                </button>
              )}
              {isAlreadySubmitted && (
                <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium border border-green-200">
                  <CheckCircle size={16} className="mr-1.5 text-green-600" /> Feedback Submitted
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {schedulePopup && (
        <div className="fixed top-6 right-6 z-[60] max-w-sm w-full">
          <div className={`rounded-lg shadow-xl overflow-hidden border-l-4 bg-light-background ${schedulePopup.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
            <div className="p-4 flex items-start">
              <div className="flex-shrink-0">
                {schedulePopup.type === 'success' ? (
                  <CheckCircle className="text-green-500 w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
              </div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-primary-text">
                  {schedulePopup.type === 'success' ? 'Success' : 'Error'}
                </p>
                <p className="mt-1 text-sm text-secondary-text">
                  {schedulePopup.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={() => setSchedulePopup(null)}
                  className="bg-light-background rounded-md inline-flex text-secondary-text hover:text-secondary-text focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
