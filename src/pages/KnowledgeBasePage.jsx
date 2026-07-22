import React, { useState, useEffect } from 'react';
import { getPlans, uploadKnowledgeDocument, getKnowledgeDocuments, getPlanTopicOptions, extractVideoTranscript, uploadTranscript } from '../api/api';
import Loader from '../components/Loader';
import { Upload, FileText, Database, Video } from 'lucide-react';

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  // Transcript states
  const [videoUrl, setVideoUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedTranscript, setExtractedTranscript] = useState('');
  const [uploadingTranscript, setUploadingTranscript] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchDocuments();
      fetchTopics();
      setCurrentPage(1);
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

  const handleExtractTranscript = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setExtractedTranscript('');

    if (!videoUrl) {
      setErrorMsg('Please enter a video URL.');
      return;
    }

    setExtracting(true);
    try {
      const res = await extractVideoTranscript({ url: videoUrl });
      setExtractedTranscript(res.data.data.transcript);
      setSuccessMsg('Transcript extracted successfully. You can now edit and upload it.');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to extract transcript.');
    } finally {
      setExtracting(false);
    }
  };

  const handleUploadTranscript = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!extractedTranscript) {
      setErrorMsg('No transcript to upload.');
      return;
    }
    if (!ktDay.trim()) {
      setErrorMsg('Please enter a Day (e.g., Day 1) before uploading transcript.');
      return;
    }

    setUploadingTranscript(true);
    try {
      await uploadTranscript({
        plan_id: selectedPlanId,
        kt_day: ktDay,
        text: extractedTranscript,
        url: videoUrl
      });
      setSuccessMsg('Transcript uploaded and processed successfully.');
      setExtractedTranscript('');
      setVideoUrl('');
      setKtDay('');
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to upload transcript.');
    } finally {
      setUploadingTranscript(false);
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocuments = documents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(documents.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Database className="text-indigo-600" size={24} />
            </div>
            Knowledge Base Manager
          </h2>
          <p className="text-sm text-gray-500 mt-1 ml-11">Manage and index documents day-wise for your KT plans</p>
        </div>

        <div className="flex-shrink-0 w-full md:w-80">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selected KT Plan</label>
          <div className="relative">
            <select
              className="appearance-none block w-full px-5 py-3 bg-white border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-semibold text-gray-700 cursor-pointer shadow-sm truncate pr-10"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              <option value="" disabled>---Select Plan---</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.application_name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {selectedPlanId ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload Tools */}
          <div className="flex flex-col xl:col-span-4">
            {/* Document Upload Card */}
            <div className="w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-8 py-6 border-b border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full opacity-20 blur-2xl"></div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3 relative z-10">
                  <div className="bg-white p-2.5 rounded-xl shadow-sm">
                    <Upload className="text-indigo-600" size={22} />
                  </div>
                  Upload Knowledge Document
                </h3>
                <p className="text-sm text-gray-500 mt-2 ml-[3.25rem] relative z-10">Select a KT Day and upload the relevant study materials.</p>
              </div>

              <div className="p-8">
                {errorMsg && (
                  <div className="mb-6 flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
                    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="mb-6 flex items-center gap-3 bg-green-50 text-green-700 p-4 rounded-xl text-sm border border-green-100">
                    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    {successMsg}
                  </div>
                )}

                <form onSubmit={handleUpload} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">KT Day Assignment</label>
                    <div className="relative">
                      {topicOptions.length > 0 ? (
                        <select
                          className="appearance-none block w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-medium text-gray-700 shadow-sm truncate pr-10 cursor-pointer"
                          value={ktDay}
                          onChange={(e) => setKtDay(e.target.value)}
                          required
                        >
                          <option value="">-- Select a Day --</option>
                          {topicOptions.map((day, idx) => (
                            <option key={idx} value={day} className="font-medium text-gray-700 py-1">{day}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g., 1 or Day 1"
                          className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all shadow-sm"
                          value={ktDay}
                          onChange={(e) => setKtDay(e.target.value)}
                          required
                        />
                      )}
                      {topicOptions.length > 0 && (
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">File (.pdf, .txt, .docx, .pptx)</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".txt,.pdf,.doc,.docx,.ppt,.pptx"
                        className="block w-full text-sm text-gray-500 
                                  file:mr-4 file:py-2.5 file:px-4 
                                  file:rounded-l-xl file:border-0 
                                  file:text-sm file:font-semibold 
                                  file:bg-indigo-50 file:text-indigo-700 
                                  hover:file:bg-indigo-100 file:cursor-pointer
                                  border border-gray-200 rounded-xl bg-gray-50 
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        onChange={(e) => setFile(e.target.files[0])}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className={`w-full py-4 px-6 rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-300 ${uploading ? 'bg-indigo-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto] hover:bg-[100%_center] hover:shadow-indigo-500/30 hover:-translate-y-1'
                      } focus:outline-none focus:ring-4 focus:ring-indigo-100 flex justify-center items-center`}
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing & Indexing...
                      </>
                    ) : (
                      'Upload Document'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Uploaded Documents Table */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden flex flex-col transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] h-full xl:col-span-8">
            <div className="bg-white px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <FileText size={20} />
                </div>
                Indexed Documents
              </h3>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                {documents.length} Total
              </span>
            </div>

            <div className="flex-1 overflow-x-auto p-0">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-5 text-left text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Day / Topic</th>
                    <th className="px-6 py-5 text-left text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Document Name</th>
                    <th className="px-6 py-5 text-left text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-8 py-5 text-left text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {currentDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5 max-w-[260px]">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                          <span className="text-sm font-semibold text-gray-700 leading-relaxed">
                            {doc.kt_day || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <FileText className="text-gray-300 mr-3 flex-shrink-0 group-hover:text-indigo-400 transition-colors" size={18} />
                          <span className="text-sm font-medium text-gray-800 line-clamp-1" title={doc.filename}>{doc.filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="px-3.5 py-1.5 inline-flex text-xs font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                          {doc.chunk_count} Chunks
                        </span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-gray-500">
                        {new Date(doc.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Database size={48} className="mb-4 opacity-20" />
                          <p className="text-base font-medium text-gray-500">No documents indexed yet</p>
                          <p className="text-sm mt-1">Upload a file or extract a transcript to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white px-8 py-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between mt-auto gap-4">
                <div className="flex-1 flex justify-between sm:hidden w-full">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, documents.length)}</span> of <span className="font-medium">{documents.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => handlePageChange(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === i + 1
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-indigo-50 rounded-full">
              <Database size={48} className="text-indigo-300" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Plan Selected</h3>
          <p className="text-gray-500 max-w-md mx-auto">Please select a KT plan from the dropdown above to manage its knowledge base documents.</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePage;
