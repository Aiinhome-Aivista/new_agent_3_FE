import React, { useState, useEffect } from 'react';
import { getMeetings, createMeeting, updateMeetingStatus, getPlans, notifyMeeting, getStakeholders, getAttendance, markAttendance } from '../api/api';
import Loader from '../components/Loader';
import { Calendar, Bell, CheckCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SchedulePage = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [selectedStakeholders, setSelectedStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifiedId, setNotifiedId] = useState(null);
  const [formData, setFormData] = useState({ 
    plan_id: '', 
    title: '', 
    scheduled_at: '',
    description: '',
    meeting_link: ''
  });

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceMeeting, setAttendanceMeeting] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [fetchingAttendees, setFetchingAttendees] = useState(false);

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
      const [meetingsRes, plansRes, stakeholdersRes] = await Promise.all([
        getMeetings(),
        getPlans(),
        getStakeholders('Incoming Team Member (Knowledge Receiver)')
      ]);
      setMeetings(meetingsRes.data.data);
      setPlans(plansRes.data.data.filter(p => p.status === 'approved'));
      setStakeholders(stakeholdersRes.data.data);
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
    if (selectedStakeholders.length === 0) {
      alert('Please select at least one participant.');
      return;
    }
    try {
      await createMeeting({
        plan_id: formData.plan_id,
        title: formData.title,
        scheduled_at: formData.scheduled_at,
        description: formData.description,
        meeting_link: formData.meeting_link,
        stakeholder_ids: selectedStakeholders
      });
      setFormData({ 
        plan_id: plans.length > 0 ? plans[0].id : '', 
        title: '', 
        scheduled_at: '', 
        description: '', 
        meeting_link: '' 
      });
      setSelectedStakeholders([]);
      fetchData();
      alert('Meeting scheduled successfully! Notifications triggered.');
    } catch (err) {
      alert('Error creating meeting');
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
              <label className="block text-sm font-medium text-gray-700">Organizer</label>
              <input
                type="text"
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                value={user?.name ? `${user.name} (${user.role})` : ''}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Meeting Title</label>
              <input
                type="text" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date & Time</label>
              <input
                type="datetime-local" required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Meeting Link</label>
              <input
                type="url"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.meeting_link}
                onChange={(e) => setFormData({...formData, meeting_link: e.target.value})}
                placeholder="https://meet.google.com/..."
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Provide context or details about the KT session..."
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Participants</label>
              {stakeholders.length === 0 ? (
                <div className="p-3 border border-gray-200 rounded-md bg-gray-100 text-sm text-gray-500">
                  No Knowledge Receivers are available.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 border border-gray-200 rounded-md bg-gray-50 max-h-40 overflow-y-auto">
                  {stakeholders.map(s => (
                    <label key={s.id} className="inline-flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded text-blue-600 focus:ring-blue-500"
                        checked={selectedStakeholders.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStakeholders(prev => [...prev, s.id]);
                          } else {
                            setSelectedStakeholders(prev => prev.filter(id => id !== s.id));
                          }
                        }}
                      />
                      <span>{s.name} ({s.role})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                disabled={selectedStakeholders.length === 0}
                className={`inline-flex items-center px-4 py-2 text-white rounded-md ${selectedStakeholders.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meeting Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              {canManage && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {meetings.map((m) => (
              <tr key={m.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.title}</td>
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
                    {m.status === 'scheduled' && (
                      <>
                        <button 
                          onClick={() => handleOpenAttendanceModal(m)} 
                          disabled={fetchingAttendees === m.id}
                          className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center"
                        >
                          <ClipboardList size={16} className="mr-1" />
                          {fetchingAttendees === m.id ? 'Loading...' : 'Attendance'}
                        </button>
                        {notifiedId === m.id ? (
                          <span className="text-green-600 flex items-center mr-4 transition-all duration-300">
                            <CheckCircle size={16} className="mr-1" /> Sent!
                          </span>
                        ) : (
                          <button onClick={() => handleNotify(m.id)} className="text-blue-600 hover:text-blue-900 mr-4">
                            <Bell size={18} className="inline mr-1" /> Notify
                          </button>
                        )}
                        <button onClick={() => handleStatusChange(m.id, 'completed')} className="text-green-600 hover:text-green-900">
                          <CheckCircle size={18} className="inline mr-1" /> Complete
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Attendance Modal */}
      {isAttendanceModalOpen && attendanceMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Mark Attendance: {attendanceMeeting.title}</h3>
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
                Please check the box next to each participant who was present in this meeting.
              </p>
              
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white">
                {attendees.map((attendee) => (
                  <div key={attendee.stakeholder_id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Participant Details */}
                    <div className="flex items-start space-x-3 flex-1">
                      <input
                        type="checkbox"
                        id={`attendee-${attendee.stakeholder_id}`}
                        className="mt-1 h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                        checked={!!attendee.attended}
                        onChange={() => handleToggleAttendee(attendee.stakeholder_id)}
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
                        className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={attendee.notes || ''}
                        onChange={(e) => handleNotesChange(attendee.stakeholder_id, e.target.value)}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:bg-blue-400"
                disabled={savingAttendance || attendees.length === 0}
              >
                {savingAttendance ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
