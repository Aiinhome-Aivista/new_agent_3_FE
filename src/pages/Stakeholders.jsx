import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect } from 'react';
import { getStakeholders, createStakeholder, updateStakeholder, deleteStakeholder, getProjects, uploadStakeholdersExcel, downloadStakeholdersTemplate } from '../api/api';
import Loader from '../components/Loader';
import { useToast } from '../context/ToastContext';
import { ChevronLeft, ChevronRight, Trash2, Edit2, AlertTriangle, X, Download } from 'lucide-react';

const Stakeholders = () => {
  const [stakeholders, setStakeholders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stakeholderToDelete, setStakeholderToDelete] = useState(null);
  const [editingStakeholderId, setEditingStakeholderId] = useState(null);
  const [activeTab, setActiveTab] = useState('single');
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [bulkProjectId, setBulkProjectId] = useState('');
  const [bulkTrackName, setBulkTrackName] = useState('');
  const [bulkProjectTracks, setBulkProjectTracks] = useState([]);
  const fileInputRef = React.useRef(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({ name: '', email: '', role: '', project_id: '', track_name: '' });
  const [selectedProjectTracks, setSelectedProjectTracks] = useState([]);

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

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  useEffect(() => {
    fetchStakeholders();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      const proj = projects.find(p => p.id === parseInt(formData.project_id));
      if (proj && proj.config && proj.config.tracks) {
        setSelectedProjectTracks(proj.config.tracks);
      } else {
        setSelectedProjectTracks([]);
      }
    } else {
      setSelectedProjectTracks([]);
    }
  }, [formData.project_id, projects]);

  useEffect(() => {
    if (bulkProjectId) {
      const proj = projects.find(p => p.id === parseInt(bulkProjectId));
      if (proj && proj.config && proj.config.tracks) {
        setBulkProjectTracks(proj.config.tracks);
      } else {
        setBulkProjectTracks([]);
      }
    } else {
      setBulkProjectTracks([]);
    }
  }, [bulkProjectId, projects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingStakeholderId) {
        await updateStakeholder(editingStakeholderId, formData);
        showToast('Stakeholder updated successfully!', 'success');
      } else {
        await createStakeholder(formData);
        showToast('Stakeholder added successfully!', 'success');
      }
      setFormData({ name: '', email: '', role: '', project_id: '', track_name: '' });
      setEditingStakeholderId(null);
      fetchStakeholders();
    } catch (err) {
      showToast(`Error ${editingStakeholderId ? 'updating' : 'creating'} stakeholder`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (person) => {
    setEditingStakeholderId(person.id);
    setFormData({
      name: person.name || '',
      email: person.email || '',
      role: person.role || '',
      project_id: person.project_id || '',
      track_name: person.track_name || ''
    });
  };

  const cancelEdit = () => {
    setEditingStakeholderId(null);
    setFormData({ name: '', email: '', role: '', project_id: '', track_name: '' });
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingExcel(true);
    const data = new FormData();
    data.append('file', file);
    data.append('project_id', bulkProjectId);
    if (bulkTrackName) {
      data.append('track_name', bulkTrackName);
    }
    
    try {
      const res = await uploadStakeholdersExcel(data);
      if (res.data.success) {
        showToast(res.data.message || 'Stakeholders uploaded successfully!', 'success');
        fetchStakeholders();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Error uploading excel file.', 'error');
    } finally {
      setUploadingExcel(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await downloadStakeholdersTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stakeholders_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Error downloading template', 'error');
    } finally {
      setIsDownloadingTemplate(false);
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
        <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1 h-fit">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${activeTab === 'single' ? 'text-primary-orange border-b-2 border-primary-orange' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Add Stakeholder
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${activeTab === 'bulk' ? 'text-primary-orange border-b-2 border-primary-orange' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Bulk Add
            </button>
          </div>

          {activeTab === 'single' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary-text">
                  {editingStakeholderId ? 'Edit Stakeholder' : 'Add Stakeholder'}
                </h3>
                {editingStakeholderId && (
                  <button
                    onClick={cancelEdit}
                    className="text-gray-500 hover:text-gray-700"
                    title="Cancel Edit"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
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
                  {isSubmitting ? (editingStakeholderId ? 'Updating...' : 'Adding...') : (editingStakeholderId ? 'Update Stakeholder' : 'Add Stakeholder')}
                </button>
              </form>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-primary-text mb-4">Bulk Add Stakeholders</h3>
              <p className="text-sm text-secondary-text mb-4">Upload an Excel file to automatically add stakeholders.</p>
              <div className="space-y-4">
                
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className={`w-full flex justify-center items-center py-2 px-4 border border-orange-border rounded-md shadow-sm text-sm font-medium text-primary-orange bg-white hover:bg-orange-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border disabled:opacity-50`}
                  title="Download Template"
                >
                  {isDownloadingTemplate ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download size={18} className="mr-2" />
                      Download Template
                    </>
                  )}
                </button>
                
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploadingExcel}
                  className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border disabled:opacity-50 ${uploadingExcel
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-orange hover:bg-hover-orange'
                  }`}
                  title={"Upload Excel"}
                >
                  {uploadingExcel ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    'Upload Excel'
                  )}
                </button>
              </div>
            </>
          )}
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
                      onClick={() => handleEdit(person)}
                      className="text-blue-600 hover:text-blue-900 focus:outline-none transition-colors mr-3"
                      title="Edit Stakeholder"
                    >
                      <Edit2 size={18} />
                    </button>
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
