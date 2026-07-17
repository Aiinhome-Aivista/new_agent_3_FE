import React, { useState, useEffect } from 'react';
import { getPlans, getRisks, detectRisks, escalateRisk, getKnowledgeDocuments, uploadKnowledgeDocument } from '../api/api';
import Loader from '../components/Loader';
import { AlertTriangle, AlertCircle, FileText, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RisksPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [risks, setRisks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const res = await getPlans();
        const approvedPlans = res.data.data.filter(p => p.status === 'approved');
        setPlans(approvedPlans);
        if (approvedPlans.length > 0) {
          setSelectedPlanId(approvedPlans[0].id.toString());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchRisks();
      fetchDocuments();
    }
  }, [selectedPlanId]);

  const fetchRisks = async () => {
    try {
      const res = await getRisks(selectedPlanId);
      setRisks(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await getKnowledgeDocuments(selectedPlanId);
      setDocuments(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDetectRisks = async () => {
    if (!selectedPlanId) return;
    setDetecting(true);
    try {
      await detectRisks(selectedPlanId);
      fetchRisks();
    } catch (err) {
      alert('Error detecting risks');
    } finally {
      setDetecting(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedPlanId) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('plan_id', selectedPlanId);

    setUploading(true);
    try {
      await uploadKnowledgeDocument(formData);
      setSelectedFile(null);
      e.target.reset();
      fetchDocuments();
    } catch (err) {
      alert('Error uploading document');
    } finally {
      setUploading(false);
    }
  };

  const handleEscalate = async (id) => {
    try {
      await escalateRisk(id);
      fetchRisks();
    } catch (err) {
      alert('Error escalating risk');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <Loader />;

  const isManager = user?.role === 'Delivery / Engagement Manager';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <AlertTriangle className="mr-2 text-red-500" /> AI Risk Detection
      </h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div className="flex-1 max-w-md mr-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.application_name}</option>
            ))}
          </select>
        </div>
        {isManager && (
          <button
            onClick={handleDetectRisks}
            disabled={detecting || !selectedPlanId}
            className="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {detecting ? 'Analyzing Data...' : 'Run AI Risk Detection'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {risks.map((risk) => (
          <div key={risk.id} className={`rounded-xl shadow-sm border p-5 ${getSeverityColor(risk.severity)} bg-opacity-50`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white shadow-sm`}>
                {risk.severity}
              </span>
              <span className="text-xs font-medium opacity-75">{new Date(risk.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm font-medium mb-4 leading-relaxed">{risk.description}</p>
            <div className="flex justify-between items-center border-t pt-3 border-black border-opacity-10">
              <span className="text-xs font-semibold capitalize opacity-75">
                Status: {risk.status}
                {risk.jira_ticket_ref && ` | Jira: ${risk.jira_ticket_ref}`}
              </span>
              {risk.status === 'open' && isManager && (
                <button
                  onClick={() => handleEscalate(risk.id)}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded bg-white hover:bg-gray-50 shadow-sm"
                >
                  <AlertCircle size={14} className="mr-1" /> Escalate
                </button>
              )}
            </div>
          </div>
        ))}
        {risks.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No risks detected for this plan. Run AI detection to analyze tracking data, uploaded knowledge documents, and related tickets to flag risks.
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-gray-200 pt-8">
        <h3 className="text-xl font-bold text-gray-800 flex items-center mb-6">
          <FileText className="mr-2 text-blue-600" /> Knowledge Base Documents
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isManager && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1 h-fit">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Upload Document</h4>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : <><Upload size={16} className="mr-2" /> Upload</>}
                </button>
              </form>
            </div>
          )}
          <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${isManager ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <h4 className="text-md font-semibold text-gray-800 mb-4">Available Documents</h4>
            {documents.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <li key={doc.id} className="py-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="text-gray-400 mr-3" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                        <p className="text-xs text-gray-500">Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()} &middot; {doc.chunk_count} chunks</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4 border border-dashed rounded-lg">No documents have been uploaded for this plan yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RisksPage;
