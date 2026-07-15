import React, { useState, useEffect } from 'react';
import { getMeetings, createMeeting, updateMeetingStatus, getPlans, notifyMeeting } from '../api/api';
import Loader from '../components/Loader';
import { Calendar, Bell, CheckCircle } from 'lucide-react';

const SchedulePage = () => {
  const [meetings, setMeetings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ plan_id: '', title: '', scheduled_at: '' });

  const fetchData = async () => {
    try {
      const [meetingsRes, plansRes] = await Promise.all([
        getMeetings(),
        getPlans()
      ]);
      setMeetings(meetingsRes.data.data);
      setPlans(plansRes.data.data.filter(p => p.status === 'approved'));
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
      await createMeeting(formData);
      setFormData({ ...formData, title: '', scheduled_at: '' });
      fetchData();
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
      alert('Notification sent!');
    } catch (err) {
      alert('Error sending notification');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Meeting Schedule</h2>

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {m.status === 'scheduled' && (
                    <>
                      <button onClick={() => handleNotify(m.id)} className="text-blue-600 hover:text-blue-900">
                        <Bell size={18} className="inline mr-1" /> Notify
                      </button>
                      <button onClick={() => handleStatusChange(m.id, 'completed')} className="text-green-600 hover:text-green-900">
                        <CheckCircle size={18} className="inline mr-1" /> Complete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SchedulePage;
