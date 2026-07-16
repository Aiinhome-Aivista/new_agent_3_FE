import React, { useState, useEffect } from 'react';
import { getMeetings, createMeeting, updateMeetingStatus, getPlans, notifyMeeting, getStakeholders } from '../api/api';
import Loader from '../components/Loader';
import { Calendar, Bell, CheckCircle } from 'lucide-react';
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
    organizer_id: '',
    description: '',
    meeting_link: ''
  });

  const fetchData = async () => {
    try {
      const [meetingsRes, plansRes, stakeholdersRes] = await Promise.all([
        getMeetings(),
        getPlans(),
        getStakeholders()
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
    try {
      await createMeeting({
        plan_id: formData.plan_id,
        title: formData.title,
        scheduled_at: formData.scheduled_at,
        organizer_id: formData.organizer_id || null,
        description: formData.description,
        meeting_link: formData.meeting_link,
        stakeholder_ids: selectedStakeholders
      });
      setFormData({ 
        plan_id: plans.length > 0 ? plans[0].id : '', 
        title: '', 
        scheduled_at: '', 
        organizer_id: '', 
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
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.organizer_id}
                onChange={(e) => setFormData({...formData, organizer_id: e.target.value})}
              >
                <option value="">-- Select Organizer --</option>
                {stakeholders.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
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
            </div>

            <div className="md:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              {canManage && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {meetings.map((m) => (
              <tr key={m.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(m.scheduled_at).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${m.status === 'completed' ? 'bg-green-100 text-green-800' : m.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {m.status}
                  </span>
                </td>
                {canManage && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 flex justify-end items-center h-full">
                    {m.status === 'scheduled' && (
                      <>
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
    </div>
  );
};

export default SchedulePage;
