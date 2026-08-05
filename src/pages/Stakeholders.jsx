import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect } from 'react';
import { getStakeholders, createStakeholder, deleteStakeholder } from '../api/api';
import Loader from '../components/Loader';
import { useToast } from '../context/ToastContext';
import { ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';

const Stakeholders = () => {
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stakeholderToDelete, setStakeholderToDelete] = useState(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({ name: '', email: '', role: '' });

  const fetchStakeholders = async () => {
    try {
      const res = await getStakeholders();
      setStakeholders(res.data.data);
    } catch (err) {
      setError('Failed to fetch stakeholders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStakeholders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createStakeholder(formData);
      setFormData({ name: '', email: '', role: '' });
      showToast('Stakeholder added successfully!', 'success');
      fetchStakeholders();
    } catch (err) {
      showToast('Error creating stakeholder', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setStakeholderToDelete(id);
  };

  const confirmDelete = async () => {
    if (!stakeholderToDelete) return;
    try {
      await deleteStakeholder(stakeholderToDelete);
      setStakeholderToDelete(null);
      showToast('Stakeholder deleted successfully!', 'success');
      fetchStakeholders();
    } catch (err) {
      showToast('Error deleting stakeholder', 'error');
      setStakeholderToDelete(null);
    }
  };

  if (loading) return <Loader />;

  const itemsPerPage = 5;
  const indexOfLastStakeholder = currentPage * itemsPerPage;
  const indexOfFirstStakeholder = indexOfLastStakeholder - itemsPerPage;
  const currentStakeholders = stakeholders.slice(indexOfFirstStakeholder, indexOfLastStakeholder);
  const totalPages = Math.ceil(stakeholders.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary-text">Stakeholders</h2>

      {error && <div className="p-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-primary-text mb-4">Add Stakeholder</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:outline-none focus:ring-orange-border focus:border-orange-border"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:outline-none focus:ring-orange-border focus:border-orange-border"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <CustomSelect
                className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:outline-none focus:ring-orange-border focus:border-orange-border"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="" disabled>---Select Role---</option>
                <option value="Delivery / Engagement Manager">Delivery / Engagement Manager</option>
                <option value="Outgoing SME (Knowledge Giver)">Outgoing SME (Knowledge Giver)</option>
                <option value="Incoming Team Member (Knowledge Receiver)">Incoming Team Member (Knowledge Receiver)</option>
                <option value="PwC Leadership">PwC Leadership</option>
              </CustomSelect>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-orange hover:bg-hover-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Stakeholder'}
            </button>
          </form>
        </div>

        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2 overflow-x-auto">
          <h3 className="text-lg font-semibold text-primary-text mb-4">Stakeholders List</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-light-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-text uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-light-background divide-y divide-gray-200">
              {currentStakeholders.map((person) => (
                <tr key={person.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-text">{person.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{person.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text capitalize">{person.role.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="text-red-600 hover:text-red-900 focus:outline-none transition-colors"
                      title="Delete Stakeholder"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {stakeholders.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-secondary-text">No stakeholders found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-light-border bg-light-background px-4 py-3 sm:px-6 mt-4">
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
                    Showing <span className="font-medium">{indexOfFirstStakeholder + 1}</span> to <span className="font-medium">{Math.min(indexOfLastStakeholder, stakeholders.length)}</span> of{' '}
                    <span className="font-medium">{stakeholders.length}</span> results
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
      </div>

      {/* Delete Confirmation Modal */}
      {stakeholderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
          <div className="bg-light-background rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center justify-center mb-4 text-red-500">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle size={32} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-primary-text mb-2">Delete Stakeholder</h3>
            <p className="text-center text-secondary-text mb-6">
              Are you sure you want to delete this stakeholder? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setStakeholderToDelete(null)}
                className="px-5 py-2.5 bg-input-background text-gray-700 rounded-lg font-medium hover:bg-input-background transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stakeholders;
