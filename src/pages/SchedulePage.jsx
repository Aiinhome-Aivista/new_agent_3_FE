import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect } from 'react';
import { getMeetings, createMeeting, updateMeetingStatus, getPlans, getProjects, notifyMeeting, rescheduleMeeting, getStakeholders, getAttendance, markAttendance, getMeetingFeedback, submitMeetingFeedback } from '../api/api';
import Loader from '../components/Loader';
import { Calendar, Bell, CheckCircle, ClipboardList, Clock, Star, UploadCloud, File, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';

const MultiSelectDropdown = ({ options, selected, onChange, label, placeholder }) => {
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
      <label className="block text-sm font-medium text-gray-700">{label}</label>
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
        <div className="absolute z-10 mt-1 w-full bg-light-background border border-light-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-secondary-text">No options available.</div>
          ) : (
            <div className="p-2 space-y-1">
              {options.map(opt => (
                <label key={opt.id} className="flex items-center px-2 py-1.5 hover:bg-light-background cursor-pointer rounded">
                  <input
                    type="checkbox"
                    className="rounded text-primary-orange focus:ring-orange-border mr-2"
                    checked={selected.includes(opt.id)}
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
              ))}
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

  const handleBulkSchedule = () => {
    if (selectedExcelFiles.length === 0) return;
    setIsUploadingExcel(true);
    setTimeout(() => {
      setIsUploadingExcel(false);
      setSchedulePopup({ message: 'Files processed successfully! Automated scheduling will begin shortly.', type: 'success' });
      setSelectedExcelFiles([]);
    }, 2000);
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

  const handleToggleAttendee = (stakeholderId) => {
    setAttendees(prev => prev.map(a =>
      a.stakeholder_id === stakeholderId
        ? { ...a, attended: a.attended ? 0 : 1 }
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
      const records = attendees.map(a => ({
        stakeholder_id: a.stakeholder_id,
        status: a.status || 'present',
        notes: a.notes || null
      }));
      await markAttendance(attendanceMeeting.id, records);
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
      let myApprovedPlans = allPlansData.filter(p => p.status === 'approved');
      
      if (user?.role === 'Delivery / Engagement Manager') {
        myApprovedPlans = myApprovedPlans.filter(p => p.approved_by === user?.id);
      }
      
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStakeholders.length === 0 && selectedOrganizers.length === 0) {
      setSchedulePopup({ message: 'Please select at least one participant or organizer.', type: 'error' });
      return;
    }
    startOperation('schedule-meeting');
    try {
      await createMeeting({
        plan_id: formData.plan_id,
        scheduled_at: formData.scheduled_at,
        meeting_link: formData.meeting_link,
        stakeholder_ids: [...selectedOrganizers, ...selectedStakeholders]
      });
      setFormData({
        project_id: '',
        plan_id: '',
        scheduled_at: '',
        meeting_link: ''
      });
      setSelectedStakeholders([]);
      setSelectedOrganizers([]);
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

  if (loading) return <Loader />;

  const canManage = user?.role === 'Delivery / Engagement Manager' || user?.role === 'Outgoing SME (Knowledge Giver)';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary-text">Meeting Schedule</h2>

      {canManage && (
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100 bg-gray-50/50">
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

          <div className="p-6">
            {schedulingMode === 'manual' ? (
              <div>
                <h3 className="text-lg font-semibold text-primary-text mb-4">Schedule New Meeting Manually</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  <div>
                    {user?.role === 'Delivery / Engagement Manager' ? (
                      <MultiSelectDropdown
                        label="Organizers (Knowledge Givers)"
                        placeholder="Select Givers..."
                        options={knowledgeGivers}
                        selected={selectedOrganizers}
                        onChange={setSelectedOrganizers}
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

                  <div className="md:col-span-5">
                    <MultiSelectDropdown
                      label="Participants (Knowledge Receivers)"
                      placeholder="Select Receivers..."
                      options={stakeholders}
                      selected={selectedStakeholders}
                      onChange={setSelectedStakeholders}
                    />
                  </div>

                  <div className="md:col-span-5 flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={scheduling || (selectedStakeholders.length === 0 && selectedOrganizers.length === 0)}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors ${scheduling
                        ? 'bg-button-orange cursor-not-allowed'
                        : (selectedStakeholders.length === 0 && selectedOrganizers.length === 0)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-primary-orange hover:bg-hover-orange'
                        }`}
                    >
                      {scheduling ? (
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
                </form>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-primary-text mb-4">Automatic Scheduling via Excel</h3>
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
