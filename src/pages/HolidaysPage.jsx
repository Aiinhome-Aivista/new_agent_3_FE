import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, File, X, Plus, Trash2, CheckCircle, AlertCircle, Edit2, Save, XCircle, Filter } from 'lucide-react';
import { uploadHolidayList, insertHolidays, getHolidays, updateHoliday, deleteHoliday } from '../api/api';

const HolidaysPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Saved Holidays State
  const [savedHolidays, setSavedHolidays] = useState([]);
  const [isFetchingHolidays, setIsFetchingHolidays] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  // New UI Features State
  const [selectedYearFilter, setSelectedYearFilter] = useState('All');
  const [holidayToDelete, setHolidayToDelete] = useState(null); // Stores ID of holiday to delete

  // Helper to show temporary toast messages
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  const fetchSavedHolidays = async () => {
    setIsFetchingHolidays(true);
    try {
      const res = await getHolidays();
      if (res.data && res.data.success) {
        setSavedHolidays(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingHolidays(false);
    }
  };

  useEffect(() => {
    fetchSavedHolidays();
  }, []);

  // Filter and Years extraction
  const availableYears = useMemo(() => {
    const years = new Set(savedHolidays.map(h => h.holiday_year));
    return Array.from(years).sort((a, b) => a - b);
  }, [savedHolidays]);

  const filteredHolidays = useMemo(() => {
    if (selectedYearFilter === 'All') return savedHolidays;
    return savedHolidays.filter(h => h.holiday_year.toString() === selectedYearFilter);
  }, [savedHolidays, selectedYearFilter]);

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await uploadHolidayList(formData);
      
      if (response.data.success) {
        setHolidays(response.data.data || []);
        showSuccess('File parsed successfully! Review the extracted holidays below.');
      } else {
        showError(response.data.message || 'Failed to parse the document.');
      }
    } catch (err) {
      console.error(err);
      showError('An error occurred during file upload and extraction.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...holidays];
    updated[index][field] = value;
    setHolidays(updated);
  };

  const handleAddRow = () => {
    setHolidays([...holidays, { date: '', name: '', year: new Date().getFullYear() }]);
  };

  const handleRemoveRow = (index) => {
    const updated = holidays.filter((_, i) => i !== index);
    setHolidays(updated);
  };

  const handleInsertHolidays = async () => {
    if (holidays.length === 0) return;
    setIsSaving(true);
    setError('');
    setSuccess('');

    // validation
    for (let h of holidays) {
      if (!h.date || !h.name || !h.year) {
        showError("All rows must have a date, name, and year filled out.");
        setIsSaving(false);
        return;
      }
    }

    try {
      const response = await insertHolidays({ holidays });
      if (response.data.success) {
        showSuccess('Holidays inserted into the database successfully!');
        setHolidays([]);
        setSelectedFile(null);
        fetchSavedHolidays(); // Auto-refresh the list
      } else {
        showError(response.data.message || 'Failed to insert holidays.');
      }
    } catch (err) {
      console.error(err);
      showError('An error occurred while saving to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!holidayToDelete) return;
    try {
      const res = await deleteHoliday(holidayToDelete);
      if (res.data.success) {
        showSuccess('Holiday deleted successfully.');
        fetchSavedHolidays();
      } else {
        showError(res.data.message || "Failed to delete holiday.");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while deleting.");
    } finally {
      setHolidayToDelete(null);
    }
  };

  const handleEditClick = (holiday) => {
    setEditingHolidayId(holiday.id);
    setEditFormData({
      date: formatDateForInput(holiday.holiday_date),
      name: holiday.holiday_name,
      year: holiday.holiday_year
    });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await updateHoliday(editingHolidayId, editFormData);
      if (res.data.success) {
        setEditingHolidayId(null);
        showSuccess('Holiday updated successfully.');
        fetchSavedHolidays();
      } else {
        showError(res.data.message || "Failed to update holiday.");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while updating.");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manage Holidays</h1>
      </div>

      {/* Floating Toast Alerts */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center shadow-lg border border-green-200 animate-fade-in-up min-w-[300px]">
            <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center shadow-lg border border-red-200 animate-fade-in-up min-w-[300px]">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Holiday List</h2>
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 text-center font-medium">
            Drag & drop a file here, or click to select
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
            onChange={handleFileSelect}
          />
        </div>

        {selectedFile && (
          <div className="mt-6">
            <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <File className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSelectedFile(null)} 
                  className="text-gray-500 hover:text-red-500 transition p-1"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className={`px-5 py-2 rounded-lg font-medium shadow-sm transition-all text-white
                    ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                >
                  {isUploading ? 'Extracting Data...' : 'Process File'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Section */}
      {holidays.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">Review & Edit Holidays</h2>
            <button 
              onClick={handleAddRow}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Row
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold w-1/4">Date (YYYY-MM-DD)</th>
                  <th className="p-4 font-semibold w-2/4">Holiday Name</th>
                  <th className="p-4 font-semibold w-1/4 text-center">Year</th>
                  <th className="p-4 font-semibold w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {holidays.map((h, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <input 
                        type="date"
                        value={h.date || ''}
                        onChange={(e) => handleFieldChange(idx, 'date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text"
                        value={h.name || ''}
                        onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="e.g. Christmas Day"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="number"
                        value={h.year || ''}
                        onChange={(e) => handleFieldChange(idx, 'year', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-center"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleRemoveRow(idx)}
                        className="text-gray-400 hover:text-red-500 transition p-2 rounded-full hover:bg-red-50"
                        title="Remove row"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
            <button
              onClick={() => { setHolidays([]); setSelectedFile(null); setError(''); setSuccess(''); }}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleInsertHolidays}
              disabled={isSaving}
              className={`flex items-center px-6 py-2.5 rounded-lg font-medium shadow-md transition-all text-white
                ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}
            >
              {isSaving ? 'Saving...' : 'Insert to Database'}
            </button>
          </div>
        </div>
      )}

      {/* Saved Holidays List Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Saved Holidays</h2>
            <p className="text-sm text-gray-500 mt-1">Manage all holidays currently stored in the database.</p>
          </div>
          
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="w-4 h-4 text-gray-400 mr-2" />
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value="All">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {isFetchingHolidays ? (
            <div className="p-8 text-center text-gray-500">Loading holidays...</div>
          ) : filteredHolidays.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {selectedYearFilter !== 'All' 
                ? `No holidays found for year ${selectedYearFilter}.` 
                : 'No holidays saved in the database yet.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Holiday Name</th>
                  <th className="p-4 font-semibold text-center">Year</th>
                  <th className="p-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHolidays.map((holiday) => {
                  const isEditing = editingHolidayId === holiday.id;
                  
                  return (
                    <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-800">
                        {isEditing ? (
                          <input 
                            type="date"
                            value={editFormData.date || ''}
                            onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        ) : (
                          new Date(holiday.holiday_date).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })
                        )}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-800">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editFormData.name || ''}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        ) : (
                          holiday.holiday_name
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-500 text-center">
                        {isEditing ? (
                          <input 
                            type="number"
                            value={editFormData.year || ''}
                            onChange={(e) => setEditFormData({...editFormData, year: e.target.value})}
                            className="w-full max-w-[80px] mx-auto px-3 py-1.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-center"
                          />
                        ) : (
                          holiday.holiday_year
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-700 transition p-1 rounded-full hover:bg-green-50"
                              title="Save"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setEditingHolidayId(null)}
                              className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
                              title="Cancel"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => handleEditClick(holiday)}
                              className="text-blue-500 hover:text-blue-700 transition p-1 rounded-full hover:bg-blue-50"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setHolidayToDelete(holiday.id)}
                              className="text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {holidayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-30 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Delete Holiday?</h3>
              <p className="text-center text-gray-500 text-sm">
                Are you sure you want to delete this holiday from the list? This action cannot be undone.
              </p>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between space-x-3">
              <button
                onClick={() => setHolidayToDelete(null)}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidaysPage;
