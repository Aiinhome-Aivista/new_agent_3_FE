import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getPlans, generatePlan, extractPlanInfoFromDoc, approvePlan, closePlan, runFullWorkflow, getStakeholders, assignPlanManager, editPlan, getPlanTopicOptions, resyncPlanTopics, addPlanTopic, deletePlanTopic, linkPlanToProject } from '../api/api';
import { getProjects, createProject, getProjectById, updateProject } from '../api/projects';
import Loader from '../components/Loader';
import { FileText, CheckCircle, Play, X, ArrowRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, UserPlus, RefreshCw, Plus, Trash2, List, Upload, FileUp, FolderOpen, Clock, Edit, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';
import { useToast } from '../context/ToastContext';

const checkboxConfig = [
  { 
    id: 'ka', 
    label: 'Knowledge Acquisition',
    groups: [
      {
        title: 'Entry Criteria',
        items: [
          { id: 'kt_doc', label: 'Project KT Document Ready' },
          { id: 'stakeholder_map', label: 'Stakeholder Mapping Ready' }
        ]
      },
      {
        title: 'Exit Criteria',
        items: [
          { 
            id: 'rkt', 
            label: 'Reverse KT',
            subItems: [
              { id: 'upload_sud', label: 'By uploading SUD' }
            ]
          },
          { id: 'sud_mandatory', label: 'SUD Mandatory' },
          { id: 'assessment', label: 'Assessment' }
        ]
      }
    ]
  },
  { 
    id: 'shadow_resourcing', 
    label: 'Shadow Resourcing', 
    groups: [
      {
        title: 'Entry Criteria',
        items: [
          { id: 'assessment_80', label: 'Assessment (80% Above)' },
          { id: 'sud_doc_upload', label: 'SUD Document Uploaded or Not' }
        ]
      },
      {
        title: 'Exit Criteria',
        items: [
          { id: 'ticket_resolving', label: 'Need to be involved in ticket resolving', hasInput: true, inputLabel: 'e.g. 5 tickets' },
          { id: 'weeks_shadow', label: 'Required weeks for shadow resourcing', hasInput: true, inputLabel: 'e.g. 2 weeks' }
        ]
      }
    ]
  },
  { 
    id: 'lead_resourcing', 
    label: 'Lead Resourcing',
    groups: [
      {
        title: 'Entry Criteria',
        items: [
          { id: 'lr_ticket_resolving', label: 'Need to be involved in ticket resolving', hasInput: true, inputLabel: 'e.g. 5 tickets' },
          { id: 'lr_weeks_shadow', label: 'Required weeks for shadow resourcing', hasInput: true, inputLabel: 'e.g. 2 weeks' }
        ]
      }
    ]
  }
];

const CheckboxNode = ({ item, node, trackId, moduleId, handleCheckboxChange, handleInputChange, level = 0 }) => {
  const nodeId = moduleId ? `${trackId}-${moduleId}` : trackId;
  return (
    <div className={`flex flex-col space-y-2 ${level > 0 ? 'mt-2 border-l-2 border-gray-200 ml-2 py-1 pl-5' : 'p-4 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200'}`}>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id={`chk-${nodeId}-${item.id}`}
          checked={node.options[item.id] || false}
          onChange={() => handleCheckboxChange(trackId, item.id, moduleId)}
          className="h-4 w-4 text-primary-orange rounded border-light-border focus:ring-primary-orange"
        />
        <label htmlFor={`chk-${nodeId}-${item.id}`} className={`text-sm cursor-pointer ${level > 0 ? 'text-secondary-text' : 'text-primary-text'}`}>
          {item.label}
        </label>
        {item.hasInput && node.options[item.id] && (
          <input
            type="text"
            className={`w-16 px-2 py-1 text-xs border border-light-border rounded ml-2`}
            placeholder={item.inputLabel || ''}
            value={node.inputs[item.id] || ''}
            onChange={(e) => handleInputChange(trackId, item.id, e.target.value, moduleId)}
          />
        )}
      </div>
      
      {item.groups && node.options[item.id] && (
        <div className="space-y-4 mt-3 pt-2 border-t border-gray-100">
          {item.groups.map((group, idx) => (
            <div key={idx} className="bg-gray-50/50 p-3 rounded-md border border-gray-100">
              <h5 className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wider">{group.title}</h5>
              <div className="space-y-3">
                {group.items.map((sub) => (
                  <CheckboxNode 
                    key={sub.id} 
                    item={sub} 
                    node={node} 
                    trackId={trackId}
                    moduleId={moduleId}
                    handleCheckboxChange={handleCheckboxChange} 
                    handleInputChange={handleInputChange} 
                    level={level + 1} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {item.subItems && node.options[item.id] && (
        <div className="space-y-3 mt-2">
          {item.subItems.map((sub) => (
            <CheckboxNode 
              key={sub.id} 
              item={sub} 
              node={node} 
              trackId={trackId}
              moduleId={moduleId}
              handleCheckboxChange={handleCheckboxChange} 
              handleInputChange={handleInputChange} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectCard = ({ project, onClick, isLoading }) => (
  <div 
    onClick={isLoading ? null : onClick}
    className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-primary-orange transition-all flex flex-col justify-center items-center h-40 p-6 relative group ${isLoading ? 'cursor-wait opacity-75' : 'cursor-pointer'}`}
  >
    {isLoading ? (
      <RefreshCw size={32} className="text-primary-orange animate-spin mb-3 flex-shrink-0" />
    ) : (
      <FolderOpen size={32} className="text-gray-400 group-hover:text-primary-orange mb-3 transition-colors flex-shrink-0" />
    )}
    <h3 className="text-lg font-bold text-gray-800 text-center">{project.name}</h3>
    <p className="text-xs text-gray-500 mt-2">{project.plan_count || 0} Plans</p>
  </div>
);

const AddProjectForm = ({ onCancel, onSave, onGeneratePlan, initialData, isEditMode, editTarget }) => {
  const { showToast } = useToast();
  const [projectName, setProjectName] = useState(initialData?.name || '');
  const [tracks, setTracks] = useState(initialData?.tracks || []);
  const [localEditTarget, setLocalEditTarget] = useState(editTarget || null);

  const handleAddTrack = () => {
    setLocalEditTarget(null);
    setTracks([...tracks, { 
      id: Date.now(), 
      name: `Track ${tracks.length + 1}`, 
      modules: [],
      options: { ka: true },
      inputs: {},
      showConfig: true
    }]);
  };

  const handleTrackNameChange = (trackId, val) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, name: val } : t));
  };

  const handleAddModule = (trackId) => {
    setLocalEditTarget(prev => prev ? { trackId: prev.trackId, moduleId: null } : null);
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return { 
          ...t, 
          modules: [...t.modules, { 
            id: Date.now(), 
            name: '', 
            options: { ka: true }, 
            inputs: {}, 
            showConfig: true 
          }] 
        };
      }
      return t;
    }));
  };

  const handleRemoveTrack = (trackId) => {
    setTracks(tracks.filter(t => t.id !== trackId));
  };

  const handleRemoveModule = (trackId, moduleId) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return { ...t, modules: t.modules.filter(m => m.id !== moduleId) };
      }
      return t;
    }));
  };

  const handleModuleChange = (trackId, moduleId, val) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return { ...t, modules: t.modules.map(m => m.id === moduleId ? { ...m, name: val } : m) };
      }
      return t;
    }));
  };

  const toggleConfig = (trackId, moduleId = null) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        if (moduleId) {
          return { ...t, modules: t.modules.map(m => m.id === moduleId ? { ...m, showConfig: !m.showConfig } : m) };
        }
        return { ...t, showConfig: !t.showConfig };
      }
      return t;
    }));
  };

  const handleCheckboxChange = (trackId, optionId, moduleId = null) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        if (moduleId) {
          return {
            ...t,
            modules: t.modules.map(m => {
              if (m.id === moduleId) {
                const newOptions = { ...m.options, [optionId]: !m.options[optionId] };
                if (optionId === 'upload_sud' && newOptions['upload_sud']) {
                  newOptions['sud_mandatory'] = true;
                }
                return { ...m, options: newOptions };
              }
              return m;
            })
          };
        }
        const newOptions = { ...t.options, [optionId]: !t.options[optionId] };
        if (optionId === 'upload_sud' && newOptions['upload_sud']) {
          newOptions['sud_mandatory'] = true;
        }
        return { ...t, options: newOptions };
      }
      return t;
    }));
  };

  const handleInputChange = (trackId, optionId, val, moduleId = null) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        if (moduleId) {
          return {
            ...t,
            modules: t.modules.map(m => {
              if (m.id === moduleId) {
                return { ...m, inputs: { ...m.inputs, [optionId]: val } };
              }
              return m;
            })
          };
        }
        return { ...t, inputs: { ...t.inputs, [optionId]: val } };
      }
      return t;
    }));
  };

  return (
    <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-light-border">
        <h3 className="text-xl font-bold text-primary-text">Add New Project</h3>
        <button type="button" onClick={onCancel} className="text-secondary-text hover:text-red-500">
          <X size={20} />
        </button>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-primary-text mb-1">Project Name</label>
          <div className="flex space-x-2">
            <input
              type="text"
              disabled={isEditMode}
              className={`w-full lg:w-1/2 px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-primary-orange focus:border-primary-orange text-sm ${isEditMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <button 
              type="button"
              onClick={handleAddTrack}
              className="px-3 py-2 bg-input-background border border-light-border text-primary-text text-sm rounded-md font-medium hover:bg-gray-100 whitespace-nowrap"
            >
              Track +
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {tracks.filter(t => localEditTarget?.trackId ? t.id === localEditTarget.trackId : true).map((track) => (
            <div key={track.id} className="p-4 border border-light-border rounded-lg shadow-sm space-y-4 relative">
              <button 
                type="button" 
                onClick={() => localEditTarget ? onCancel() : handleRemoveTrack(track.id)}
                className="absolute top-2 right-2 text-secondary-text hover:text-red-500 p-1"
                title={localEditTarget ? "Close Edit" : "Remove Track"}
              >
                <X size={16} />
              </button>
              <div className="flex flex-wrap items-center gap-2 pr-6">
                <input
                  type="text"
                  className="px-3 py-1.5 border border-light-border rounded-md text-sm font-medium w-full sm:w-auto min-w-[200px]"
                  value={track.name}
                  onChange={(e) => handleTrackNameChange(track.id, e.target.value)}
                  placeholder="Track Name"
                />
                <button 
                  type="button" 
                  onClick={() => handleAddModule(track.id)} 
                  className="px-3 py-1.5 text-xs border border-light-border bg-input-background rounded hover:bg-gray-100 font-medium"
                >
                  Module +
                </button>
                {track.modules.length === 0 && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => toggleConfig(track.id)} 
                      className={`px-3 py-1.5 text-xs border rounded font-medium transition-colors ${track.showConfig ? 'bg-primary-orange border-primary-orange text-white' : 'border-light-border bg-input-background hover:bg-gray-100 text-primary-text'}`}
                    >
                      Configuration {track.showConfig ? '-' : '+'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!projectName) { showToast("Please enter a Project Name first.", 'error'); return; }
                        onGeneratePlan({ projectData: { name: projectName, tracks }, projectName, track, module: null });
                      }}
                      className="px-2 py-1 bg-button-orange text-white text-xs font-semibold rounded hover:bg-hover-orange"
                    >
                      Add Plan +
                    </button>
                  </>
                )}
              </div>
              
              {track.modules.length > 0 && (
                <div className="pl-4 space-y-2 border-l-2 border-gray-200 ml-2 mt-3">
                  {track.modules.filter(m => localEditTarget?.moduleId ? m.id === localEditTarget.moduleId : true).map((mod) => (
                    <div key={mod.id} className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          className="px-3 py-1.5 border border-light-border rounded-md shadow-sm text-sm w-full max-w-[300px]"
                          value={mod.name}
                          onChange={(e) => handleModuleChange(track.id, mod.id, e.target.value)}
                          placeholder="Module Name"
                        />
                        <button 
                          type="button" 
                          onClick={() => toggleConfig(track.id, mod.id)} 
                          className={`px-3 py-1.5 text-xs border rounded font-medium transition-colors ${mod.showConfig ? 'bg-primary-orange border-primary-orange text-white' : 'border-light-border bg-input-background hover:bg-gray-100 text-primary-text'}`}
                        >
                          Configuration {mod.showConfig ? '-' : '+'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!projectName) { showToast("Please enter a Project Name first.", 'error'); return; }
                            onGeneratePlan({ projectData: { name: projectName, tracks }, projectName, track, module: mod });
                          }}
                          className="px-2 py-1 bg-button-orange text-white text-xs font-semibold rounded hover:bg-hover-orange ml-2"
                        >
                          Add Plan +
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleRemoveModule(track.id, mod.id)}
                          className="text-secondary-text hover:text-red-500 p-1 ml-auto"
                          title="Remove Module"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      
                      {mod.showConfig && (
                        <div className="mt-2 p-4 bg-gray-50 rounded-md border border-gray-200">
                          <h4 className="text-sm font-semibold mb-3 text-primary-text">Module Requirements</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                            {checkboxConfig.map((item) => (
                              <CheckboxNode 
                                key={item.id} 
                                item={item} 
                                node={mod} 
                                trackId={track.id}
                                moduleId={mod.id}
                                handleCheckboxChange={handleCheckboxChange} 
                                handleInputChange={handleInputChange} 
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {track.modules.length === 0 && track.showConfig && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="text-sm font-semibold mb-3 text-primary-text">Track Requirements</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    {checkboxConfig.map((item) => (
                      <CheckboxNode 
                        key={item.id} 
                        item={item} 
                        node={track}
                        trackId={track.id}
                        moduleId={null}
                        handleCheckboxChange={handleCheckboxChange} 
                        handleInputChange={handleInputChange} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end pt-4 border-t border-light-border">
        <button
          type="button"
          onClick={() => onSave({ name: projectName, tracks })}
          className="px-4 py-2 bg-button-orange text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-hover-orange"
        >
          {isEditMode ? 'Update Project' : 'Add'}
        </button>
      </div>
    </div>
  );
};
const PlanCard = ({ plan, canApprove, handleApproveClick, handleCloseClick, parseMarkdown, stakeholders, onAssignManager, onPlanUpdate, onViewProject, hideProjectDetailsBtn, projectNameFallback }) => {
  const { showToast } = useToast();
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedManager, setSelectedManager] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [fullPlanContent, setFullPlanContent] = useState(plan?.generated_content || '');
  const [loadingContent, setLoadingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(plan?.generated_content || '');
  const [saving, setSaving] = useState(false);

  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [showTopicsView, setShowTopicsView] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newDuration, setNewDuration] = useState('');

  useEffect(() => {
    if (plan?.generated_content) {
      setFullPlanContent(plan.generated_content);
      setEditedContent(plan.generated_content);
    }
  }, [plan?.generated_content]);

  useEffect(() => {
    if (expanded && !fullPlanContent && plan?.id) {
      const fetchFullPlan = async () => {
        setLoadingContent(true);
        try {
          const { getPlan } = await import('../api/api');
          const res = await getPlan(plan.id);
          if (res.data?.success && res.data?.data?.generated_content) {
            setFullPlanContent(res.data.data.generated_content);
            setEditedContent(res.data.data.generated_content);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingContent(false);
        }
      };
      fetchFullPlan();
    }
  }, [expanded, fullPlanContent, plan?.id]);

  const fetchTopics = async () => {
    setLoadingTopics(true);
    try {
      const res = await getPlanTopicOptions(plan.id);
      if (res.data && res.data.success) {
        setTopics(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (expanded && showTopicsView) {
      fetchTopics();
    }
  }, [expanded, showTopicsView]);

  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedContent(fullPlanContent || plan?.generated_content || '');
  };

  const handleCancelClick = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveClick = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await onPlanUpdate(plan.id, editedContent);
      setIsEditing(false);
      
      if (showTopicsView) {
         fetchTopics();
      }
      showToast('Plan updated successfully', 'success');
    } catch (err) {
      showToast('Error updating plan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    
    try {
      await addPlanTopic(plan.id, {
        day_label: newDayLabel.trim(),
        topic_name: newTopicName.trim(),
        estimated_duration_hours: newDuration.trim()
      });
      setNewDayLabel('');
      setNewTopicName('');
      setNewDuration('');
      await fetchTopics();
      showToast('Topic added successfully', 'success');
    } catch (err) {
      showToast('Error adding topic: ' + err.message, 'error');
    }
  };

  const handleDeleteTopic = (topicId) => {
    setTopicToDelete(topicId);
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    try {
      await deletePlanTopic(topicToDelete);
      await fetchTopics();
      showToast('Topic deleted successfully', 'success');
    } catch (err) {
      showToast('Error deleting topic: ' + err.message, 'error');
    } finally {
      setTopicToDelete(null);
    }
  };

  const handleResync = async () => {
    setLoadingTopics(true);
    try {
      await resyncPlanTopics(plan.id);
      await fetchTopics();
      showToast('Topics re-synced successfully', 'success');
    } catch (err) {
      showToast('Error resyncing topics: ' + err.message, 'error');
    } finally {
      setLoadingTopics(false);
    }
  };
  const handleExportExcel = () => {
    if (!topics || topics.length === 0) {
      showToast("No topics to export.", "error");
      return;
    }
    
    const wsData = [];
    const merges = [];
    
    // 1st Heading (Professional Office Format)
    const projectName = plan?.project_config?.name || projectNameFallback || 'N/A';
    let trackName = 'N/A';
    if (plan?.project_config?._meta?.trackId) {
      const trk = plan.project_config.tracks?.find(t => t.id === plan.project_config._meta.trackId);
      if (trk) trackName = trk.name;
    } else if (plan?.project_config?.tracks?.[0]) {
      trackName = plan.project_config.tracks[0].name;
    } else {
      trackName = plan?.application_name || 'N/A';
    }
    const planName = `${plan?.application_name || 'Generated Plan'} (${plan?.plan_type || 'KT'})`;

    wsData.push([`Project Name: ${projectName}`, "", "", "", "", "", "", "", ""]);
    wsData.push([`Track Name: ${trackName}`, "", "", "", "", "", "", "", ""]);
    wsData.push([`Plan Name: ${planName}`, "", "", "", "", "", "", "", ""]);
    wsData.push([`Export Date: ${new Date().toLocaleDateString()}`, "", "", "", "", "", "", "", ""]);
    wsData.push(["", "", "", "", "", "", "", "", ""]); 
    
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });
    merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 8 } });
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 8 } });
    merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 8 } });
    
    wsData.push(["Day / Section", "Topic / Sub-topic Name", "Duration (Hours)", "Knowledge Giver", "Knowledge Receiver", "Start Date", "Meeting Link", "SUD Document", "Final Assessment"]);
    
    const excludedKeywords = [
      'assessment evaluation window',
      'shadow experience',
      'shadow phase',
      'shadow resourcing',
      'lead the project independently',
      'lead phase',
      'lead resourcing'
    ];

    const cleanedTopics = topics
      .filter(t => {
        const text = ((t.topic_name || '') + ' ' + (t.day_label || '')).toLowerCase();
        return !excludedKeywords.some(kw => text.includes(kw));
      })
      .map(t => {
        let day = t.day_label || 'General';
        day = day.replace(/:\s*\[Time:.*?\]/gi, '').replace(/\[Time:.*?\]/gi, '').trim();
        return { ...t, clean_day: day };
      });

    let currentRowIndex = 6;
    let startDayRow = 6;
    let currentDay = cleanedTopics[0]?.clean_day;

    cleanedTopics.forEach((t, idx) => {
      wsData.push([
        t.clean_day,
        t.topic_name,
        t.estimated_duration_hours || 'N/A',
        "",
        "",
        "",
        "",
        "",
        ""
      ]);

      if (idx > 0) {
        if (t.clean_day !== currentDay) {
          if (currentRowIndex - 1 > startDayRow) {
            merges.push({ s: { r: startDayRow, c: 0 }, e: { r: currentRowIndex - 1, c: 0 } });
          }
          startDayRow = currentRowIndex;
          currentDay = t.clean_day;
        }
      }
      
      if (idx === cleanedTopics.length - 1) {
        if (currentRowIndex > startDayRow) {
          merges.push({ s: { r: startDayRow, c: 0 }, e: { r: currentRowIndex, c: 0 } });
        }
      }
      currentRowIndex++;
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 20 }, { wch: 70 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
    ws['!sheetViews'] = [{ showGridLines: false }];
    
    const thinBorder = { style: "thin", color: { rgb: "CCCCCC" } };

    for (let r = 0; r < wsData.length; r++) {
      for (let c = 0; c < 9; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        
        let cellStyle = {
          font: { name: "Calibri", sz: 11 },
          fill: { fgColor: { rgb: "FFFFFF" } },
          alignment: { vertical: "center", wrapText: true },
          border: {
            top: r >= 5 ? thinBorder : null,
            bottom: r >= 5 ? thinBorder : null,
            left: r >= 5 ? thinBorder : null,
            right: r >= 5 ? thinBorder : null
          }
        };

        if (r < 5) {
          cellStyle.alignment.horizontal = "center";
          cellStyle.font.bold = true;
          cellStyle.font.sz = 14;
        } else if (r === 5) {
          cellStyle.fill = { fgColor: { rgb: "D04A02" } }; // PwC orange
          cellStyle.font.color = { rgb: "FFFFFF" };
          cellStyle.font.bold = true;
          cellStyle.alignment.horizontal = "center";
        } else {
          cellStyle.alignment.horizontal = c === 1 ? "left" : "center";
        }

        ws[cellRef].s = cellStyle;
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plan Topics");
    
    const filename = `Plan_Topics_${planName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div 
        className="px-6 py-4 border-b border-light-border bg-light-background flex justify-between items-center cursor-pointer hover:bg-input-background transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          {expanded ? <ChevronUp className="mr-3 text-secondary-text" size={20} /> : <ChevronDown className="mr-3 text-secondary-text" size={20} />}
          <div>
            <h3 className="text-lg font-semibold text-primary-text flex items-center">
              <FileText className="mr-2 text-primary-orange" size={20} />
              {plan.application_name} ({plan.plan_type})
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
          {!hideProjectDetailsBtn && plan.project_config && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewProject && onViewProject(plan.project_config);
              }}
              className="inline-flex items-center px-3 py-1.5 border border-primary-orange text-xs font-medium rounded text-primary-orange bg-light-background hover:bg-orange-50"
            >
              <List size={16} className="mr-1" /> Project Details
            </button>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan?.status === 'closed' ? 'bg-red-100 text-red-800 border border-red-200' : plan?.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {(plan?.status || 'draft').toUpperCase()}
          </span>
          {(plan?.status === 'draft' || plan?.status === 'approved') && canApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseClick(plan);
              }}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-light-background hover:bg-red-50"
            >
              <X size={16} className="mr-1" /> Close Plan
            </button>
          )}
          {plan?.status === 'draft' && (
            <>
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-button-orange hover:bg-hover-orange disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-light-border text-xs font-medium rounded text-gray-700 bg-light-background hover:bg-light-background disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="inline-flex items-center px-3 py-1.5 border border-light-border text-xs font-medium rounded text-gray-700 bg-light-background hover:bg-light-background"
                >
                  Edit
                </button>
              )}
            </>
          )}
          {plan?.status === 'draft' && canApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApproveClick(plan);
              }}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={16} className="mr-1" /> Approve Plan
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
          {/* Sub-header view switcher */}
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowTopicsView(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!showTopicsView ? 'bg-input-background text-primary-orange font-semibold' : 'text-secondary-text hover:bg-input-background'}`}
              >
                Plan Document
              </button>
              <button
                type="button"
                onClick={() => setShowTopicsView(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center ${showTopicsView ? 'bg-input-background text-primary-orange font-semibold' : 'text-secondary-text hover:bg-input-background'}`}
              >
                <List size={14} className="mr-1" />
                Plan Topics ({topics.length})
              </button>
            </div>
            {showTopicsView && (
              <button
                type="button"
                onClick={handleResync}
                disabled={loadingTopics}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-input-background hover:bg-input-background rounded-md"
              >
                <RefreshCw size={12} className={`mr-1 ${loadingTopics ? 'animate-spin' : ''}`} />
                Re-sync from Plan
              </button>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-center space-x-2">
            <Clock size={16} className="text-blue-600 flex-shrink-0" />
            <span>
              <strong>Phase Timeline Rule:</strong> Knowledge Acquisition (KA) Phase ➔ <strong>Final Assessment Window</strong> (Manager configured days) ➔ <strong>Shadow Resourcing (SR) Phase</strong> (Starts after assessment window count completes).
            </span>
          </div>

          {!showTopicsView ? (
            <div>
              {loadingContent ? (
                <div className="flex justify-center items-center py-6 text-gray-500 text-sm">
                  <RefreshCw className="animate-spin mr-2" size={16} /> Loading plan content...
                </div>
              ) : isEditing ? (
                <div>
                  <p className="text-xs text-secondary-text mb-2">
                    💡 Tip: Editing and saving this plan document will automatically re-extract and update the topics in the database (<code className="bg-input-background px-1 rounded">plan_topics</code> table).
                  </p>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-96 p-4 border border-light-border rounded-lg text-sm font-mono text-primary-text focus:ring-orange-border focus:border-orange-border outline-none"
                    placeholder="Edit your markdown plan here..."
                  />
                </div>
              ) : (
                <div 
                  className="prose prose-sm max-w-none text-secondary-text whitespace-pre-wrap"
                  dangerouslySetInnerHTML={parseMarkdown(fullPlanContent || plan?.generated_content || '')}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-primary-text">Sessions / Topics Breakdown</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={handleExportExcel}
                    disabled={topics.length === 0}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-green-600 border border-green-600 rounded hover:bg-green-50 disabled:opacity-50"
                  >
                    <FileUp size={14} className="mr-1" />
                    Export Excel
                  </button>
                  {(plan.status === 'draft' || canApprove) && (
                    <button
                      onClick={handleResync}
                      disabled={loadingTopics}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-primary-orange border border-primary-orange rounded hover:bg-orange-50 disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={`mr-1 ${loadingTopics ? 'animate-spin' : ''}`} /> 
                      {loadingTopics ? 'Syncing...' : 'Resync Topics'}
                    </button>
                  )}
                </div>
              </div>
              {loadingTopics ? (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border border-gray-100 rounded-lg">
                  <RefreshCw className="animate-spin text-primary-orange mb-3" size={32} />
                  <p className="text-sm font-medium text-gray-600">Extracting and Syncing Topics...</p>
                  <p className="text-xs text-gray-400 mt-1">This may take a moment while the AI analyzes your plan.</p>
                </div>
              ) : topics.length === 0 ? (
                <p className="text-xs text-secondary-text italic">No topics stored yet. Click "Re-sync from Plan" or add a topic below.</p>
              ) : (
                <div className="overflow-x-auto border border-light-border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-light-background">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-secondary-text uppercase">Day / Section</th>
                        <th className="px-4 py-2 text-left font-medium text-secondary-text uppercase">Topic / Sub-topic Name</th>
                        <th className="px-4 py-2 text-left font-medium text-secondary-text uppercase">Duration</th>
                        <th className="px-4 py-2 text-right font-medium text-secondary-text uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-light-background">
                      {(() => {
                        const rowSpans = [];
                        for (let i = 0; i < topics.length; i++) {
                          if (i === 0 || topics[i].day_label !== topics[i-1].day_label) {
                            let span = 1;
                            for (let j = i + 1; j < topics.length; j++) {
                              if (topics[j].day_label === topics[i].day_label) {
                                span++;
                              } else {
                                break;
                              }
                            }
                            rowSpans[i] = span;
                          } else {
                            rowSpans[i] = 0;
                          }
                        }

                        return topics.map((t, index) => {
                          const rSpan = rowSpans[index];
                          return (
                            <tr key={t.id} className="hover:bg-light-background">
                              {rSpan > 0 && (
                                <td 
                                  rowSpan={rSpan} 
                                  className="px-4 py-2.5 text-gray-700 whitespace-nowrap font-semibold align-middle border-r border-gray-100"
                                >
                                  {t.day_label || 'General'}
                                </td>
                              )}
                              <td className="px-4 py-2.5 font-medium text-primary-text">{t.topic_name}</td>
                              <td className="px-4 py-2.5 text-secondary-text whitespace-nowrap">{t.estimated_duration_hours || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteTopic(t.id)}
                                  className="text-red-600 hover:text-red-800 inline-flex items-center p-1 rounded"
                                  title="Delete Topic"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add Topic Form */}
              <form onSubmit={handleAddTopic} className="bg-light-background p-3 rounded-lg border border-light-border flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Add Topic:</span>
                <input
                  type="text"
                  placeholder="Day (e.g. Day 1)"
                  value={newDayLabel}
                  onChange={(e) => setNewDayLabel(e.target.value)}
                  className="px-2 py-1 text-xs border border-light-border rounded shadow-sm w-28 focus:ring-orange-border"
                />
                <input
                  type="text"
                  required
                  placeholder="Main topic or sub-topic name"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="px-2 py-1 text-xs border border-light-border rounded shadow-sm flex-1 min-w-[200px] focus:ring-orange-border"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 1 hour)"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="px-2 py-1 text-xs border border-light-border rounded shadow-sm w-32 focus:ring-orange-border"
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-1 bg-primary-orange hover:bg-hover-orange text-white text-xs font-medium rounded shadow-sm"
                >
                  <Plus size={12} className="mr-1" /> Add
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Delete Topic Confirmation Modal */}
      {topicToDelete && (
        <div className="fixed inset-0 z-[200] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setTopicToDelete(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-light-background rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-primary-text">
                    Delete Topic
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-secondary-text">
                      Are you sure you want to delete this topic? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmDeleteTopic}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-light-border shadow-sm px-4 py-2 bg-light-background text-base font-medium text-gray-700 hover:bg-light-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setTopicToDelete(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectDetailsView = ({ projectData, onClose, onGeneratePlan, canGenerate, onViewPlan, stakeholders, canApprove, handleApproveClick, handleCloseClick, parseMarkdown, handleAssignManager, handlePlanUpdate, allPlans, onEditProject, onDeleteTrack, onDeleteModule }) => {
  if (!projectData) return null;

  const hasGeneratedPlan = (track, module) => {
    if (!projectData.plans || projectData.plans.length === 0) return false;
    return projectData.plans.some(p => {
       if (p.project_config && p.project_config._meta) {
          if (module) return p.project_config._meta.moduleId === module.id;
          return p.project_config._meta.trackId === track.id && !p.project_config._meta.moduleId;
       }
       if (module) return p.application_name.includes(module.name);
       return p.application_name.includes(track.name);
    });
  };

  const renderConfigOptions = (options, inputs) => {
    if (!options || Object.keys(options).length === 0) return null;
    
    const selectedRootItems = checkboxConfig.filter(root => {
      let isSelected = false;
      const search = (nodes) => {
        for (const n of nodes) {
          if (options[n.id]) isSelected = true;
          if (n.items) search(n.items);
          if (n.subItems) search(n.subItems);
        }
      };
      if (options[root.id]) isSelected = true;
      if (root.groups) root.groups.forEach(g => search(g.items));
      return isSelected;
    });

    if (selectedRootItems.length === 0) return null;

    return (
      <div className="space-y-3 mt-2">
        {selectedRootItems.map(root => {
          const activeGroups = (root.groups || []).map(group => {
            const activeItems = group.items.filter(item => {
              if (options[item.id]) return true;
              let subActive = false;
              if (item.subItems) {
                item.subItems.forEach(sub => { if (options[sub.id]) subActive = true; });
              }
              return subActive;
            });
            return { ...group, items: activeItems };
          }).filter(g => g.items.length > 0);

          if (!options[root.id] && activeGroups.length === 0) return null;

          return (
            <div key={root.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
              <h6 className="font-bold text-gray-800 text-sm mb-2">{root.label}</h6>
              
              {activeGroups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-3 border-l-2 border-primary-orange/30 ml-1">
                  {activeGroups.map((group, idx) => (
                    <div key={idx}>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">{group.title}</span>
                      <ul className="list-disc ml-4 text-xs space-y-1 text-secondary-text">
                        {group.items.map(item => {
                           return (
                             <React.Fragment key={item.id}>
                               {options[item.id] && (
                                 <li>
                                   <span className="font-medium text-gray-700">{item.label}</span>
                                   {item.hasInput && inputs && inputs[item.id] && (
                                     <span className="ml-1 text-primary-orange">({inputs[item.id]})</span>
                                   )}
                                 </li>
                               )}
                               {item.subItems && item.subItems.filter(sub => options[sub.id]).map(sub => (
                                 <li key={sub.id} className="text-gray-500 ml-4 list-circle">
                                   {sub.label}
                                 </li>
                               ))}
                             </React.Fragment>
                           );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic pl-2">Track selected without criteria.</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getContextName = (track, module) => {
    return module 
      ? `${projectData.name} - ${track.name} - ${module.name}`
      : `${projectData.name} - ${track.name}`;
  };

  const matchedPlanIds = new Set();
  projectData.config?.tracks?.forEach(track => {
    const trackPlans = (projectData.plans || []).filter(p => {
       if (p.project_config && p.project_config._meta) {
          return p.project_config._meta.trackId === track.id && !p.project_config._meta.moduleId;
       }
       return p.application_name.includes(track.name);
    });
    trackPlans.forEach(p => matchedPlanIds.add(p.id));

    track.modules?.forEach(mod => {
      const modulePlans = (projectData.plans || []).filter(p => {
         if (p.project_config && p.project_config._meta) {
            return p.project_config._meta.moduleId === mod.id;
         }
         return p.application_name.includes(mod.name);
      });
      modulePlans.forEach(p => matchedPlanIds.add(p.id));
    });
  });

  const unmatchedPlans = (projectData.plans || []).filter(p => !matchedPlanIds.has(p.id));

  return (
    <div className="space-y-6 mt-6">
      <button 
        onClick={onClose}
        className="flex items-center text-sm font-medium text-secondary-text hover:text-primary-orange transition-colors"
      >
        <ChevronLeft size={16} className="mr-1" /> Back to Projects
      </button>

      <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-light-border bg-gray-50 flex items-center justify-between">
          <div className="flex items-center">
            <List className="mr-3 text-primary-orange" size={24} />
            <h3 className="text-xl font-bold text-primary-text">
              Project Details: {projectData.name}
            </h3>
          </div>
          {canGenerate && (
            <button
              onClick={() => onEditProject(projectData)}
              className="flex items-center px-3 py-1.5 bg-button-orange text-white text-sm font-semibold rounded shadow-sm hover:bg-hover-orange"
            >
              <Plus size={16} className="mr-1" /> Add Track
            </button>
          )}
        </div>
        <div className="p-6">
          <div className="space-y-8">
            {projectData.config?.tracks?.map((track) => {
              const trackPlans = (projectData.plans || []).filter(p => {
                 if (p.project_config && p.project_config._meta) {
                    return p.project_config._meta.trackId === track.id && !p.project_config._meta.moduleId;
                 }
                 return p.application_name.includes(track.name);
              });
              return (
              <div key={track.id} className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-light-border">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                  <h4 className="text-lg font-bold text-gray-800 flex items-center">
                    <span className="bg-primary-orange/10 text-primary-orange px-2 py-0.5 rounded text-sm mr-2 border border-primary-orange/20">Track</span>
                    {track.name}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {canGenerate && (
                      <>
                        <button
                          onClick={() => onEditProject(track.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                          title="Edit Track"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteTrack && onDeleteTrack(track.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors mr-2"
                          title="Delete Track"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {canGenerate && (!track.modules || track.modules.length === 0) && !hasGeneratedPlan(track, null) && (
                      <button
                        onClick={() => {
                          onGeneratePlan({ projectData, projectName: projectData.name, track, module: null });
                        }}
                        className="px-2 py-1 bg-button-orange text-white text-xs font-semibold rounded hover:bg-hover-orange shadow-sm"
                      >
                        Add Plan +
                      </button>
                    )}
                  </div>
                </div>
                
                {track.options && Object.keys(track.options).length > 0 && (
                  <div className="mb-4 bg-gray-50 p-3 rounded border border-light-border">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Track Configuration:</h5>
                    {renderConfigOptions(track.options, track.inputs)}
                  </div>
                )}

                {trackPlans.length > 0 && (
                  <div className="mb-4 pt-4 border-t border-gray-100">
                    <h5 className="text-sm font-semibold text-primary-orange mb-3">Generated Plans for Track:</h5>
                    <div className="space-y-4">
                      {trackPlans.map(p => {
                         const fullPlan = allPlans ? allPlans.find(x => String(x.id) === String(p.id)) : null;
                         return (
                             <PlanCard 
                               key={p.id} plan={fullPlan || p} canApprove={canApprove} handleApproveClick={handleApproveClick} 
                               handleCloseClick={handleCloseClick} parseMarkdown={parseMarkdown} stakeholders={stakeholders} 
                               onAssignManager={handleAssignManager} onPlanUpdate={handlePlanUpdate} hideProjectDetailsBtn={true} 
                               projectNameFallback={projectData?.name}
                             />
                         );
                      })}
                    </div>
                  </div>
                )}
                
                {track.modules?.length > 0 && (
                  <div className="ml-4 space-y-4 border-l-2 border-orange-200 pl-4">
                    {track.modules.map(mod => {
                      const modulePlans = (projectData.plans || []).filter(p => {
                         if (p.project_config && p.project_config._meta) {
                            return p.project_config._meta.moduleId === mod.id;
                         }
                         return p.application_name.includes(mod.name);
                      });
                      return (
                      <div key={mod.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-semibold text-gray-800 flex items-center">
                            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs mr-2 border border-orange-200">Module</span>
                            {mod.name}
                          </h5>
                          <div className="flex items-center space-x-2">
                            {canGenerate && (
                              <>
                                <button
                                  onClick={() => onEditProject(track.id, mod.id)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                  title="Edit Module"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => onDeleteModule && onDeleteModule(track.id, mod.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors mr-2"
                                  title="Delete Module"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            {canGenerate && !hasGeneratedPlan(track, mod) && (
                              <button
                                onClick={() => {
                                  onGeneratePlan({ projectData, projectName: projectData.name, track, module: mod });
                                }}
                                className="px-2 py-1 bg-button-orange text-white text-xs font-semibold rounded hover:bg-hover-orange shadow-sm"
                              >
                                Add Plan +
                              </button>
                            )}
                          </div>
                        </div>
                        {mod.options && Object.keys(mod.options).length > 0 ? (
                          <div className="mt-2">
                             <h6 className="text-xs font-semibold text-gray-500 mb-1">Module Configuration:</h6>
                             {renderConfigOptions(mod.options, mod.inputs)}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No configuration selected.</p>
                        )}
                        
                        {modulePlans.length > 0 && (
                           <div className="mt-4 border-t border-gray-200 pt-3">
                             <h6 className="text-xs font-semibold text-gray-600 mb-2">Generated Plans for Module:</h6>
                             <div className="space-y-3">
                               {modulePlans.map(p => {
                                  const fullPlan = allPlans ? allPlans.find(x => String(x.id) === String(p.id)) : null;
                                  return (
                                    <PlanCard 
                                      key={p.id} plan={fullPlan || p} canApprove={canApprove} handleApproveClick={handleApproveClick} 
                                      handleCloseClick={handleCloseClick} parseMarkdown={parseMarkdown} stakeholders={stakeholders} 
                                      onAssignManager={handleAssignManager} onPlanUpdate={handlePlanUpdate} hideProjectDetailsBtn={true} 
                                    />
                                  );
                               })}
                             </div>
                           </div>
                        )}
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )})}
            
            {(projectData.plans || []).length === 0 ? (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-500 italic mb-2">No plans generated yet for this project.</p>
                  <p className="text-sm text-gray-400">Click 'Add Plan +' on any track or module to get started.</p>
                </div>
              </div>
            ) : unmatchedPlans.length > 0 ? (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h4 className="text-xl font-bold text-gray-800 mb-6">Other Generated Plans</h4>
                <div className="space-y-4">
                  {unmatchedPlans.map(p => {
                     const fullPlan = allPlans ? allPlans.find(x => String(x.id) === String(p.id)) : null;
                     return (
                       <PlanCard 
                         key={p.id} plan={fullPlan || p} canApprove={canApprove} handleApproveClick={handleApproveClick} 
                         handleCloseClick={handleCloseClick} parseMarkdown={parseMarkdown} stakeholders={stakeholders} 
                         onAssignManager={handleAssignManager} onPlanUpdate={handlePlanUpdate} hideProjectDetailsBtn={true} 
                       />
                     );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};


const PlanPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [uploadModalConfig, setUploadModalConfig] = useState(null);
  const [plans, setPlans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [planToApprove, setPlanToApprove] = useState(null);
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [planToClose, setPlanToClose] = useState(null);

  const [deleteModalConfig, setDeleteModalConfig] = useState(null);

  const handleDownloadProjectTemplate = () => {
    const wsData = [
      [
        "Project Name", "Track Name", "Module Name", 
        "Knowledge Acquisition", "", "", "", "", "", 
        "Shadow Resourcing", "", "", "", "", "",
        "Lead Resourcing", "", "", ""
      ],
      [
        "", "", "", 
        "Entry Criteria", "", "Exit Criteria", "", "", "", 
        "Entry Criteria", "", "Exit Criteria", "", "", "",
        "Entry Criteria", "", "", ""
      ],
      [
        "", "", "", 
        "Project KT Document Ready (Y/N)", "Stakeholder Mapping Ready (Y/N)", "Reverse KT (Y/N)", "By uploading SUD (Y/N)", "SUD Mandatory (Y/N)", "Assessment (Y/N)", 
        "Assessment (80% Above) (Y/N)", "SUD Document Uploaded (Y/N)", "Need to be involved in ticket resolving (Y/N)", "Tickets (e.g. 5 tickets)", "Required weeks for shadow resourcing (Y/N)", "Weeks (e.g. 2 weeks)",
        "Need to be involved in ticket resolving (Y/N)", "Tickets (e.g. 5 tickets)", "Required weeks for lead resourcing (Y/N)", "Weeks (e.g. 2 weeks)"
      ],
      [
        "Demo Project", "Track 1 - Frontend", "Module 1 - React",
        "Y", "Y", "Y", "Y", "Y", "Y",
        "Y", "Y", "Y", "5 tickets", "Y", "2 weeks",
        "Y", "5 tickets", "Y", "2 weeks"
      ],
      [
        "Demo Project", "Track 1 - Frontend", "Module 2 - Angular",
        "Y", "Y", "Y", "", "Y", "Y",
        "Y", "Y", "Y", "3 tickets", "Y", "1 weeks",
        "Y", "3 tickets", "Y", "1 weeks"
      ],
      [
        "Demo Project", "Track 2 - Backend", "",
        "Y", "Y", "", "", "", "Y",
        "Y", "Y", "Y", "10 tickets", "Y", "3 weeks",
        "Y", "10 tickets", "Y", "3 weeks"
      ]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    ws['!merges'] = [
      // General Info
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 2, c: 2 } },
      
      // KA
      { s: { r: 0, c: 3 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
      { s: { r: 1, c: 5 }, e: { r: 1, c: 8 } },
      
      // SR
      { s: { r: 0, c: 9 }, e: { r: 0, c: 14 } },
      { s: { r: 1, c: 9 }, e: { r: 1, c: 10 } },
      { s: { r: 1, c: 11 }, e: { r: 1, c: 14 } },
      
      // LR
      { s: { r: 0, c: 15 }, e: { r: 0, c: 18 } },
      { s: { r: 1, c: 15 }, e: { r: 1, c: 18 } }
    ];
    
    const getStyle = (r, c) => {
      const isMainHeader = r === 0;
      const isGroupHeader = r === 1;
      
      let bg = "FFFFFF";
      let fontColor = "000000";
      let bold = true;

      if (c <= 2) { 
        bg = "607D8B"; 
        fontColor = "FFFFFF";
      } else if (c <= 8) { 
        if (isMainHeader) { bg = "1976D2"; fontColor = "FFFFFF"; }
        else if (isGroupHeader) { bg = "64B5F6"; fontColor = "FFFFFF"; }
        else { bg = "BBDEFB"; fontColor = "000000"; }
      } else if (c <= 14) { 
        if (isMainHeader) { bg = "F57C00"; fontColor = "FFFFFF"; }
        else if (isGroupHeader) { bg = "FFB74D"; fontColor = "FFFFFF"; }
        else { bg = "FFE0B2"; fontColor = "000000"; }
      } else { 
        if (isMainHeader) { bg = "388E3C"; fontColor = "FFFFFF"; }
        else if (isGroupHeader) { bg = "81C784"; fontColor = "FFFFFF"; }
        else { bg = "C8E6C9"; fontColor = "000000"; }
      }

      return {
        font: { bold, color: { rgb: fontColor }, sz: isMainHeader ? 12 : 11 },
        fill: { fgColor: { rgb: bg } },
        alignment: { vertical: "center", horizontal: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { auto: 1 } },
          bottom: { style: "thin", color: { auto: 1 } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        }
      };
    };
    
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c < wsData[0].length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: "" }; 
        ws[cellRef].s = getStyle(r, c);
      }
    }
    
    ws['!cols'] = Array(wsData[0].length).fill({ wch: 18 });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Project_Template.xlsx");
  };

  const handleUploadProjectTemplate = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadModalConfig({ file });
    e.target.value = null;
  };

  const confirmUploadTemplate = async () => {
    if (!uploadModalConfig || !uploadModalConfig.file) return;
    const file = uploadModalConfig.file;
    setUploadModalConfig(null);
    setIsUploadingTemplate(true);
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const aoaData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (aoaData.length <= 1) {
          showToast("Template is empty", "error");
          setIsUploadingTemplate(false);
          return;
        }

        const projectsMap = {};
        for (let i = 1; i < aoaData.length; i++) {
          const row = aoaData[i];
          if (!row || row.length === 0) continue;
          
          const pName = row[0];
          if (!pName || pName === "Demo Project" || pName === "Project Name") continue;
          if (!projectsMap[pName]) projectsMap[pName] = { name: pName, tracks: [] };
          
          const tName = row[1];
          if (!tName) continue;
          
          let track = projectsMap[pName].tracks.find(t => t.name === tName);
          if (!track) {
            track = {
              id: Date.now() + Math.random(),
              name: tName,
              modules: [],
              options: {},
              inputs: {},
              showConfig: true
            };
            projectsMap[pName].tracks.push(track);
          }
          
          const mName = row[2];
          const parseBool = (val) => val && val.toString().trim().toUpperCase() === 'Y';
          
          const options = {
            ka: parseBool(row[3]) || parseBool(row[4]) || parseBool(row[5]) || parseBool(row[6]) || parseBool(row[7]) || parseBool(row[8]),
            kt_doc: parseBool(row[3]),
            stakeholder_map: parseBool(row[4]),
            rkt: parseBool(row[5]),
            upload_sud: parseBool(row[6]),
            sud_mandatory: parseBool(row[7]),
            assessment: parseBool(row[8]),
            shadow_resourcing: parseBool(row[9]) || parseBool(row[10]) || parseBool(row[11]) || parseBool(row[13]),
            assessment_80: parseBool(row[9]),
            sud_doc_upload: parseBool(row[10]),
            ticket_resolving: parseBool(row[11]),
            weeks_shadow: parseBool(row[13]),
            lead_resourcing: parseBool(row[15]) || parseBool(row[17]),
            lr_ticket_resolving: parseBool(row[15]),
            lr_weeks_shadow: parseBool(row[17])
          };
          
          const inputs = {};
          if (row[12]) inputs.ticket_resolving = row[12].toString();
          if (row[14]) inputs.weeks_shadow = row[14].toString();
          if (row[16]) inputs.lr_ticket_resolving = row[16].toString();
          if (row[18]) inputs.lr_weeks_shadow = row[18].toString();
          
          if (mName && mName.toString().trim() !== "" && mName !== "Module 1 (Optional)") {
            track.modules.push({
              id: Date.now() + Math.random(),
              name: mName.toString(),
              options,
              inputs,
              showConfig: true
            });
          } else {
            track.options = options;
            track.inputs = inputs;
          }
        }
        
        const projectNames = Object.keys(projectsMap);
        const chunkSize = 3;
        for (let i = 0; i < projectNames.length; i += chunkSize) {
          const chunk = projectNames.slice(i, i + chunkSize);
          await Promise.all(chunk.map(async (pName) => {
            const pData = projectsMap[pName];
            try {
              const res = await createProject(pData);
              if (res.data && res.data.success) {
                showToast(`Project ${pName} created successfully`, "success");
              }
            } catch (err) {
              showToast(`Error creating project ${pName}: ` + err.message, "error");
            }
          }));
        }
        
        fetchProjects();
        setIsUploadingTemplate(false);
      } catch (err) {
        showToast("Error processing template: " + err.message, "error");
        setIsUploadingTemplate(false);
      }
    };
    reader.onerror = () => {
      showToast("Error reading file", "error");
      setIsUploadingTemplate(false);
    };
    reader.readAsBinaryString(file);
  };

  const executeDelete = async () => {
    if (!deleteModalConfig || !projectToView) return;
    const { type, trackId, moduleId } = deleteModalConfig;
    
    if (type === 'track') {
      const updatedConfig = { ...projectToView.config };
      updatedConfig.tracks = updatedConfig.tracks.filter(t => t.id !== trackId);
      const updatedProject = { ...projectToView, config: updatedConfig };
      try {
        await updateProject(projectToView.id, updatedConfig);
        setProjectToView(updatedProject);
        fetchProjects();
        if(typeof showToast === 'function') showToast('Track deleted successfully', 'success');
      } catch (err) {
        if(typeof showToast === 'function') showToast("Error deleting track: " + err.message, 'error');
        else showToast("Error deleting track: " + err.message, 'error');
      }
    } else if (type === 'module') {
      const updatedConfig = { ...projectToView.config };
      const track = updatedConfig.tracks.find(t => t.id === trackId);
      if (track) {
        track.modules = track.modules.filter(m => m.id !== moduleId);
        const updatedProject = { ...projectToView, config: updatedConfig };
        try {
          await updateProject(projectToView.id, updatedConfig);
          setProjectToView(updatedProject);
          fetchProjects();
          if(typeof showToast === 'function') showToast('Module deleted successfully', 'success');
        } catch (err) {
          if(typeof showToast === 'function') showToast("Error deleting module: " + err.message, 'error');
          else showToast("Error deleting module: " + err.message, 'error');
        }
      }
    }
    setDeleteModalConfig(null);
  };

  const handleDeleteTrack = (trackId) => {
    setDeleteModalConfig({ type: 'track', trackId, moduleId: null, message: 'Are you sure you want to delete this track and all its modules?' });
  };

  const handleDeleteModule = (trackId, moduleId) => {
    setDeleteModalConfig({ type: 'module', trackId, moduleId, message: 'Are you sure you want to delete this module?' });
  };
  const [loading, setLoading] = useState(true);
  const [loadingProjectId, setLoadingProjectId] = useState(null);
  const { activeOperations, startOperation, endOperation, docExtractionState, setDocExtractionState } = useOperations();
  const generating = activeOperations['create-plan'];
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [workflowResult, setWorkflowResult] = useState(null);
  const [formData, setFormData] = useState({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
  const [isAddingProject, setIsAddingProject] = useState(() => sessionStorage.getItem('isAddingProject') === 'true');
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showGenerateForms, setShowGenerateForms] = useState(false);
  
  const [projectToView, setProjectToView] = useState(null);
  const [planToView, setPlanToView] = useState(null);

  const [projectConfig, setProjectConfig] = useState(null);
  const [showSaveProjectModal, setShowSaveProjectModal] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState(null);
  const viewLevel = (projectToView ? 1 : 0) + (isAddingProject ? 1 : 0) + (isEditingProject ? 1 : 0) + (showGenerateForms ? 1 : 0) + (planToView ? 1 : 0);
  const [historyLevel, setHistoryLevel] = useState(0);

  useEffect(() => {
    if (viewLevel > historyLevel) {
      window.history.pushState({ level: viewLevel }, '', '');
      setHistoryLevel(viewLevel);
    } else if (viewLevel < historyLevel) {
      const delta = historyLevel - viewLevel;
      window.history.go(-delta);
      setHistoryLevel(viewLevel);
    }
  }, [viewLevel, historyLevel]);

  useEffect(() => {
    if (projectToView) {
      sessionStorage.setItem('savedProjectToViewId', projectToView.id);
    }
  }, [projectToView]);

  useEffect(() => {
    if (isAddingProject) {
      sessionStorage.setItem('isAddingProject', 'true');
    } else {
      sessionStorage.removeItem('isAddingProject');
    }
  }, [isAddingProject]);

  useEffect(() => {
    const handlePop = (e) => {
      const targetLevel = e.state?.level || 0;
      if (targetLevel < historyLevel) {
        if (showGenerateForms) setShowGenerateForms(false);
        else if (planToView) setPlanToView(null);
        else if (isEditingProject) setIsEditingProject(false);
        else if (isAddingProject) { setIsAddingProject(false); sessionStorage.removeItem('isAddingProject'); }
        else if (projectToView) { setProjectToView(null); sessionStorage.removeItem('savedProjectToViewId'); }
        
        setHistoryLevel(targetLevel);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [historyLevel, showGenerateForms, planToView, isEditingProject, isAddingProject, projectToView]);

  const handleSaveNewProject = async (projectData) => {
    try {
      const res = await createProject(projectData);
      if (res.data && res.data.success) {
        showToast("Project Configuration Saved Successfully!", "success");
        setIsAddingProject(false);
        fetchProjects();
      }
    } catch (err) {
      showToast("Error saving project configuration", 'error');
    }
  };

  const handleUpdateProject = async (projectData) => {
    try {
      const res = await updateProject(projectToView.id, projectData);
      if (res.data && res.data.success) {
        showToast("Project Configuration Updated Successfully!", "success");
        setIsEditingProject(false);
        fetchProjects();
        const updatedProject = await getProjectById(projectToView.id);
        setProjectToView(updatedProject.data.data);
      }
    } catch (err) {
      showToast("Error updating project configuration", 'error');
    }
  };

  const handleSaveProjectAfterPlan = async () => {
    try {
      const res = await createProject(projectConfig);
      if (res.data && res.data.success) {
        const newProjectId = res.data.data.id;
        if (pendingPlanId) {
          await linkPlanToProject(pendingPlanId, newProjectId);
        }
        showToast("Project and Plan Linked Successfully!", "success");
        setShowSaveProjectModal(false);
        setProjectConfig(null);
        setPendingPlanId(null);
        fetchProjects();
        fetchPlans();
      }
    } catch (err) {
      showToast("Error saving project: " + err.message, 'error');
    }
  };

  const filterCheckedOptions = (data) => {
    if (!data) return data;
    const newData = JSON.parse(JSON.stringify(data));
    newData.tracks = newData.tracks.map(t => {
      const filteredOptions = {};
      const filteredInputs = {};
      Object.keys(t.options || {}).forEach(k => {
        if (t.options[k]) {
          filteredOptions[k] = true;
          if (t.inputs && t.inputs[k]) filteredInputs[k] = t.inputs[k];
        }
      });
      
      const newModules = t.modules.map(m => {
        const mOpts = {};
        const mInps = {};
        Object.keys(m.options || {}).forEach(k => {
          if (m.options[k]) {
            mOpts[k] = true;
            if (m.inputs && m.inputs[k]) mInps[k] = m.inputs[k];
          }
        });
        return { ...m, options: mOpts, inputs: mInps };
      });
      return { ...t, options: filteredOptions, inputs: filteredInputs, modules: newModules };
    });
    return newData;
  };

  const handleGeneratePlan = async ({ projectData, projectName, track, module }) => {
    let finalProjectData = projectData;
    let finalProjectId = projectData.id;

    if (isEditingProject && projectToView) {
      try {
        await updateProject(projectToView.id, projectData);
        finalProjectData = { ...projectData, id: projectToView.id };
        finalProjectId = projectToView.id;
        getProjectById(projectToView.id).then(r => setProjectToView(r.data.data));
      } catch (err) {
        showToast("Failed to save project updates before generating plan.", 'error');
        return;
      }
    }

    const configToFilter = finalProjectData.config || finalProjectData;
    setProjectConfig(configToFilter);
    
    const contextName = module 
      ? `${projectName} - ${track.name} - ${module.name}`
      : `${projectName} - ${track.name}`;

    const filteredProjectData = filterCheckedOptions(configToFilter);
    filteredProjectData._meta = {
      trackId: track.id,
      moduleId: module ? module.id : null
    };

    setDocFormData(prev => ({ 
      ...prev, 
      application_name: contextName,
      project_config: filteredProjectData,
      project_id: finalProjectId || (projectToView ? projectToView.id : null)
    }));
    
    setFormData(prev => ({ 
      ...prev, 
      application_name: contextName,
      project_config: filteredProjectData,
      project_id: finalProjectId || (projectToView ? projectToView.id : null)
    }));

    setIsAddingProject(false);
    setIsEditingProject(false);
    setShowGenerateForms(true);
  };
  
  const handleViewPlan = async (partialPlan) => {
    let fullPlan = plans.find(p => p.id === partialPlan.id);
    if (!fullPlan) {
      try {
        const { getPlan } = await import('../api/api');
        const res = await getPlan(partialPlan.id);
        if (res.data?.success) {
           fullPlan = res.data.data;
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (fullPlan) {
      setPlanToView(fullPlan);
    }
  };

  const { docFormData, selectedFiles, analyzingDoc, isDocExtracted } = docExtractionState || {
    docFormData: { application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' },
    selectedFiles: [], analyzingDoc: false, isDocExtracted: false
  };

  const setDocFormData = (updater) => setDocExtractionState(prev => ({ ...prev, docFormData: typeof updater === 'function' ? updater(prev.docFormData) : updater }));
  const setSelectedFiles = (files) => setDocExtractionState(prev => ({ ...prev, selectedFiles: files }));
  const setAnalyzingDoc = (val) => setDocExtractionState(prev => ({ ...prev, analyzingDoc: val }));
  const setIsDocExtracted = (val) => setDocExtractionState(prev => ({ ...prev, isDocExtracted: val }));

  const generatingDocPlan = activeOperations['create-plan-doc'];

  const [stakeholders, setStakeholders] = useState([]);

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      const loadedProjects = Array.isArray(res.data?.data) ? res.data.data : [];
      setProjects(loadedProjects);
      
      const savedId = sessionStorage.getItem('savedProjectToViewId');
      if (savedId) {
        try {
          const fullProject = await getProjectById(savedId);
          if (fullProject.data && fullProject.data.success) {
            setProjectToView(fullProject.data.data);
          } else {
            const found = loadedProjects.find(p => String(p.id) === savedId);
            if (found) setProjectToView(found);
          }
        } catch (e) {
          const found = loadedProjects.find(p => String(p.id) === savedId);
          if (found) setProjectToView(found);
        }
      }
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await getPlans();
      const fetchedPlans = Array.isArray(res.data?.data) ? res.data.data : [];
      const statusOrder = { 'draft': 1, 'approved': 2, 'closed': 3 };
      const sortedPlans = [...fetchedPlans].sort((a, b) => 
        (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
      );
      setPlans(sortedPlans);
    } catch (err) {
      console.error(err);
      setPlans([]);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const res = await getStakeholders();
      const filtered = res.data.data.filter(s => s.role === 'engagement_manager' || s.role === 'leadership');
      setStakeholders(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchPlans();
    fetchStakeholders();
  }, []);



  const handleAssignManager = async (planId, managerId) => {
    try {
      const { updatePlanManager } = await import('../api/api');
      await updatePlanManager(planId, managerId);
      showToast('Manager assigned successfully', 'success');
      fetchPlans();
      if (projectToView) {
        const res = await getProjectById(projectToView.id);
        setProjectToView(res.data.data);
      }
    } catch (err) {
      showToast('Error assigning manager', 'error');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    startOperation('create-plan');
    try {
      const targetProjId = formData.project_id || (projectToView ? projectToView.id : null);
      const res = await generatePlan(formData);
      setFormData({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
      fetchPlans();
      if (!targetProjId && projectConfig && res.data?.data?.id) {
        setPendingPlanId(res.data.data.id);
        setShowSaveProjectModal(true);
      } else if (targetProjId) {
        refreshProjectToView();
      }
      setShowGenerateForms(false);
    } catch (err) {
      showToast('Error generating plan', 'error');
    } finally {
      endOperation('create-plan');
    }
  };

  const analyzeFiles = async (filesToAnalyze) => {
    if (!filesToAnalyze || filesToAnalyze.length === 0) {
      showToast('Please select at least one document file to extract info.', 'error');
      return;
    }
    setAnalyzingDoc(true);
    try {
      const uploadData = new FormData();
      filesToAnalyze.forEach(file => {
        uploadData.append('files', file);
      });
      const res = await extractPlanInfoFromDoc(uploadData);
      if (res.data?.success && res.data?.data) {
        setDocFormData(prev => ({
          ...prev,
          application_name: prev.application_name ? prev.application_name : (res.data.data.application_name || ''),
          scope_description: res.data.data.scope_description || ''
        }));
        setIsDocExtracted(true);
      }
    } catch (err) {
      showToast('Error analyzing document(s): ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setAnalyzingDoc(false);
    }
  };

  const handleDocFileChange = (e) => {
    const newlySelected = Array.from(e.target.files || []);
    if (newlySelected.length === 0) return;

    const updatedList = [...selectedFiles];
    newlySelected.forEach(file => {
      if (!updatedList.some(f => f.name === file.name && f.size === file.size)) {
        updatedList.push(file);
      }
    });

    setSelectedFiles(updatedList);
    e.target.value = null;
  };

  const handleRemoveFile = (indexToRemove) => {
    const updatedList = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    setSelectedFiles(updatedList);
    if (updatedList.length === 0) {
      setIsDocExtracted(false);
      setDocFormData(prev => ({ ...prev, application_name: '', scope_description: '' }));
    }
  };

  const handleExtractFromDocs = () => {
    analyzeFiles(selectedFiles);
  };

  const handleGenerateWithDoc = async (e) => {
    e.preventDefault();
    if (!docFormData.application_name || !docFormData.scope_description) {
      showToast('Please fill out Plan Name and Scope Description or upload document(s) to auto-extract them.', 'error');
      return;
    }
    startOperation('create-plan-doc');
    try {
      const targetProjId = docFormData.project_id || (projectToView ? projectToView.id : null);
      const res = await generatePlan(docFormData);
      setDocFormData({ application_name: '', scope_description: '', plan_type: 'KT', reverse_kt_focus: '' });
      setSelectedFiles([]);
      setIsDocExtracted(false);
      setShowGenerateForms(false);
      fetchPlans();
      if (targetProjId) {
        const pRes = await getProjectById(targetProjId);
        if (pRes.data?.data) {
          setProjectToView(pRes.data.data);
        }
      }
      fetchProjects();
      if (!targetProjId && projectConfig && res.data?.data?.id) {
        setPendingPlanId(res.data.data.id);
        setShowSaveProjectModal(true);
      }
    } catch (err) {
      showToast('Error generating plan from document: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      endOperation('create-plan-doc');
    }
  };

  const handleRunWorkflow = async () => {
    if (!formData.application_name || !formData.scope_description) {
      showToast('Please fill out App Name and Scope Description first', 'error');
      return;
    }
    setRunningWorkflow(true);
    try {
      const res = await runFullWorkflow(formData);
      setWorkflowResult(res.data);
      fetchPlans();
    } catch (err) {
      showToast('Error running workflow: ' + err.message, 'error');
    } finally {
      setRunningWorkflow(false);
    }
  };

  const refreshProjectToView = async () => {
    if (projectToView) {
      try {
        const res = await getProjectById(projectToView.id);
        setProjectToView(res.data.data);
      } catch(err) { console.error(err); }
    }
  };

  const confirmApprove = async () => {
    if (!planToApprove) return;
    setApprovingPlan(true);
    try {
      await approvePlan(planToApprove.id);
      setPlanToApprove(null);
      await fetchPlans();
      await refreshProjectToView();
    } catch (err) {
      showToast('Error approving plan', 'error');
    } finally {
      setApprovingPlan(false);
    }
  };

  const confirmClose = async () => {
    if (!planToClose) return;
    try {
      await closePlan(planToClose.id);
      setPlanToClose(null);
      await fetchPlans();
      await refreshProjectToView();
    } catch (err) {
      showToast('Error closing plan', 'error');
    }
  };

  const handlePlanUpdate = async (planId, content) => {
    await editPlan(planId, { generated_content: content });
    setPlans(prevPlans => prevPlans.map(p => p.id === planId ? { ...p, generated_content: content } : p));
    await fetchPlans();
    await refreshProjectToView();
  };

  if (loading) return <Loader />;

  const canGenerate = user?.role === 'Outgoing SME (Knowledge Giver)' || user?.role === 'Delivery / Engagement Manager';
  const canApprove = user?.role === 'Delivery / Engagement Manager';

  const parseMarkdown = (text) => {
    if (!text) return { __html: '' };
    let html = text.replace(/```markdown\n?/g, '').replace(/```\n?/g, '');

    // Format Phase headings as chip cards
    const phaseRegex = /^[ \t]*(?:#{1,6}[ \t]+|\*\*)?(Knowledge Acquisition \(KA\) Phase|Final Assessment Evaluation Window|Shadow Resourcing \(SR\) Phase|Lead Resourcing \(LR\) Phase)(?:\*\*)?[ \t:]*/gim;
    html = html.replace(phaseRegex, (match, title) => {
      return `<div class="mt-8 mb-4"><span class="inline-block px-4 py-1.5 bg-orange-100 text-orange-800 border border-orange-200 rounded-full text-sm font-bold shadow-sm">${title}</span></div>`;
    });

    // Format regular main section headers
    const regularSectionRegex = /^[ \t]*(?:#{1,6}[ \t]+|\*\*)?(Objectives|Target Audience|Sessions \/ Topics Breakdown|Expected Outcomes)(?:\*\*)?[ \t:]*/gim;
    html = html.replace(regularSectionRegex, (match, title) => {
      return `<h3 class="text-base font-bold text-gray-900 mt-6 mb-2 border-b border-gray-200 pb-1">${title}</h3>`;
    });

    // Enforce bold headings for all Day/Week lines, stripping out markdown characters
    html = html.replace(/^[ \t]*(?:#{1,6}[ \t]+|\*\*)?(Day\s+\d+[^\n]*|Week\s+\d+[^\n]*)/gim, (match, content) => {
      let clean = content.replace(/\*\*/g, '').trim();
      return `<h4 class="text-sm font-bold text-gray-900 mt-5 mb-2">${clean}</h4>`;
    });

    // Format remaining generic headers
    html = html.replace(/^[ \t]*(#{1,6})[ \t]+(.*$)/gim, (match, hashes, text) => {
      const level = hashes.length;
      if (level >= 4) return `<h4 class="text-sm font-bold text-gray-800 mt-3 mb-1">${text}</h4>`;
      if (level === 3) return `<h3 class="text-base font-bold text-gray-900 mt-4 mb-2">${text}</h3>`;
      if (level === 2) return `<h2 class="text-lg font-bold text-gray-900 mt-5 mb-2">${text}</h2>`;
      if (level === 1) return `<h1 class="text-xl font-bold text-gray-900 mt-2 mb-3 border-b pb-1">${text}</h1>`;
    });

    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-gray-900 font-semibold">$1</strong>');
    html = html.replace(/^\s*[\-\*•]\s+(.*$)/gim, '<div class="ml-4 flex items-start my-1"><span class="mr-2 text-gray-500">•</span><span>$1</span></div>');
    return { __html: html };
  };

  const safeProjects = Array.isArray(projects) ? projects : [];
  const itemsPerPage = 9;
  const indexOfLastProject = currentPage * itemsPerPage;
  const indexOfFirstProject = indexOfLastProject - itemsPerPage;
  const currentProjects = safeProjects.slice(indexOfFirstProject, indexOfLastProject);
  const totalPages = Math.ceil(safeProjects.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary-text">Projects {/* Force reload */}</h2>
        {!isAddingProject && canGenerate && !showGenerateForms && !projectToView && !planToView && (
          <div className="flex space-x-3 items-center">
            <button 
              onClick={() => { setIsAddingProject(true); setProjectConfig(null); }}
              className="flex items-center px-4 py-2 bg-button-orange text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-hover-orange"
            >
              <Plus size={16} className="mr-2" /> Add Project
            </button>
            <button 
              onClick={handleDownloadProjectTemplate}
              className="flex items-center px-4 py-2 bg-white border border-light-border text-primary-text text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-50"
            >
              <Download size={16} className="mr-2" /> Download Template
            </button>
            <label className={`flex items-center px-4 py-2 bg-white border border-light-border text-primary-text text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-50 mb-0 ${isUploadingTemplate ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
              {isUploadingTemplate ? <Loader className="w-4 h-4 mr-2" /> : <Upload size={16} className="mr-2" />}
              {isUploadingTemplate ? 'Uploading...' : 'Upload Template'}
              <input type="file" accept=".xlsx, .xls" className="hidden" disabled={isUploadingTemplate} onChange={handleUploadProjectTemplate} />
            </label>
          </div>
        )}
      </div>

      {planToView ? (
        <div className="space-y-4 mt-6">
          <button 
            onClick={() => setPlanToView(null)}
            className="flex items-center text-sm font-medium text-secondary-text hover:text-primary-orange transition-colors"
          >
            <ChevronLeft size={16} className="mr-1" /> Back to Projects
          </button>
          <PlanCard 
            plan={planToView} 
            canApprove={canApprove} 
            handleApproveClick={() => setPlanToApprove(planToView)} 
            handleCloseClick={() => setPlanToClose(planToView)} 
            parseMarkdown={parseMarkdown} 
            stakeholders={stakeholders} 
            onAssignManager={handleAssignManager} 
            onPlanUpdate={handlePlanUpdate} 
          />
        </div>
      ) : canGenerate && showGenerateForms ? (
        <div className="space-y-4">
          <button
            onClick={() => setShowGenerateForms(false)}
            className="flex items-center text-sm font-medium text-secondary-text hover:text-primary-orange transition-colors mb-2"
          >
            <ChevronLeft size={16} className="mr-1" /> Back to {projectToView ? 'Project Details' : isAddingProject ? 'Add Project' : 'Projects'}
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Card 1: Generate Plan with AI */}
            <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between border-l-4 border-l-primary-orange h-full w-full max-w-4xl mx-auto">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-primary-text flex items-center">
                      <Play className="mr-2 text-primary-orange" size={20} />
                      Generate Plan with AI
                    </h3>
                  </div>
                  <form onSubmit={handleGenerate} className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                          <input
                            type="text" required
                            placeholder="e.g. Payment Gateway Service"
                            className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm"
                            value={formData.application_name}
                            onChange={(e) => setFormData({...formData, application_name: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                          <CustomSelect
                            className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm"
                            value={formData.plan_type}
                            onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
                          >
                            <option value="KT">KT</option>
                            <option value="Reverse-KT">Reverse-KT</option>
                          </CustomSelect>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Scope Description</label>
                        <textarea
                          required
                          rows={5}
                          placeholder="Enter main topics or scope details"
                          className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm"
                          value={formData.scope_description}
                          onChange={(e) => setFormData({...formData, scope_description: e.target.value})}
                        />
                      </div>
                      
                      {formData.plan_type === 'Reverse-KT' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Reverse KT Focus Area</label>
                          <input
                            type="text" required
                            placeholder="e.g. Test incident resolution or backend deployment"
                            className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm"
                            value={formData.reverse_kt_focus}
                            onChange={(e) => setFormData({...formData, reverse_kt_focus: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end pt-4 mt-auto">
                      <button
                        type="submit"
                        disabled={activeOperations['create-plan']}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-orange hover:bg-hover-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border disabled:opacity-50"
                      >
                        {activeOperations['create-plan'] ? 'Generating...' : 'Generate Plan'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Card 2: Generate Plan with Document */}
            <div className="bg-light-background rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between border-l-4 border-l-primary-orange h-full w-full max-w-4xl mx-auto">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary-text flex items-center">
                      <FileUp className="mr-2 text-primary-orange" size={20} />
                      Generate Plan with Document
                    </h3>
                    <span className="text-xs bg-input-background text-primary-orange px-2.5 py-1 rounded-full font-medium border border-input-background">
                      PDF / DOCX File
                    </span>
                  </div>

                  {/* Document Upload Option */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Document Upload (.pdf, .docx)</label>
                      {selectedFiles.length > 0 && (
                        <span className="text-xs text-primary-orange font-semibold bg-input-background px-2 py-0.5 rounded border border-input-background">
                          {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                        </span>
                      )}
                    </div>
                    
                    {/* Upload Box & Extract Button Side-by-Side */}
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1 border-2 border-dashed border-orange-border rounded-lg p-2 hover:border-button-orange transition-colors bg-input-background/40">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          multiple
                          onChange={handleDocFileChange}
                          disabled={analyzingDoc}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex items-center justify-between text-xs text-secondary-text">
                          <span className="flex items-center font-medium text-hover-orange truncate pr-1">
                            <Upload className="mr-1.5 text-primary-orange flex-shrink-0" size={15} />
                            {selectedFiles.length === 0
                              ? 'Click or drop PDF / Word file(s)...'
                              : 'Click / drop to add more...'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExtractFromDocs}
                        disabled={selectedFiles.length === 0 || analyzingDoc}
                        className="w-[115px] h-[38px] px-3 py-2 bg-primary-orange hover:bg-hover-orange text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                      >
                        {analyzingDoc ? (
                          <>
                            <RefreshCw className="mr-1 animate-spin" size={14} /> Extracting...
                          </>
                        ) : (
                          <>
                            <FileUp className="mr-1.5" size={14} /> Extract
                          </>
                        )}
                      </button>
                    </div>

                    {/* Selected files list */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-light-background rounded-md border border-gray-100">
                        {selectedFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="inline-flex items-center bg-light-background border border-orange-border text-hover-orange text-xs px-2 py-1 rounded-md shadow-xs group"
                          >
                            <FileText size={12} className="mr-1 text-primary-orange flex-shrink-0" />
                            <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              disabled={analyzingDoc}
                              className="ml-1.5 text-secondary-text hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Remove file"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleGenerateWithDoc} className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                      <input
                        type="text" required
                        disabled={!isDocExtracted || analyzingDoc}
                        placeholder={isDocExtracted ? "Extracted Plan Name" : "Upload document(s) to unlock"}
                        className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm disabled:bg-input-background disabled:text-secondary-text disabled:cursor-not-allowed"
                        value={docFormData.application_name}
                        onChange={(e) => setDocFormData({...docFormData, application_name: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                      <CustomSelect
                        disabled={!isDocExtracted || analyzingDoc}
                        className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm disabled:bg-input-background disabled:text-secondary-text disabled:cursor-not-allowed"
                        value={docFormData.plan_type}
                        onChange={(e) => setDocFormData({...docFormData, plan_type: e.target.value})}
                      >
                        <option value="KT">KT</option>
                        <option value="Reverse-KT">Reverse-KT</option>
                      </CustomSelect>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Scope Description</label>
                      <textarea
                        required
                        rows={2}
                        disabled={!isDocExtracted || analyzingDoc}
                        placeholder={isDocExtracted ? "Main topic names extracted from document(s)" : "Upload document(s) to unlock & auto-fill"}
                        className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm disabled:bg-input-background disabled:text-secondary-text disabled:cursor-not-allowed"
                        value={docFormData.scope_description}
                        onChange={(e) => setDocFormData({...docFormData, scope_description: e.target.value})}
                      />
                    </div>

                    {docFormData.plan_type === 'Reverse-KT' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Reverse KT Focus Area</label>
                        <input
                          type="text" required
                          disabled={!isDocExtracted || analyzingDoc}
                          placeholder="e.g. Test incident resolution or backend deployment"
                          className="mt-1 block w-full px-3 py-2 border border-light-border rounded-md shadow-sm focus:ring-orange-border focus:border-orange-border text-sm disabled:bg-input-background disabled:text-secondary-text disabled:cursor-not-allowed"
                          value={docFormData.reverse_kt_focus}
                          onChange={(e) => setDocFormData({...docFormData, reverse_kt_focus: e.target.value})}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 mt-auto">
                    <button
                      type="submit"
                      disabled={!isDocExtracted || generatingDocPlan || analyzingDoc}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-orange hover:bg-hover-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingDocPlan ? 'Generating...' : 'Generate Plan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : isEditingProject && projectToView ? (
        <AddProjectForm 
          onCancel={() => setIsEditingProject(false)} 
          onSave={handleUpdateProject} 
          onGeneratePlan={handleGeneratePlan} 
          initialData={{ name: projectToView.name, tracks: projectToView.config?.tracks || [] }} 
          isEditMode={true} 
          editTarget={editTarget}
        />
      ) : projectToView ? (
        <ProjectDetailsView 
          projectData={projectToView} 
          onClose={() => { 
            setProjectToView(null); 
            sessionStorage.removeItem('savedProjectToViewId'); 
            if (window.history.state?.view === 'project') {
              window.history.back();
            }
          }} 
          onGeneratePlan={handleGeneratePlan}
          canGenerate={canGenerate}
          onViewPlan={handleViewPlan}
          stakeholders={stakeholders}
          canApprove={canApprove}
          handleApproveClick={(planObj) => setPlanToApprove(planObj)}
          handleCloseClick={(planObj) => setPlanToClose(planObj)}
          parseMarkdown={parseMarkdown}
          handleAssignManager={handleAssignManager}
          handlePlanUpdate={handlePlanUpdate}
          allPlans={plans}
          onEditProject={(trackId = null, moduleId = null) => {
            setEditTarget({ trackId, moduleId });
            setIsEditingProject(true);
          }}
          onDeleteTrack={handleDeleteTrack}
          onDeleteModule={handleDeleteModule}
        />
      ) : isAddingProject ? (
        <AddProjectForm onCancel={() => setIsAddingProject(false)} onSave={handleSaveNewProject} onGeneratePlan={handleGeneratePlan} initialData={projectConfig} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  isLoading={loadingProjectId === project.id}
                  onClick={async () => {
                    setLoadingProjectId(project.id);
                    try {
                      const res = await getProjectById(project.id);
                      setProjectToView(res.data.data);
                    } catch (err) {
                      console.error("Error fetching project details");
                    } finally {
                      setLoadingProjectId(null);
                    }
                  }}
                />
              ))}
          </div>
          {projects.length === 0 && <p className="text-secondary-text text-center py-8">No projects created yet.</p>}
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-light-border bg-light-background px-4 py-3 sm:px-6 rounded-xl shadow-sm mt-4">
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
                  className="relative inline-flex items-center rounded-md border border-light-border bg-light-background px-4 py-2 text-sm font-medium text-gray-700 hover:bg-light-background disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-secondary-text">
                    Showing <span className="font-medium">{indexOfFirstProject + 1}</span> to <span className="font-medium">{Math.min(indexOfLastProject, projects.length)}</span> of{' '}
                    <span className="font-medium">{projects.length}</span> projects
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
      )}

      {planToApprove && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-background rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-primary-text mb-2">Approve KT Plan</h3>
            <p className="text-secondary-text mb-6">Are you sure you want to approve this plan? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPlanToApprove(null)}
                className="px-4 py-2 border border-light-border rounded-md text-sm font-medium text-gray-700 hover:bg-light-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                disabled={approvingPlan}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {approvingPlan ? (
                  <>
                    <RefreshCw className="animate-spin mr-2" size={16} />
                    Approving...
                  </>
                ) : (
                  'Yes, Approve'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {planToClose && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-background rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-primary-text mb-2">Close KT Plan</h3>
            <p className="text-secondary-text mb-6">Are you sure you want to close this KT Plan? Closed plans will be archived from active modules.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPlanToClose(null)}
                className="px-4 py-2 border border-light-border rounded-md text-sm font-medium text-gray-700 hover:bg-light-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-border"
              >
                Cancel
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Yes, Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showSaveProjectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-background rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-primary-text mb-2">Plan Generated Successfully!</h3>
            <p className="text-secondary-text mb-6">Would you like to save this project configuration now so you can generate more plans for it later?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveProjectModal(false);
                  setPendingPlanId(null);
                }}
                className="px-4 py-2 border border-light-border rounded-md text-sm font-medium text-gray-700 hover:bg-light-background focus:outline-none"
              >
                Skip
              </button>
              <button
                onClick={handleSaveProjectAfterPlan}
                className="px-4 py-2 bg-primary-orange text-white rounded-md text-sm font-medium hover:bg-hover-orange focus:outline-none"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-scaleIn">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">{deleteModalConfig.message}</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteModalConfig(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadModalConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-scaleIn">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Upload</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to upload "{uploadModalConfig.file.name}" and create projects from this template?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setUploadModalConfig(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUploadTemplate}
                  className="px-4 py-2 bg-primary-orange text-white font-medium rounded-lg hover:bg-hover-orange transition-colors shadow-sm"
                >
                  Confirm Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanPage;
