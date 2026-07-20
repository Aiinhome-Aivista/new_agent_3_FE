import React, { useState, useEffect } from 'react';
import { getPlans, uploadKnowledgeDocument, getKnowledgeDocuments, getPlanTopicOptions } from '../api/api';
import Loader from '../components/Loader';
import { Upload, FileText, Database } from 'lucide-react';

const KnowledgeBasePage = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ktDay, setKtDay] = useState('');
  const [file, setFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [topicOptions, setTopicOptions] = useState([]);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchDocuments();
      fetchTopics();
    } else {
      setDocuments([]);
      setTopicOptions([]);
    }
  }, [selectedPlanId]);

  const fetchTopics = async () => {
    try {
      const res = await getPlanTopicOptions(selectedPlanId);
      const topics = res.data.data || [];
      const distinctDays = [...new Set(topics.map(t => t.day_label).filter(Boolean))];
      setTopicOptions(distinctDays);
      if (distinctDays.length > 0) {
        setKtDay(distinctDays[0]);
      } else {
        setKtDay('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await getPlans();
      const approvedPlans = res.data.data.filter(p => p.status === 'approved');
      setPlans(approvedPlans);
      if (approvedPlans.length > 0) {
        setSelectedPlanId(approvedPlans[0].id.toString());
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch plans.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await getKnowledgeDocuments(selectedPlanId);
      setDocuments(res.data.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch documents.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }
    if (!ktDay.trim()) {
      setErrorMsg('Please enter a Day (e.g., Day 1, Day 2).');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('plan_id', selectedPlanId);
    formData.append('kt_day', ktDay);

    try {
      await uploadKnowledgeDocument(formData);
      setSuccessMsg('Document uploaded and processed successfully.');
      setFile(null);
      setKtDay('');
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Database className="mr-2" size={24} />
          Knowledge Base (Day-wise Upload)
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select KT Plan</label>
        <select
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
        >
          <option value="">-- Select a Plan --</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.application_name}
            </option>
          ))}
        </select>
      </div>

      {selectedPlanId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Upload className="mr-2" size={20} />
              Upload Document
            </h3>
            
            {errorMsg && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-md text-sm border border-green-100">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                {topicOptions.length > 0 ? (
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={ktDay}
                    onChange={(e) => setKtDay(e.target.value)}
                    required
                  >
                    <option value="">-- Select a Day --</option>
                    {topicOptions.map((day, idx) => (
                      <option key={idx} value={day}>{day}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g., 1 or Day 1"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={ktDay}
                    onChange={(e) => setKtDay(e.target.value)}
                    required
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document (.pdf, .txt, .doc, .docx, .ppt, .pptx)</label>
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.ppt,.pptx"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md p-1"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  uploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex justify-center items-center`}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading & Indexing...
                  </>
                ) : (
                  'Upload to Vector DB'
                )}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="mr-2" size={20} />
              Uploaded Documents
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chunks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Uploaded</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.kt_day || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {doc.chunk_count} Chunks
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                        No documents found for this plan. Start by uploading one!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePage;
