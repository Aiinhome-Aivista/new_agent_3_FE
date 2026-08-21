import React, { useState, useEffect, useRef } from 'react';
import { getPlans, uploadSudDocument, getSudDocuments, getPlanSummary } from '../api/api';
import CustomSelect from '../components/CustomSelect';
import Loader from '../components/Loader';
import { Upload, FileText, CheckCircle2, AlertCircle, Clock, FileCheck, Layers, Lock, Unlock } from 'lucide-react';
import { useOperations } from '../context/OperationsContext';

const SudUploadPage = () => {
  const fileInputRef = useRef(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeOperations, startOperation, endOperation } = useOperations();
  const uploading = activeOperations['upload-sud-document'];
  const [files, setFiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [kaSummary, setKaSummary] = useState(null);
  const [checkingKa, setCheckingKa] = useState(false);

  useEffect(() => {
    fetchAssignedPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchDocuments(selectedPlanId);
      fetchKaStatus(selectedPlanId);
    } else {
      setDocuments([]);
      setKaSummary(null);
    }
  }, [selectedPlanId]);

  const fetchAssignedPlans = async () => {
    try {
      setLoading(true);
      const res = await getPlans({ for_dropdown: 'true' });
      const planList = res.data?.data || [];
      setPlans(planList);
    } catch (err) {
      console.error('Error fetching assigned plans:', err);
      setErrorMsg('Failed to fetch assigned KT plans.');
    } finally {
      setLoading(false);
    }
  };

  const fetchKaStatus = async (planId) => {
    try {
      setCheckingKa(true);
      const res = await getPlanSummary(planId);
      setKaSummary(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching KA summary:', err);
      setKaSummary(null);
    } finally {
      setCheckingKa(false);
    }
  };

  const fetchDocuments = async (planId) => {
    try {
      const res = await getSudDocuments(planId);
      setDocuments(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedPlanId) {
      setErrorMsg('Please select an assigned KT plan.');
      return;
    }

    if (files.length === 0) {
      setErrorMsg('Please select at least one SUD document to upload.');
      return;
    }

    startOperation('upload-sud-document');
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('plan_id', selectedPlanId);
      formData.append('kt_day', 'SUD Document');

      const selectedPlan = plans.find(p => String(p.id) === String(selectedPlanId));
      if (selectedPlan && (selectedPlan.project_id || selectedPlan.project_config?.project_id)) {
        formData.append('project_id', selectedPlan.project_id || selectedPlan.project_config?.project_id);
      }

      const res = await uploadSudDocument(formData);
      if (res.data?.success) {
        setSuccessMsg(`Successfully uploaded ${files.length} SUD document(s).`);
        setFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchDocuments(selectedPlanId);
      } else {
        setErrorMsg(res.data?.message || 'Failed to upload document.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMsg(err.response?.data?.message || 'Error uploading document.');
    } finally {
      endOperation('upload-sud-document');
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (doc.kt_day && doc.kt_day.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const kaCompletionPercent = kaSummary ? (kaSummary.avg_completion_percent || 0) : 0;
  const isKaComplete = selectedPlanId ? (kaCompletionPercent >= 100) : false;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Upload className="text-primary-orange" size={32} />
            SUD Document Upload
          </h1>
          <p className="text-slate-500 mt-1">
            Upload System Understanding Documents (SUD) for your assigned KT plans
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center text-amber-800 space-y-3">
          <AlertCircle className="mx-auto text-amber-600" size={48} />
          <h3 className="text-lg font-semibold">No Assigned KT Plans Found</h3>
          <p className="text-sm max-w-md mx-auto">
            You have not been added to any KT plans yet. Once you are added to a plan as a Knowledge Receiver, your plans will appear here for SUD document upload.
          </p>
        </div>
      ) : (
        /* SINGLE DIV CONTAINER WITH SIDE-BY-SIDE SECTIONS */
        <div className="bg-white rounded-xl shadow-sm border border-light-border p-6 space-y-6">
          
          {/* Top Header Row: SINGLE DROPDOWN across top */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="text-primary-orange" size={18} />
                Select Assigned KT Plan
              </label>
              <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                {plans.length} plan(s) assigned
              </span>
            </div>

            <CustomSelect
              value={selectedPlanId}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="w-full"
            >
              <option value="">Select a plan...</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.application_name} ({p.plan_type})
                </option>
              ))}
            </CustomSelect>
          </div>

          {/* SIDE-BY-SIDE GRID INSIDE THE SAME SINGLE DIV */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-slate-100 pt-6">
            
            {/* Left Side (5 cols): Upload File Section */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="text-primary-orange" size={20} />
                Upload File
              </h2>

              {/* KA Phase Lock Status Card */}
              {selectedPlanId && !checkingKa && (
                !isKaComplete ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-amber-800">
                        <Lock className="text-amber-600 shrink-0" size={16} />
                        SUD Upload Locked
                      </span>
                      <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        KA Progress: {kaCompletionPercent}%
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Knowledge Acquisition (KA) Phase is currently ongoing ({kaCompletionPercent}% completed). SUD Document upload unlocks automatically when KA Phase reaches 100%.
                    </p>
                    <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-amber-600 h-full transition-all duration-500 rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(0, kaCompletionPercent))}%` }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs shadow-sm">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Unlock className="text-emerald-600 shrink-0" size={16} />
                      KA Phase 100% Completed
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[11px] border border-emerald-200">
                      Upload Unlocked
                    </span>
                  </div>
                )
              )}

              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Drop Area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    SUD File(s) (PDF, DOCX, PPTX, TXT)
                  </label>
                  <div 
                    onClick={() => isKaComplete && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      !selectedPlanId || !isKaComplete
                        ? 'border-slate-200 bg-slate-100/70 cursor-not-allowed opacity-75'
                        : 'border-slate-300 hover:border-primary-orange cursor-pointer bg-slate-50 hover:bg-orange-50/30'
                    }`}
                  >
                    <Upload className={`mx-auto mb-2 ${!selectedPlanId || !isKaComplete ? 'text-slate-300' : 'text-slate-400'}`} size={32} />
                    <p className="text-sm font-medium text-slate-700">
                      {!selectedPlanId
                        ? 'Select a plan to enable upload'
                        : !isKaComplete
                        ? 'Upload is locked (KA Phase incomplete)'
                        : 'Click to select file(s)'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {!selectedPlanId
                        ? 'Select an assigned plan above'
                        : !isKaComplete
                        ? `Requires 100% KA completion (Current: ${kaCompletionPercent}%)`
                        : 'Supports .pdf, .docx, .pptx, .txt'}
                    </p>
                    <input 
                      ref={fileInputRef}
                      type="file"
                      multiple
                      disabled={!selectedPlanId || !isKaComplete}
                      accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    <p className="text-xs font-semibold text-slate-600">Selected Files ({files.length}):</p>
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg text-xs">
                        <span className="truncate max-w-[180px] font-medium text-slate-700">{file.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-red-500 hover:text-red-700 font-bold px-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages */}
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  type="submit"
                  disabled={!isKaComplete || uploading || files.length === 0 || !selectedPlanId}
                  className={`w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all ${
                    !isKaComplete || uploading || files.length === 0 || !selectedPlanId
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-primary-orange hover:bg-orange-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader size="sm" />
                      <span>Uploading & Processing...</span>
                    </>
                  ) : !isKaComplete && selectedPlanId ? (
                    <>
                      <Lock size={18} />
                      <span>Upload Locked (KA Phase Incomplete)</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Upload SUD Document</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Side (7 cols): Uploaded Documents Table Section */}
            <div className="lg:col-span-7 space-y-4 lg:border-l lg:border-slate-100 lg:pl-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileCheck className="text-primary-orange" size={20} />
                    Uploaded Documents
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Documents uploaded for the selected KT plan
                  </p>
                </div>

                {documents.length > 0 && (
                  <input
                    type="text"
                    placeholder="Search docs..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
                  />
                )}
              </div>

              {/* Table Content */}
              {!selectedPlanId ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <Layers className="mx-auto text-slate-300" size={36} />
                  <p className="text-sm font-medium text-slate-600">Please select an assigned KT plan</p>
                  <p className="text-xs text-slate-400">Choose a plan from the dropdown above to view its documents and enable upload.</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <FileText className="mx-auto text-slate-300" size={36} />
                  <p className="text-sm font-medium text-slate-600">No documents uploaded yet</p>
                  <p className="text-xs text-slate-400">Select files from the form on the left to upload your SUD document.</p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No documents match your search query "{searchFilter}".
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Filename</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Uploaded</th>
                        <th className="py-3 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-800 flex items-center gap-2">
                            <FileText size={15} className="text-primary-orange shrink-0" />
                            <span className="truncate max-w-[160px]" title={doc.filename}>{doc.filename}</span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium border border-slate-200">
                              {doc.kt_day || 'SUD Document'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500">
                            <span>{new Date(doc.uploaded_at.replace(/ GMT$/, '')).toLocaleDateString()}</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 size={11} />
                              Uploaded
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SudUploadPage;
