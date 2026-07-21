import React, { useState, useEffect } from 'react';
import { getMeetings, createMeeting, updateMeetingStatus, getPlans, notifyMeeting, rescheduleMeeting, getStakeholders, getAttendance, markAttendance } from '../api/api';
import Loader from '../components/Loader';
import { Calendar, Bell, CheckCircle, ClipboardList, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-gray-700">
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No options available.</div>
          ) : (
            <div className="p-2 space-y-1">
              {options.map(opt => (
                <label key={opt.id} className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer rounded">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 mr-2"
                    checked={selected.includes(opt.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...selected, opt.id]);
                      } else {
                        onChange(selected.filter(id => id !== opt.id));
                      }
                    }}
                  />
                  <span className="text-sm text-gray-700">{opt.name} <span className="text-gray-400 text-xs">({opt.role})</span></span>
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
  const [stakeholders, setStakeholders] = useState([]);
  const [knowledgeGivers, setKnowledgeGivers] = useState([]);
  const [selectedStakeholders, setSelectedStakeholders] = useState([]);
  const [selectedOrganizers, setSelectedOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [notifiedId, setNotifiedId] = useState(null);
  const [formData, setFormData] = useState({ 
    plan_id: '', 
    scheduled_at: '',
    meeting_link: ''
  });

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceMeeting, setAttendanceMeeting] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [fetchingAttendees, setFetchingAttendees] = useState(false);

  // Reschedule modal state
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null); // meeting being rescheduled
  const [rescheduleTime, setRescheduleTime] = useState(''); // HH:MM
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const handleOpenAttendanceModal = async (meeting) => {
    setFetchingAttendees(meeting.id);
    try {
      const res = await getAttendance(meeting.id);
      setAttendees(res.data.data || []);
      setAttendanceMeeting(meeting);
      setIsAttendanceModalOpen(true);
    } catch (err) {
      alert('Error fetching meeting participants');
    } finally {
      setFetchingAttendees(false);
    }
  };

  const handleOpenRescheduleModal = (meeting) => {
    // Pre-fill with existing time extracted from scheduled_at
    const existing = new Date(meeting.scheduled_at);
    const hh = String(existing.getUTCHours()).padStart(2, '0');
    const mm = String(existing.getUTCMinutes()).padStart(2, '0');
    setRescheduleTime(`${hh}:${mm}`);
    setRescheduleReason('');
    setRescheduleTarget(meeting);
    setIsRescheduleModalOpen(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleTime) {
      alert('Please select a new time.');
      return;
    }
    setRescheduling(true);
    try {
      await rescheduleMeeting(rescheduleTarget.id, {
        new_time: rescheduleTime,
        reason: rescheduleReason.trim()
      });
      setIsRescheduleModalOpen(false);
      setRescheduleTarget(null);
      setRescheduleTime('');
      setRescheduleReason('');
      fetchData();
      alert('Meeting rescheduled successfully! All participants have been notified via email.');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error rescheduling the meeting.';
      alert(msg);
    } finally {
      setRescheduling(false);
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
      alert('Attendance saved successfully');
      fetchData();
    } catch (err) {
      alert('Error saving attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const fetchData = async () => {
    try {
      const [meetingsRes, plansRes, receiversRes, giversRes] = await Promise.all([
        getMeetings(),
        getPlans(),
        getStakeholders('Incoming Team Member (Knowledge Receiver)'),
        getStakeholders('Outgoing SME (Knowledge Giver)')
      ]);
      setMeetings(meetingsRes.data.data);
      setPlans(plansRes.data.data.filter(p => p.status === 'approved'));
      setStakeholders(receiversRes.data.data);
      setKnowledgeGivers(giversRes.data.data);
      if (plansRes.data.data.length > 0 && !formData.plan_id) {
        setFormData(prev => ({ ...prev, plan_id: plansRes.data.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStakeholders.length === 0 && selectedOrganizers.length === 0) {
      alert('Please select at least one participant or organizer.');
      return;
    }
    setScheduling(true);
    try {
      await createMeeting({
        plan_id: formData.plan_id,
        scheduled_at: formData.scheduled_at,
        meeting_link: formData.meeting_link,
        stakeholder_ids: [...selectedOrganizers, ...selectedStakeholders]
      });
      setFormData({ 
        plan_id: plans.length > 0 ? plans[0].id : '', 
        scheduled_at: '', 
        meeting_link: '' 
      });
      setSelectedStakeholders([]);
      setSelectedOrganizers([]);
      fetchData();
      alert('Meeting scheduled successfully! Notifications triggered.');
    } catch (err) {
      alert('Error creating meeting');
    } finally {
      setScheduling(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateMeetingStatus(id, status);
      fetchData();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleNotify = async (id) => {
    try {
      await notifyMeeting(id);
      setNotifiedId(id);
      setTimeout(() => setNotifiedId(null), 3000);
    } catch (err) {
      alert('Error sending notification');
    }
  };

  if (loading) return <Loader />;

  const canManage = user?.role === 'Delivery / Engagement Manager' || user?.role === 'Outgoing SME (Knowledge Giver)';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Meeting Schedule</h2>

      {canManage && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Schedule New Meeting</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Plan</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.plan_id}
                onChange={(e) => setFormData({...formData, plan_id: e.target.value})}
                required
              >
                <option value="">-- Select Plan --</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.application_name}</option>
                ))}
              </select>
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                    value={user?.name ? `${user.name} (${user.role})` : ''}
                  />
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
              <input
                type="url"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.meeting_link}
                onChange={(e) => setFormData({...formData, meeting_link: e.target.value})}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="md:col-span-4">
              <MultiSelectDropdown
                label="Participants (Knowledge Receivers)"
                placeholder="Select Receivers..."
                options={stakeholders}
                selected={selectedStakeholders}
                onChange={setSelectedStakeholders}
              />
            </div>

            <div className="md:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                disabled={scheduling || (selectedStakeholders.length === 0 && selectedOrganizers.length === 0)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors ${
                  scheduling
                    ? 'bg-blue-400 cursor-not-allowed'
                    : (selectedStakeholders.length === 0 && selectedOrganizers.length === 0)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
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
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {canManage && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {meetings.map((m) => {
                const dayStr = m.day_label || '-';
                const cleanTitle = m.title.replace(/^.*?(Day\s*\d+[^:-]*[:-]\s*)/i, '').replace(/^Day\s*\d+\s*/i, '');

                return (
                <tr key={m.id}>
                  <td className="px-6 py-4 text-sm text-gray-500 break-words min-w-[150px] max-w-[200px]">{m.plan_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{dayStr}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 break-words min-w-[150px] max-w-[200px]">{cleanTitle || m.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(m.scheduled_at).toLocaleString(undefined, { timeZone: 'UTC' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold text-indigo-600">
                  {m.attendance_rate_percent !== undefined ? `${m.attendance_rate_percent}%` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${m.status === 'completed' ? 'bg-green-100 text-green-800' : m.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {m.status}
                  </span>
                </td>
                {canManage && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 flex justify-end items-center h-full">
                    <button 
                      onClick={() => handleOpenAttendanceModal(m)} 
                      disabled={fetchingAttendees === m.id}
                      className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center"
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
                    {m.status === 'scheduled' && (
                      <>
                        {notifiedId === m.id ? (
                          <span className="text-green-600 flex items-center mr-4 transition-all duration-300" title="Sent!">
                            <CheckCircle size={20} />
                          </span>
                        ) : (
                          <button onClick={() => handleNotify(m.id)} className="text-blue-600 hover:text-blue-900 mr-4" title="Notify">
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
                        <button onClick={() => handleStatusChange(m.id, 'completed')} className="text-green-600 hover:text-green-900" title="Complete">
                          <CheckCircle size={20} />
                        </button>
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {attendanceMeeting.status === 'completed' ? 'View Attendance: ' : 'Mark Attendance: '} 
                {attendanceMeeting.title}
              </h3>
              <button 
                onClick={() => { setIsAttendanceModalOpen(false); setAttendanceMeeting(null); setAttendees([]); }}
                className="text-white hover:text-gray-200 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-gray-500">
                {attendanceMeeting.status === 'completed' 
                  ? 'Attendance is locked because the meeting is completed.'
                  : 'Please check the box next to each participant who was present in this meeting.'}
              </p>
              
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white">
                {attendees.map((attendee) => (
                  <div key={attendee.stakeholder_id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Participant Details */}
                    <div className="flex items-start space-x-3 flex-1">
                      <input
                        type="checkbox"
                        id={`attendee-${attendee.stakeholder_id}`}
                        className={`mt-1 h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 ${attendanceMeeting.status === 'completed' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        checked={!!attendee.attended}
                        onChange={() => handleToggleAttendee(attendee.stakeholder_id)}
                        disabled={attendanceMeeting.status === 'completed'}
                      />
                      <label 
                        htmlFor={`attendee-${attendee.stakeholder_id}`}
                        className="text-sm font-medium text-gray-800 cursor-pointer flex-1"
                      >
                        <span className="block">{attendee.stakeholder_name}</span>
                        <span className="text-xs text-gray-500">{attendee.stakeholder_role}</span>
                      </label>
                    </div>

                    {/* Notes Field */}
                    <div className="w-full md:w-64">
                      <input
                        type="text"
                        placeholder="Add notes..."
                        className={`w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${attendanceMeeting.status === 'completed' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        value={attendee.notes || ''}
                        onChange={(e) => handleNotesChange(attendee.stakeholder_id, e.target.value)}
                        disabled={attendanceMeeting.status === 'completed'}
                      />
                    </div>
                  </div>
                ))}
                
                {attendees.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No participants invited to this meeting.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setIsAttendanceModalOpen(false); setAttendanceMeeting(null); setAttendees([]); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                disabled={savingAttendance}
              >
                {attendanceMeeting.status === 'completed' ? 'Close' : 'Cancel'}
              </button>
              {attendanceMeeting.status !== 'completed' && (
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:bg-blue-400"
                  disabled={savingAttendance || attendees.length === 0}
                >
                  {savingAttendance ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ── */}
      {isRescheduleModalOpen && rescheduleTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full flex flex-col border border-amber-200 overflow-hidden">

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
            <div className="p-6 space-y-5">
              {/* Meeting Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Meeting</p>
                <p className="text-sm font-medium text-gray-800">{rescheduleTarget.title}</p>
              </div>

              {/* Alert */}
              <div className="flex items-start space-x-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                <Bell size={15} className="mt-0.5 flex-shrink-0" />
                <span>All participants (Knowledge Giver &amp; Receiver) will be <strong>auto-notified via email</strong> with the new time once you save.</span>
              </div>

              {/* Same-date label (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-xs text-gray-400">(unchanged)</span></label>
                <input
                  type="text"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                  value={new Date(rescheduleTarget.scheduled_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
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
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-gray-800 text-sm"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>

              {/* Reason field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-xs text-gray-400">(optional — included in notification email)</span></label>
                <textarea
                  id="reschedule-reason-input"
                  rows={3}
                  placeholder="e.g. Knowledge Giver is unavailable at the original time..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm resize-none"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-amber-50 px-6 py-4 flex justify-end space-x-3 border-t border-amber-100">
              <button
                type="button"
                onClick={() => { setIsRescheduleModalOpen(false); setRescheduleTarget(null); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                disabled={rescheduling}
              >
                Cancel
              </button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
