import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect, useRef } from 'react';
import { getPlans, getStakeholders, getMeetings, generateQuestions, submitAnswer, getResults, getPlanTopics, getPlanTopicOptions, completeAssessment, getAttemptDetails, getPlanAssessmentSettings, updatePlanAssessmentSettings, sendFinalAssessmentReminder } from '../api/api';
import Loader from '../components/Loader';
import { FileQuestion, CheckCircle2, RefreshCw, Award, Sparkles, User, BookOpen, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';

const AssessmentPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [meetings, setMeetings] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const { activeOperations, startOperation, endOperation } = useOperations();
  const generating = activeOperations['assessment-generation'];
  const [submitting, setSubmitting] = useState(false);
  
  // Dual Assessment Modes States (Final vs Day-wise)
  const [assessmentType, setAssessmentType] = useState('day_wise'); // 'final' | 'day_wise'
  const [selectedDayLabel, setSelectedDayLabel] = useState('');
  const [dayOptions, setDayOptions] = useState([]);
  const [rawPlanTopics, setRawPlanTopics] = useState([]);
  const [isPlanFullyCompleted, setIsPlanFullyCompleted] = useState(false);
  const [finalDeadlineInfo, setFinalDeadlineInfo] = useState({ isExpired: false, daysLeft: 90, deadlineDate: null });
  const [elapsedDays, setElapsedDays] = useState(0);
  const [managerSettings, setManagerSettings] = useState({ is_final_unlocked: false, final_deadline_extension_days: 90, unlocked_on: null });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');
  const [toastModal, setToastModal] = useState({ isOpen: false, title: '', message: '', type: 'warning' });

  const showToast = (message, title = 'Notice', type = 'warning') => {
    setToastModal({ isOpen: true, title, message, type });
  };
  
  // Chat / Conversational Assessment States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [sessionResults, setSessionResults] = useState([]);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentAsid, setCurrentAsid] = useState('');
  const [overallFeedback, setOverallFeedback] = useState('');
  const [overallScore, setOverallScore] = useState(0);
  
  const [hasCompletedTopics, setHasCompletedTopics] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [results, setResults] = useState([]);
  const [groupedAttempts, setGroupedAttempts] = useState([]);
  const [attemptQuestions, setAttemptQuestions] = useState([]);
  const [attemptDetailsLoading, setAttemptDetailsLoading] = useState(false);
  const [completedTopics, setCompletedTopics] = useState([]);
  
  const [expandedAssessments, setExpandedAssessments] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [expandedAttemptQuestions, setExpandedAttemptQuestions] = useState({});

  const toggleAssessmentExpand = (idx) => setExpandedAssessments(prev => ({ ...prev, [idx]: !prev[idx] }));
  const toggleQuestionExpand = (idx) => setExpandedQuestions(prev => ({ ...prev, [idx]: !prev[idx] }));
  const toggleAttemptQuestionExpand = (idx) => setExpandedAttemptQuestions(prev => ({ ...prev, [idx]: !prev[idx] }));
  
  const parseCoveredTopics = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const isDayCompleted = (dayLabel) => {
    if (!dayLabel) return false;
    const target = dayLabel.trim().toLowerCase();
    return results.some(r => {
      const rDay = (r.day_label || '').trim().toLowerCase();
      const rType = r.assessment_type || 'day_wise';
      return (rType === 'day_wise' || rDay !== '') && rDay === target;
    });
  };

  const isFinalCompleted = results.some(r => r.assessment_type === 'final');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [plansRes, stRes, meetingsRes] = await Promise.all([getPlans({ for_dropdown: 'true' }), getStakeholders(), getMeetings()]);
        const appPlans = plansRes.data.data.filter(p => p.status === 'approved');
        const stList = stRes.data.data;

        setPlans(appPlans);
        setStakeholders(stList);
        setMeetings(meetingsRes.data.data || []);
        // No auto-selection of plan by default
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  const checkTopicsAndDays = async (planId = selectedPlanId) => {
    if (!planId) return;
    try {
      const [trackingRes, optionsRes, settingsRes] = await Promise.all([
        getPlanTopics(planId),
        getPlanTopicOptions(planId),
        getPlanAssessmentSettings(planId)
      ]);

      let currentManagerSettings = { is_final_unlocked: false, final_deadline_extension_days: 90, unlocked_on: null };
      if (settingsRes.data && settingsRes.data.success && settingsRes.data.data) {
        currentManagerSettings = {
          is_final_unlocked: !!settingsRes.data.data.is_final_unlocked,
          final_deadline_extension_days: Number(settingsRes.data.data.final_deadline_extension_days) || 90,
          unlocked_on: settingsRes.data.data.unlocked_on || null
        };
        setManagerSettings(currentManagerSettings);
      }

      const trackingTopics = trackingRes.data?.data || [];
      const planTopicsOptions = optionsRes.data?.data || [];

      setRawPlanTopics(planTopicsOptions);
      const completedList = trackingTopics.filter(t => t.completion_percent === 100).map(t => t.topic);
      setCompletedTopics(completedList);

      const completedTopicNamesSet = new Set(completedList.map(t => t.trim().toLowerCase()));

      // Group plan_topics by day_label
      const daysMap = {};
      planTopicsOptions.forEach(item => {
        const dLabel = item.day_label || 'General';
        if (!daysMap[dLabel]) daysMap[dLabel] = [];
        if (item.topic_name) daysMap[dLabel].push(item.topic_name.trim().toLowerCase());
      });

      // Filter days where at least one topic under that day is 100% completed
      const completedDays = Object.keys(daysMap).filter(dayLabel => {
        const topicNames = daysMap[dayLabel];
        const dayLabelLower = dayLabel.trim().toLowerCase();
        
        const hasCompletedTopic = topicNames.some(tn => completedTopicNamesSet.has(tn));
        const isDayLabelCompleted = completedTopicNamesSet.has(dayLabelLower);
        const isPartialMatch = Array.from(completedTopicNamesSet).some(ct => 
          ct.includes(dayLabelLower) || dayLabelLower.includes(ct) || topicNames.some(tn => ct.includes(tn) || tn.includes(ct))
        );

        return hasCompletedTopic || isDayLabelCompleted || isPartialMatch;
      });

      setDayOptions(completedDays);

      // Check if all topics of the entire plan are 100% completed
      const allTopicsCount = planTopicsOptions.length;
      const allCompleted = allTopicsCount > 0 && planTopicsOptions.every(pt => {
        const tn = (pt.topic_name || '').trim().toLowerCase();
        const dLabelLower = (pt.day_label || '').trim().toLowerCase();
        return completedTopicNamesSet.has(tn) || 
               completedTopicNamesSet.has(dLabelLower) ||
               Array.from(completedTopicNamesSet).some(ct => ct.includes(tn) || tn.includes(ct));
      });

      setIsPlanFullyCompleted(allCompleted);

      let isExpired = false;
      let daysLimit = currentManagerSettings.final_deadline_extension_days || 90;
      let daysLeft = daysLimit;
      let deadlineDate = null;
      let computedElapsedDays = 0;

      if (allCompleted || currentManagerSettings.is_final_unlocked) {
        const completedTimes = trackingTopics
          .filter(t => t.completion_percent === 100 && t.last_updated)
          .map(t => new Date(t.last_updated).getTime())
          .filter(t => !isNaN(t));

        const maxTopicTime = completedTimes.length > 0 ? Math.max(...completedTimes) : Date.now();
        const baseUnlockTime = currentManagerSettings.unlocked_on ? new Date(currentManagerSettings.unlocked_on).getTime() : maxTopicTime;

        const elapsedMs = Date.now() - baseUnlockTime;
        computedElapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));

        deadlineDate = new Date(baseUnlockTime + daysLimit * 24 * 60 * 60 * 1000);
        const diffMs = deadlineDate.getTime() - Date.now();
        daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        isExpired = diffMs < 0;
      }

      setElapsedDays(computedElapsedDays);
      setFinalDeadlineInfo({ isExpired, daysLeft, deadlineDate });

      if (!allCompleted || isExpired) {
        setAssessmentType('day_wise');
      }

      const hasCompleted = completedList.length > 0;
      setHasCompletedTopics(hasCompleted);
      if (!hasCompleted) {
        setWarningMsg("No completed KT topics are available for assessment yet for this plan.");
        setQuestions([]);
      } else {
        setWarningMsg('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedPlanId && user?.email) {
      setCurrentQuestionIndex(-1);
      setChatMessages([]);
      setSessionResults([]);
      setAssessmentCompleted(false);
      setCurrentAnswer('');
      
      fetchResults(selectedPlanId, null, stakeholders);
      checkTopicsAndDays(selectedPlanId);
    }
  }, [selectedPlanId, stakeholders, user]);

  const fetchResults = async (planId = selectedPlanId, stakeholderId = null, stList = stakeholders, limit = undefined) => {
    try {
      const resolvedPlanId = planId;
      if (!resolvedPlanId) return;

      const isReceiver = user?.role === 'Incoming Team Member (Knowledge Receiver)';
      let resolvedStakeholderId = null;
      if (isReceiver) {
        resolvedStakeholderId = stakeholderId || user?.stakeholder_id || stList.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())?.id;
      }

      console.log("[DEV LOG] Current User Email:", user?.email);
      console.log("[DEV LOG] Current Stakeholder ID:", resolvedStakeholderId);
      console.log("[DEV LOG] Selected Plan ID:", resolvedPlanId);
      console.log("[DEV LOG] Assessment API Request - planId:", resolvedPlanId, "stakeholderId:", resolvedStakeholderId, "limit:", limit);
      
      const res = await getResults(resolvedPlanId, resolvedStakeholderId, limit);
      const allResults = res.data.data || [];
      
      console.log("[DEV LOG] Assessment API Response:", allResults);
      console.log("[DEV LOG] Raw Results Length:", allResults.length);

      let filteredResults = allResults;
      if (isReceiver) {
        filteredResults = allResults.filter(r => {
          const isMatchId = resolvedStakeholderId ? Number(r.stakeholder_id) === Number(resolvedStakeholderId) : false;
          const isMatchName = user.name ? r.stakeholder_name === user.name : false;
          return isMatchId || isMatchName;
        });
      } else {
        // For other personas (SME, Leadership, etc.), display ONLY Knowledge Receivers' assessments
        filteredResults = allResults.filter(r => {
          const stakeholder = stList.find(s => s.id === r.stakeholder_id);
          return stakeholder && stakeholder.role === 'Incoming Team Member (Knowledge Receiver)';
        });
      }
      
      console.log("[DEV LOG] Filtered Results Length:", filteredResults.length);
      setResults(filteredResults);
      
      console.log("[DEV LOG] Grouped Attempts Length:", filteredResults.length);
      setGroupedAttempts(filteredResults);
      return filteredResults;
    } catch (err) {
      console.error("[DEV LOG] Error in fetchResults:", err);
    }
  };

  const handleOpenHistory = async () => {
    setHistoryLoading(true);
    try {
      // For Knowledge Receiver persona, fetch only the latest 5 assessments
      const isKnowledgeReceiver = user?.role === 'Incoming Team Member (Knowledge Receiver)';
      const limit = isKnowledgeReceiver ? 5 : undefined;
      await fetchResults(selectedPlanId, null, stakeholders, limit);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
      setIsHistoryModalOpen(true);
    }
  };

  const handleViewDetails = async (attempt) => {
    setAttemptDetailsLoading(true);
    setSelectedAttempt(attempt);
    try {
      const res = await getAttemptDetails(attempt.asid);
      if (res.data && res.data.success) {
        setAttemptQuestions(res.data.data.questions || []);
      }
    } catch (err) {
      console.error("Error fetching attempt details:", err);
      setAttemptQuestions([]);
    } finally {
      setAttemptDetailsLoading(false);
    }
  };

  const handleSaveManagerSettings = async () => {
    if (!selectedPlanId) return;
    const newDays = parseInt(managerSettings.final_deadline_extension_days) || 0;

    if (newDays <= 0) {
      showToast("Please enter a valid positive number of days.", "Invalid Input", "error");
      return;
    }

    if (isPlanFullyCompleted && newDays <= elapsedDays) {
      showToast(`Invalid Deadline! Already ${elapsedDays} day(s) have passed since plan completion. The new deadline window must be greater than ${elapsedDays} day(s).`, "Invalid Deadline", "error");
      return;
    }

    setSavingSettings(true);
    setSettingsSavedMsg('');
    const payload = {
      is_final_unlocked: managerSettings.is_final_unlocked,
      final_deadline_extension_days: newDays
    };
    try {
      const res = await updatePlanAssessmentSettings(selectedPlanId, payload);
      if (res.data && res.data.success) {
        setSettingsSavedMsg('✓ Manager settings saved successfully!');
        await checkTopicsAndDays(selectedPlanId);
        setTimeout(() => setSettingsSavedMsg(''), 3000);
      }
    } catch (err) {
      console.error("Error saving manager settings:", err);
      const errMsg = err?.response?.data?.message || "Failed to save manager settings.";
      showToast(errMsg, "Save Failed", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedPlanId) return;
    if (assessmentType === 'day_wise' && !selectedDayLabel) {
      showToast("Please select a day for the Day-wise assessment.", "Selection Required", "warning");
      return;
    }
    if (assessmentType === 'day_wise' && isDayCompleted(selectedDayLabel)) {
      showToast(`Assessment for ${selectedDayLabel} has already been completed. You cannot re-take this assessment.`, "Already Completed", "info");
      return;
    }
    if (assessmentType === 'final') {
      if (isFinalCompleted) {
        showToast("Final Assessment has already been completed. You cannot re-take this assessment.", "Already Completed", "info");
        return;
      }
      if (!isPlanFullyCompleted && !managerSettings.is_final_unlocked) {
        showToast("Final Assessment is locked until 100% of all KT topics in the plan are completed or unlocked by manager.", "Assessment Locked", "warning");
        return;
      }
      if (finalDeadlineInfo.isExpired && !managerSettings.is_final_unlocked) {
        showToast("The Final Assessment deadline has expired.", "Deadline Expired", "error");
        return;
      }
    }
    startOperation('assessment-generation');
    try {
      const stakeholderId = user?.stakeholder_id || stakeholders.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())?.id;
      const res = await generateQuestions(
        selectedPlanId,
        assessmentType,
        assessmentType === 'day_wise' ? selectedDayLabel : null,
        stakeholderId
      );
      const generatedQs = res.data.data || [];
      setQuestions(generatedQs);
      if (generatedQs.length > 0) {
        const asid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentAsid(asid);
        setOverallFeedback('');
        setOverallScore(0);
        setCurrentQuestionIndex(0);
        setChatMessages([
          {
            id: Date.now(),
            sender: 'ai',
            text: generatedQs[0]
          }
        ]);
        setSessionResults([]);
        setAssessmentCompleted(false);
        setCurrentAnswer('');
        setStartTime(Date.now());
        setTimeTaken(0);
      }
      setWarningMsg('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error generating questions';
      showToast(msg, "Missing Documents / Action Required", "warning");
      setWarningMsg(msg);
    } finally {
      endOperation('assessment-generation');
    }
  };

  const handleSubmitAnswer = async (e) => {
    if (e) e.preventDefault();
    if (!currentAnswer.trim() || evaluationLoading) return;

    const stakeholderId = user?.stakeholder_id || stakeholders.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())?.id;

    if (!stakeholderId) {
      alert("Error: Stakeholder record for the logged-in user not found.");
      return;
    }

    const questionText = questions[currentQuestionIndex];
    const userAns = currentAnswer;

    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now() + 1,
        sender: 'user',
        text: userAns
      }
    ]);
    
    setCurrentAnswer('');
    setEvaluationLoading(true);

    try {
      const res = await submitAnswer({
        plan_id: selectedPlanId,
        stakeholder_id: stakeholderId,
        question: questionText,
        answer: userAns,
        asid: currentAsid
      });

      const { score, feedback } = res.data.data;
      
      const newResult = {
        question: questionText,
        answer: userAns,
        score: score,
        feedback: feedback
      };
      
      setSessionResults(prev => [...prev, newResult]);

      if (currentQuestionIndex + 1 < questions.length) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        
        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now() + 2,
            sender: 'ai',
            text: questions[nextIndex]
          }
        ]);
      } else {
        const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
        setTimeTaken(elapsed);

        // Calculate day-specific topics for day_wise mode payload
        const daySpecificTopics = rawPlanTopics
          .filter(pt => {
            if (!selectedDayLabel) return false;
            const ptDay = (pt.day_label || '').trim().toLowerCase();
            const selDay = selectedDayLabel.trim().toLowerCase();
            return ptDay === selDay || ptDay.includes(selDay) || selDay.includes(ptDay);
          })
          .map(pt => pt.topic_name);

        const compRes = await completeAssessment({
          asid: currentAsid,
          plan_id: selectedPlanId,
          stakeholder_id: stakeholderId,
          assessment_type: assessmentType,
          day_label: assessmentType === 'day_wise' ? selectedDayLabel : null,
          covered_topics: assessmentType === 'day_wise' ? (daySpecificTopics.length > 0 ? daySpecificTopics : [selectedDayLabel]) : completedTopics,
          question_scores: [...sessionResults.map(r => r.score), score],
          questions_data: [
            ...sessionResults.map(r => ({ question: r.question, answer: r.answer })),
            { question: questionText, answer: userAns }
          ]
        });

        if (compRes.data && compRes.data.success) {
          setOverallFeedback(compRes.data.data.feedback);
          setOverallScore(compRes.data.data.overall_score);
        }

        setAssessmentCompleted(true);
        fetchResults(selectedPlanId, null, stakeholders);
      }
    } catch (err) {
      console.error(err);
      alert('Error evaluating answer. Please try again.');
    } finally {
      setEvaluationLoading(false);
    }
  };

  const handleRestart = async () => {
    setCurrentQuestionIndex(-1);
    setAssessmentCompleted(false);
    setChatMessages([]);
    setSessionResults([]);
    setCurrentAnswer('');
    setTimeTaken(0);
    setStartTime(null);
    await handleGenerateQuestions();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, evaluationLoading]);

  if (loading) return <Loader />;

  const isReceiver = user?.role === 'Incoming Team Member (Knowledge Receiver)';
  const isSME = user?.role === 'Outgoing SME (Knowledge Giver)';
  // All roles that can only VIEW results (not take assessments)
  const isViewer = !isReceiver && !isSME;
  const canSetup = isReceiver;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title */}
      <div className="flex justify-between items-center bg-light-background p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-primary-text flex items-center">
          <FileQuestion className="mr-3 text-primary-orange w-8 h-8" />
          {isReceiver ? 'Conversational Assessments' : 'Assessment Results'}
        </h2>
        {user && (
          <div className="flex items-center space-x-2 text-sm text-secondary-text bg-light-background px-3 py-1.5 rounded-full border border-light-border">
            <User className="w-4 h-4 text-primary-orange" />
            <span className="font-semibold">{user.name}</span>
          </div>
        )}
      </div>

      {/* Plan Selector & Generate Button Panel */}
      <div className="bg-light-background p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Knowledge Plan</label>
            <CustomSelect
              className="w-full px-4 py-2.5 bg-light-background border border-light-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-orange focus:bg-light-background transition-all text-primary-text text-sm"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              disabled={currentQuestionIndex >= 0 && !assessmentCompleted}
            >
              <option value="" disabled>---Select Plan---</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.application_name}</option>)}
            </CustomSelect>
          </div>
          
          {canSetup && (() => {
            const currentDayIsCompleted = assessmentType === 'day_wise' && !!selectedDayLabel && isDayCompleted(selectedDayLabel);
            const currentFinalIsCompleted = assessmentType === 'final' && isFinalCompleted;
            const isGenerateDisabled = !selectedPlanId || (assessmentType === 'day_wise' && !selectedDayLabel) || generating || !hasCompletedTopics || (currentQuestionIndex >= 0 && !assessmentCompleted) || currentDayIsCompleted || currentFinalIsCompleted;

            return (
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerateDisabled}
                title={
                  currentDayIsCompleted 
                    ? `Assessment for ${selectedDayLabel} has already been completed.` 
                    : currentFinalIsCompleted 
                      ? "Final Assessment has already been completed." 
                      : ""
                }
                className="px-6 py-2.5 bg-gradient-to-r from-primary-orange to-hover-orange text-white font-semibold rounded-xl hover:from-hover-orange hover:to-hover-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md text-sm"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{currentDayIsCompleted || currentFinalIsCompleted ? 'Completed' : 'Generate Questions'}</span>
                  </>
                )}
              </button>
            );
          })()}
        </div>

        {/* Manager Assessment Controls Card (for Delivery / Engagement Manager & Viewer roles) */}
        {!canSetup && !isSME && selectedPlanId && (
          <div className="mt-5 pt-5 border-t border-gray-100 bg-gradient-to-br from-input-background to-purple-50/30 p-5 rounded-2xl border border-orange-border animate-fadeIn space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-orange" />
                <h4 className="text-sm font-bold text-primary-text">
                  Manager Assessment Settings & Controls
                </h4>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-light-background text-hover-orange rounded-full border border-orange-border shadow-xs">
                Delivery Manager Panel
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Control 1: Force Unlock Toggle */}
              <div className="bg-light-background p-4 rounded-xl border border-gray-150 shadow-sm flex flex-col justify-between space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    1. Final Assessment Access Mode
                  </label>
                  <p className="text-[11px] text-secondary-text">
                    Allow Knowledge Receiver to take Final Assessment before 100% topic completion.
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setManagerSettings(prev => ({ ...prev, is_final_unlocked: !prev.is_final_unlocked }));
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                      managerSettings.is_final_unlocked
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-input-background text-hover-orange hover:bg-orange-border border border-orange-border'
                    }`}
                  >
                    {managerSettings.is_final_unlocked ? '🔒 Relock to Default' : '🔓 Force Unlock Early'}
                  </button>
                  
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    managerSettings.is_final_unlocked
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-input-background text-secondary-text border border-light-border'
                  }`}>
                    {managerSettings.is_final_unlocked ? 'Unlocked Early' : 'Requires 100% Plan'}
                  </span>
                </div>
              </div>

              {/* Control 2: Custom Deadline Days Input */}
              <div className="bg-light-background p-4 rounded-xl border border-gray-150 shadow-sm flex flex-col justify-between space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    2. Final Assessment Deadline Window
                  </label>
                  <p className="text-[11px] text-secondary-text">
                    Type any custom number of days manually (e.g. 15, 30, 45, 90, 180). Default is 90 days.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      placeholder="Enter number of days..."
                      value={managerSettings.final_deadline_extension_days}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0);
                        setManagerSettings(prev => ({ ...prev, final_deadline_extension_days: val }));
                      }}
                      className="w-full max-w-[180px] px-3.5 py-2 bg-light-background border border-light-border rounded-xl text-xs font-bold text-primary-text focus:outline-none focus:ring-2 focus:ring-primary-orange focus:bg-light-background transition-all"
                    />
                    <span className="text-xs font-bold text-secondary-text">Days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Settings Action Button */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-semibold text-emerald-600">
                {settingsSavedMsg}
              </span>
              
              <button
                type="button"
                onClick={handleSaveManagerSettings}
                disabled={savingSettings}
                className="px-5 py-2 bg-button-orange hover:bg-hover-orange text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
              >
                {savingSettings ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Save Assessment Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Dual Assessment Mode Selector (for Knowledge Receiver) */}
        {canSetup && selectedPlanId && (
          <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-secondary-text uppercase tracking-wider mb-2">
                Assessment Type
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setAssessmentType('day_wise')}
                  disabled={currentQuestionIndex >= 0 && !assessmentCompleted}
                  className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-between shadow-sm ${
                    assessmentType === 'day_wise'
                      ? 'bg-input-background border-button-orange text-hover-orange ring-2 ring-button-orange font-semibold'
                      : 'bg-light-background border-light-border text-gray-700 hover:bg-input-background'
                  }`}
                >
                  <span>Day-wise Assessment</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-input-background text-primary-orange border border-orange-border">
                    Optional
                  </span>
                </button>

                {(() => {
                  const isFinalAssessmentAvailable = isPlanFullyCompleted || managerSettings.is_final_unlocked;
                  const isFinalLocked = !isFinalAssessmentAvailable;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isFinalLocked || (finalDeadlineInfo.isExpired && !managerSettings.is_final_unlocked)) return;
                        setAssessmentType('final');
                      }}
                      disabled={isFinalLocked || (finalDeadlineInfo.isExpired && !managerSettings.is_final_unlocked) || (currentQuestionIndex >= 0 && !assessmentCompleted)}
                      title={
                        isFinalLocked
                          ? "Final Assessment is locked until 100% of all days in the KT plan are completed or unlocked by manager."
                          : finalDeadlineInfo.isExpired && !managerSettings.is_final_unlocked
                            ? "Deadline for Final Assessment has expired."
                            : `Must complete within ${finalDeadlineInfo.daysLeft} days`
                      }
                      className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-between shadow-sm ${
                        isFinalLocked || (finalDeadlineInfo.isExpired && !managerSettings.is_final_unlocked)
                          ? 'bg-input-background/90 border-light-border text-secondary-text cursor-not-allowed opacity-80'
                          : assessmentType === 'final'
                            ? 'bg-rose-50/80 border-rose-400 text-rose-900 ring-2 ring-rose-300 font-semibold'
                            : 'bg-light-background border-light-border text-gray-700 hover:bg-input-background'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {(isFinalLocked || (finalDeadlineInfo.isExpired && !managerSettings.is_final_unlocked)) && <Lock className="w-3.5 h-3.5 text-secondary-text" />}
                        <span>Final Assessment</span>
                      </div>
                      {isFinalAssessmentAvailable ? (
                        isFinalCompleted ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        ) : finalDeadlineInfo.isExpired && !managerSettings.is_final_unlocked ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Mandatory ({finalDeadlineInfo.daysLeft}d left)
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-input-background/80 text-secondary-text border border-light-border">
                          Locked
                        </span>
                      )}
                    </button>
                  );
                })()}
              </div>

              {!isPlanFullyCompleted && !managerSettings.is_final_unlocked && (
                <div className="mt-2.5 text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-lg border border-amber-200/70 flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Final Assessment unlocks only after 100% of all days in the plan are completed or unlocked by manager.</span>
                </div>
              )}

              {!isPlanFullyCompleted && managerSettings.is_final_unlocked && (
                <div className="mt-2.5 text-[11px] text-amber-800 bg-amber-50/90 p-2 rounded-lg border border-amber-200 flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span><strong>Unlocked Early by Manager:</strong> Final Assessment has been enabled by your Manager for early attempt.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0">
                    Unlocked Early
                  </span>
                </div>
              )}

              {isPlanFullyCompleted && isFinalCompleted && (
                <div className="mt-2.5 text-[11px] text-emerald-800 bg-emerald-50/90 p-2 rounded-lg border border-emerald-200 flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span><strong>Final Assessment Completed!</strong> You have already completed your final assessment for this plan.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                    Completed
                  </span>
                </div>
              )}

              {isPlanFullyCompleted && !isFinalCompleted && finalDeadlineInfo.isExpired && (
                <div className="mt-2.5 text-[11px] text-red-700 bg-red-50/90 p-2 rounded-lg border border-red-200 flex items-center gap-1.5 font-medium">
                  <span className="text-sm">⚠️</span>
                  <span><strong>Final Assessment Window Expired!</strong> {managerSettings.final_deadline_extension_days || 90} days have passed since 100% plan completion. Final assessment can no longer be taken.</span>
                </div>
              )}

              {isPlanFullyCompleted && !isFinalCompleted && !finalDeadlineInfo.isExpired && (
                <div className="mt-2.5 text-[11px] text-emerald-800 bg-emerald-50/90 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-medium">
                  <span className="text-sm">⏰</span>
                  <span><strong>{managerSettings.final_deadline_extension_days || 90}-Day Window Active:</strong> You have <strong>{finalDeadlineInfo.daysLeft} day(s)</strong> remaining to complete your Final Assessment.</span>
                </div>
              )}
            </div>

            {assessmentType === 'day_wise' && (
              <div>
                <label className="block text-xs font-bold text-secondary-text uppercase tracking-wider mb-2">
                  Select Day
                </label>
                <CustomSelect
                  className="w-full px-4 py-2.5 bg-light-background border border-light-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-orange focus:bg-light-background transition-all text-primary-text text-sm font-medium"
                  value={selectedDayLabel}
                  onChange={(e) => setSelectedDayLabel(e.target.value)}
                  disabled={currentQuestionIndex >= 0 && !assessmentCompleted}
                >
                  <option value="">---Select Day---</option>
                  {dayOptions.length > 0 ? (
                    dayOptions.map((day, idx) => {
                      const completed = isDayCompleted(day);
                      return (
                        <option key={idx} value={day}>
                          {day} {completed ? '✓ (Completed)' : ''}
                        </option>
                      );
                    })
                  ) : (
                    <option value="" disabled>No Specific Days Found</option>
                  )}
                </CustomSelect>

                {selectedDayLabel && isDayCompleted(selectedDayLabel) && (
                  <div className="mt-2.5 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Assessment for <strong>{selectedDayLabel}</strong> is completed.</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 flex-shrink-0">
                      Completed
                    </span>
                  </div>
                )}

                {/* Display Topics Covered for the Selected Day */}
                {(() => {
                  const dayTopics = rawPlanTopics
                    .filter(pt => (pt.day_label || 'General') === selectedDayLabel)
                    .map(pt => pt.topic_name)
                    .filter(Boolean);

                  if (dayTopics.length === 0) return null;

                  return (
                    <div className="mt-3 p-3 bg-input-background rounded-xl border border-orange-border/80 animate-fadeIn">
                      <span className="text-[10px] font-bold text-hover-orange uppercase tracking-wider block mb-1.5">
                        Topics Covered ({dayTopics.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {dayTopics.map((topic, ti) => (
                          <span key={ti} className="px-2.5 py-1 bg-light-background text-hover-orange border border-orange-border/70 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-primary-orange" />
                            <span>{topic}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {canSetup && warningMsg && (
          <div className="mt-4 p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-medium flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>{warningMsg}</span>
          </div>
        )}
      </div>

      {/* Main Layout Area */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Scenario 1: Setup / Not Started yet */}
        {isReceiver && currentQuestionIndex === -1 && !assessmentCompleted && (
          <div className="relative max-w-4xl mx-auto w-full bg-gradient-to-br from-input-background to-purple-50 p-10 md:p-12 rounded-3xl border border-orange-border flex flex-col justify-center items-center text-center space-y-6 min-h-[420px] shadow-sm">
            {/* View Assessment Results Button placed near the top-right of the setup section */}
            <div className="absolute top-6 right-6">
              <button
                onClick={handleOpenHistory}
                disabled={historyLoading}
                className="px-4 py-2 bg-light-background text-primary-orange font-semibold border border-orange-border rounded-xl hover:bg-input-background hover:border-button-orange transition-all text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {historyLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>View Assessment Results</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-5 bg-light-background rounded-full shadow-md text-primary-orange">
              <FileQuestion className="w-14 h-14" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-primary-text mb-2">
                {canSetup ? "Ready to Start Your Assessment?" : "Conversational Assessment Overview"}
              </h3>
              <p className="text-secondary-text max-w-lg mx-auto text-sm leading-relaxed">
                {canSetup 
                  ? "Click the Generate Questions button above to launch an interactive, conversational assessment. The AI will evaluate your answers topic by topic."
                  : "Review historical conversational assessment scores and evaluation feedback completed by the incoming team members."
                }
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-secondary-text bg-light-background p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Completed Topics Only
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-input-background text-hover-orange rounded-full">
                <Sparkles className="w-4 h-4" /> AI Conversational Scoring
              </div>
            </div>
          </div>
        )}

        {/* Scenario 2: Active Chat Assessment Flow */}
        {isReceiver && currentQuestionIndex >= 0 && !assessmentCompleted && (
          <div className="bg-light-background rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
            {/* Header progress bar */}
            <div className="p-4 bg-light-background border-b border-gray-100 flex flex-col space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span className="text-primary-orange bg-input-background px-3 py-1 rounded-full text-xs font-bold">
                  {questions.length > 0 ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-input-background h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-button-orange h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[400px]">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Interviewer Icon (Indigo) */}
                  {msg.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-button-orange flex items-center justify-center text-white shadow-sm flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm border ${
                    msg.sender === 'user' 
                      ? 'bg-input-background text-indigo-955 border-orange-border rounded-tr-none font-medium' 
                      : 'bg-light-background text-primary-text border-light-border rounded-tl-none font-medium'
                  }`}>
                    <p className="text-sm whitespace-pre-line leading-relaxed">{msg.text}</p>
                  </div>

                  {/* Candidate Icon (Purple) */}
                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Evaluation Loading / Typing Indicator */}
              {evaluationLoading && (
                <div className="flex items-start gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-button-orange flex items-center justify-center text-white shadow-sm flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="bg-light-background text-primary-text border border-light-border max-w-[70%] p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-3">
                    <div className="flex space-x-1.5 items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-xs text-secondary-text italic font-medium">Evaluating your answer...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

             {/* Answer Input Controls */}
            <div className="p-5 bg-light-background border-t border-gray-100 rounded-b-2xl">
              <form onSubmit={handleSubmitAnswer} className="flex flex-col gap-4">
                <textarea
                  required
                  rows="4"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  disabled={evaluationLoading}
                  className="w-full px-5 py-4 border border-light-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-orange bg-light-background text-primary-text disabled:bg-input-background disabled:text-secondary-text placeholder-placeholder transition-all text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitAnswer(e);
                    }
                  }}
                ></textarea>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={evaluationLoading || !currentAnswer.trim()}
                    className="px-6 py-2.5 bg-button-orange text-white font-semibold rounded-xl hover:bg-hover-orange focus:outline-none focus:ring-2 focus:ring-primary-orange disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md text-sm"
                  >
                    {evaluationLoading ? 'Evaluating...' : 'Continue →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Scenario 3: Assessment Completed & Dashboard Results view */}
        {isReceiver && assessmentCompleted && (
          <div className="bg-light-background rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
            
            {/* Completion Header badge */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 pb-6 border-b border-gray-100">
              <div className="p-4 bg-green-50 text-green-600 rounded-full shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary-text">Assessment Completed!</h3>
                <p className="text-secondary-text text-sm max-w-md">
                  All generated questions have been answered. Here is your AI score evaluation report.
                </p>
              </div>
            </div>

            {/* Scores summary metrics */}
            {(() => {
              const totalScore = sessionResults.reduce((acc, curr) => acc + (curr.score || 0), 0);
              const maxPossible = sessionResults.length * 10;
              const avgScore = sessionResults.length > 0 ? (totalScore / sessionResults.length) : 0;
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-gradient-to-br from-gray-50 to-input-background p-6 rounded-2xl border border-gray-100">
                  <div className="flex flex-col justify-center items-center text-center p-4 bg-light-background rounded-xl shadow-sm border border-gray-50">
                    <Award className="w-6 h-6 text-primary-orange mb-1" />
                    <p className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">Overall Score</p>
                    <h4 className="text-lg font-bold text-primary-text mt-1">{totalScore} / {maxPossible}</h4>
                  </div>
                  
                  <div className="flex flex-col justify-center items-center text-center p-4 bg-light-background rounded-xl shadow-sm border border-gray-50">
                    <Sparkles className="w-6 h-6 text-primary-orange mb-1" />
                    <p className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">Average Score</p>
                    <h4 className="text-lg font-bold text-primary-text mt-1">{avgScore.toFixed(1)} / 10</h4>
                  </div>

                  <div className="flex flex-col justify-center items-center text-center p-4 bg-light-background rounded-xl shadow-sm border border-gray-50">
                    <BookOpen className="w-6 h-6 text-primary-orange mb-1" />
                    <p className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">Attempted</p>
                    <h4 className="text-lg font-bold text-primary-text mt-1">{sessionResults.length} Qs</h4>
                  </div>

                  <div className="flex flex-col justify-center items-center text-center p-4 bg-light-background rounded-xl shadow-sm border border-gray-50">
                    <FileQuestion className="w-6 h-6 text-primary-orange mb-1" />
                    <p className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">Total Questions</p>
                    <h4 className="text-lg font-bold text-primary-text mt-1">{questions.length} Qs</h4>
                  </div>

                  <div className="flex flex-col justify-center items-center text-center p-4 bg-light-background rounded-xl shadow-sm border border-gray-50">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mb-1" />
                    <p className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">Completion</p>
                    <h4 className="text-lg font-bold text-primary-text mt-1">
                      {questions.length > 0 ? Math.round((sessionResults.length / questions.length) * 100) : 0}%
                    </h4>
                  </div>

                  <div className="flex flex-col justify-center items-center text-center p-4 bg-light-background rounded-xl shadow-sm border border-gray-50">
                    <RefreshCw className="w-6 h-6 text-primary-orange mb-1" />
                    <p className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">Time Taken</p>
                    <h4 className="text-lg font-bold text-primary-text mt-1">
                      {timeTaken >= 60 ? `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s` : `${timeTaken}s`}
                    </h4>
                  </div>
                </div>
              );
            })()}

            {overallFeedback && (
              <div className="bg-gradient-to-br from-input-background to-purple-50/50 p-6 rounded-2xl border border-orange-border/50 shadow-sm space-y-2">
                <h4 className="text-base font-bold text-hover-orange flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-orange animate-pulse" />
                  Overall AI Assessment Feedback Summary
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed font-medium italic">
                  "{overallFeedback}"
                </p>
              </div>
            )}

            {/* Question-wise results breakdown */}
            <div className="space-y-4 pt-4">
              <h4 className="text-lg font-bold text-primary-text flex items-center gap-2">
                <BookOpen className="text-primary-orange w-5 h-5" />
                Question-Wise Report Breakdown
              </h4>
              
              {sessionResults.map((result, idx) => {
                const isExpanded = expandedQuestions[idx];
                return (
                  <div key={idx} className="border border-gray-100 rounded-2xl bg-light-background overflow-hidden shadow-sm">
                    {/* Header Row */}
                    <div 
                      onClick={() => toggleQuestionExpand(idx)}
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-light-background/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 pr-4">
                        <span className="text-xs font-bold text-primary-orange bg-input-background px-2.5 py-1 rounded-full font-sans whitespace-nowrap">
                          Q {idx + 1}
                        </span>
                        <h5 className="text-sm font-bold text-primary-text line-clamp-1">{result.question}</h5>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                          result.score >= 8 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : result.score >= 5 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          Score: {result.score}/10
                        </span>
                        <div className="text-secondary-text">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>
                    
                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="p-5 pt-2 border-t border-gray-50 bg-light-background/30 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-secondary-text uppercase tracking-wider mb-1">Your Answer</p>
                          <p className="text-sm text-gray-700 bg-light-background p-3 rounded-lg border border-gray-100 italic">"{result.answer}"</p>
                        </div>
                        <div className="bg-input-background p-4 rounded-xl border border-input-background text-sm text-gray-700">
                          <p className="font-semibold text-xs text-primary-orange uppercase tracking-wider mb-1.5">AI Evaluation Feedback</p>
                          <p className="leading-relaxed font-medium">{result.feedback}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="pt-6 border-t border-gray-100 flex justify-center">
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-button-orange text-white font-semibold rounded-xl hover:bg-hover-orange transition-all flex items-center gap-2 shadow-md hover:scale-105"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Start New Assessment</span>
              </button>
            </div>
          </div>
        )}

        {/* Scenario 4: Non-Receiver personas – All Assessment Results Dashboard */}
        {(isSME || isViewer) && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-primary-text">
                  Knowledge Receivers Assessment Results
                </h3>
                <p className="text-sm text-secondary-text mt-1">
                  View scores, overall evaluations, and detail breakdowns of conversational assessments taken by Knowledge Receivers.
                </p>
              </div>
            </div>

            {groupedAttempts.length > 0 ? (
              <div className="flex flex-col space-y-4">
                {groupedAttempts.map((attempt, idx) => {
                  const planName = plans.find(p => p.id.toString() === selectedPlanId.toString())?.application_name || 'Knowledge Transfer Plan';
                  const isExpanded = expandedAssessments[idx];
                  
                  return (
                    <div key={idx} className="bg-light-background rounded-2xl border border-gray-150 shadow-sm hover:shadow-md hover:border-light-border transition-all flex flex-col overflow-hidden">
                      {/* Header Row (Always visible) */}
                      <div 
                        onClick={() => toggleAssessmentExpand(idx)}
                        className="flex justify-between items-center p-4 cursor-pointer hover:bg-light-background/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] font-bold text-primary-orange bg-input-background px-2.5 py-1 rounded-full uppercase tracking-wider font-sans w-fit">
                              {planName}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <h4 className="text-base font-bold text-primary-text">
                                Receiver: {attempt.stakeholder_name}
                              </h4>
                              {attempt.assessment_type === 'day_wise' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-input-background text-hover-orange border border-orange-border">
                                  Day-wise: {attempt.day_label || 'Daily'} (Optional)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Final Assessment (Mandatory)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 ml-4">
                          {/* Minimal Score display when collapsed or expanded */}
                          <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">Score</span>
                            <span className={`text-sm font-extrabold ${
                              attempt.overall_score >= 40 
                                ? 'text-green-600' 
                                : attempt.overall_score >= 25 
                                  ? 'text-amber-600' 
                                  : 'text-red-600'
                            }`}>
                              {Math.round(attempt.overall_score)} / 50
                            </span>
                          </div>
                          <div className="p-1.5 bg-light-background rounded-full text-secondary-text hover:text-secondary-text">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>
                      
                      {/* Collapsible Content */}
                      {isExpanded && (() => {
                        const attemptCoveredTopics = parseCoveredTopics(attempt.covered_topics);
                        return (
                          <div className="p-6 border-t border-gray-100 flex flex-col space-y-4 bg-light-background/30">
                            {/* Snapshot of Completed Topics Covered at Assessment time */}
                            {attemptCoveredTopics.length > 0 && (
                              <div className="bg-light-background p-4 rounded-xl border border-gray-100 text-sm">
                                <span className="font-bold text-gray-700 block mb-2 text-xs uppercase tracking-wider">
                                  Topics Covered During Assessment ({attemptCoveredTopics.length})
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {attemptCoveredTopics.map((topic, i) => (
                                    <span key={i} className="px-2.5 py-1 bg-input-background border border-orange-border rounded-md text-hover-orange font-medium text-xs">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Performance Feedback */}
                            <div className="bg-input-background p-4 rounded-xl border border-input-background">
                              <span className="text-[10px] font-bold text-button-orange uppercase tracking-wider block mb-1.5">Overall Performance Feedback</span>
                              <p className="text-sm text-gray-700 leading-relaxed italic font-medium">
                                "{attempt.feedback}"
                              </p>
                            </div>

                            {/* Metrics Summary panel */}
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-3 bg-light-background border border-gray-100 rounded-xl shadow-sm">
                                <span className="text-[10px] text-secondary-text block font-semibold uppercase tracking-wider">Attempted</span>
                                <span className="text-sm font-bold text-gray-700 mt-1 block">5 / 5 Qs</span>
                              </div>
                              <div className="p-3 bg-light-background border border-gray-100 rounded-xl shadow-sm">
                                <span className="text-[10px] text-secondary-text block font-semibold uppercase tracking-wider">Completion</span>
                                <span className="text-sm font-bold text-gray-700 mt-1 block">100%</span>
                              </div>
                              <div className="p-3 bg-light-background border border-gray-100 rounded-xl shadow-sm">
                                <span className="text-[10px] text-secondary-text block font-semibold uppercase tracking-wider">Date</span>
                                <span className="text-sm font-bold text-gray-700 mt-1 block">
                                  {new Date(attempt.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                              <button
                                onClick={() => handleViewDetails(attempt)}
                                className="px-5 py-2.5 bg-button-orange text-white hover:bg-hover-orange font-bold rounded-xl transition-all text-sm shadow-md flex items-center gap-2"
                              >
                                <Award className="w-4 h-4" />
                                View Full Report
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-light-background rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-light-background rounded-full text-secondary-text shadow-inner">
                  <Award className="w-12 h-12 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-primary-text">
                    {!selectedPlanId ? "Please Select a Knowledge Plan" : "No Assessment Results Found"}
                  </h4>
                  <p className="text-sm text-secondary-text mt-1 max-w-sm mx-auto">
                    {!selectedPlanId
                      ? "Select a Knowledge Plan from the dropdown above to view Knowledge Receivers' assessment results."
                      : "There are no completed assessments for this Knowledge plan yet."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Previous Assessment Attempts List Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-light-background rounded-2xl shadow-xl border border-gray-100 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-light-background/50">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-xl font-bold text-primary-text flex items-center gap-2">
                    <Award className="text-primary-orange w-6 h-6" />
                    {isReceiver ? 'Latest 5 Assessment Results' : 'Assessment Results History'}
                  </h3>
                  {isReceiver && (
                    <p className="text-xs text-secondary-text ml-8 font-medium">
                      Showing your most recent {groupedAttempts.length > 0 ? groupedAttempts.length : ''} assessment attempt{groupedAttempts.length !== 1 ? 's' : ''} for this plan
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="text-secondary-text hover:text-secondary-text transition-colors text-2xl font-semibold leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {historyLoading ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-10 h-10 text-primary-orange animate-spin" />
                    <span className="text-sm text-secondary-text font-medium">Fetching your assessment history...</span>
                  </div>
                ) : groupedAttempts.length > 0 ? (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-light-background shadow-inner">
                    {groupedAttempts.map((attempt, idx) => {
                      const attemptCoveredTopics = parseCoveredTopics(attempt.covered_topics);
                      return (
                        <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-input-background px-6 rounded-none transition-all">
                          <div className="space-y-1 flex-1">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-primary-text">
                                  Assessment Date: {new Date(attempt.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </p>
                                {attempt.assessment_type === 'day_wise' ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-input-background text-hover-orange border border-orange-border">
                                    Day-wise: {attempt.day_label || 'Daily'} (Optional)
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Final Assessment (Mandatory)
                                  </span>
                                )}
                              </div>
                              <span className="px-3 py-1 bg-input-background text-hover-orange rounded-full text-xs font-bold border border-orange-border shadow-sm">
                                Score: {Math.round(attempt.overall_score)} / 50
                              </span>
                            </div>
                            <p className="text-xs text-secondary-text line-clamp-2 mt-1 leading-relaxed italic">
                              "{attempt.feedback}"
                            </p>
                            {attemptCoveredTopics.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                <span className="text-[10px] font-bold text-secondary-text uppercase tracking-wider mr-1 self-center">Covered ({attemptCoveredTopics.length}):</span>
                                {attemptCoveredTopics.map((topic, ti) => (
                                  <span key={ti} className="px-2 py-0.5 bg-input-background text-hover-orange rounded text-[11px] font-medium border border-orange-border">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleViewDetails(attempt)}
                            className="px-4 py-2 bg-input-background text-primary-orange hover:bg-orange-border font-bold rounded-xl transition-all text-xs flex-shrink-0 shadow-sm border border-orange-border h-fit self-center"
                          >
                            View Details
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 px-4 flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-light-background rounded-full text-secondary-text shadow-inner">
                      <Award className="w-12 h-12 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-primary-text">No Assessment History Found</h4>
                      <p className="text-sm text-secondary-text mt-1 max-w-sm mx-auto">
                        Complete your first assessment to see your previous attempts here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 flex justify-end bg-light-background/50">
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-5 py-2 bg-input-background text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all text-sm shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Assessment Attempt Report Modal */}
        {selectedAttempt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-light-background rounded-2xl shadow-2xl border border-gray-150 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-light-background/50">
                <h3 className="text-xl font-bold text-primary-text flex items-center gap-2">
                  <CheckCircle2 className="text-green-500 w-6 h-6" />
                  Assessment Report Details
                </h3>
                <button 
                  onClick={() => {
                    setSelectedAttempt(null);
                    setAttemptQuestions([]);
                  }}
                  className="text-secondary-text hover:text-secondary-text transition-colors text-2xl font-semibold leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {/* Report Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-light-background/30">
                {attemptDetailsLoading ? (
                  <div className="text-center py-24 flex flex-col items-center justify-center space-y-3 bg-light-background rounded-2xl border border-gray-100 shadow-sm">
                    <RefreshCw className="w-10 h-10 text-primary-orange animate-spin" />
                    <span className="text-sm text-secondary-text font-medium">Loading session breakdown...</span>
                  </div>
                ) : (
                  <>
                    {/* Overall Summary Card */}
                    <div className="bg-gradient-to-br from-input-background to-purple-50 p-6 rounded-2xl border border-orange-border shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-primary-orange bg-orange-border px-2.5 py-1 rounded-full uppercase tracking-wider font-sans">
                            Overall Summary
                          </span>
                          <h4 className="text-sm font-semibold text-primary-text">
                            Candidate: {selectedAttempt.stakeholder_name || user?.name || 'Receiver'}
                          </h4>
                          <p className="text-xs text-secondary-text">
                            Completed on: {new Date(selectedAttempt.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="bg-light-background px-5 py-3 rounded-xl border border-orange-border text-center shadow-sm min-w-[120px]">
                          <span className="text-[9px] text-secondary-text font-bold uppercase tracking-wider block">Final Score</span>
                          <span className="text-xl font-extrabold text-primary-orange">{Math.round(selectedAttempt.overall_score)} / 50</span>
                        </div>
                      </div>
                      <div className="border-t border-orange-border/50 pt-3">
                        <span className="text-[10px] font-bold text-primary-orange uppercase tracking-wider block mb-1">Final Overall Feedback</span>
                        <p className="text-sm text-gray-700 leading-relaxed italic">
                          "{selectedAttempt.feedback}"
                        </p>
                      </div>
                    </div>

                    {/* Snapshot of Covered Topics during this Assessment */}
                    {(() => {
                      const reportCoveredTopics = parseCoveredTopics(selectedAttempt.covered_topics);
                      return reportCoveredTopics.length > 0 ? (
                        <div className="bg-light-background p-4 rounded-2xl border border-orange-border shadow-sm text-sm">
                          <span className="font-bold text-hover-orange block mb-2 text-xs uppercase tracking-wider">
                            Topics Covered During This Assessment ({reportCoveredTopics.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {reportCoveredTopics.map((topic, i) => (
                              <span key={i} className="px-3 py-1 bg-input-background border border-orange-border rounded-lg text-hover-orange font-medium text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Question-wise results breakdown */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-base font-bold text-primary-text flex items-center gap-2">
                        <BookOpen className="text-primary-orange w-5 h-5" />
                        Question-by-Question Breakdown
                      </h4>
                      
                      {attemptQuestions.map((result, idx) => {
                        const isExpanded = expandedAttemptQuestions[idx];
                        return (
                          <div key={idx} className="border border-gray-100 rounded-2xl bg-light-background shadow-sm overflow-hidden">
                            <div 
                              onClick={() => toggleAttemptQuestionExpand(idx)}
                              className="p-4 flex justify-between items-center cursor-pointer hover:bg-light-background/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 pr-4">
                                <span className="text-xs font-bold text-primary-orange bg-input-background px-2.5 py-1 rounded-full font-sans whitespace-nowrap">
                                  Q {idx + 1}
                                </span>
                                <h5 className="text-sm font-bold text-primary-text line-clamp-1">{result.question}</h5>
                              </div>
                              <div className="text-secondary-text flex-shrink-0">
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="p-5 pt-2 border-t border-gray-50 bg-light-background/30">
                                <p className="text-[10px] font-bold text-secondary-text uppercase tracking-wider mb-1">Answer</p>
                                <p className="text-sm text-gray-700 bg-light-background p-3 rounded-lg border border-gray-100 italic">"{result.answer}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 flex justify-between bg-light-background/50">
                <button
                  onClick={() => {
                    setSelectedAttempt(null);
                    setAttemptQuestions([]);
                  }}
                  className="px-5 py-2 bg-input-background text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all text-sm shadow-sm"
                >
                  Back to History
                </button>
                <button
                  onClick={() => {
                    setSelectedAttempt(null);
                    setAttemptQuestions([]);
                    setIsHistoryModalOpen(false);
                  }}
                  className="px-5 py-2 bg-button-orange text-white font-semibold rounded-xl hover:bg-hover-orange transition-all text-sm shadow-sm"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}
      {/* Sleek Popup Modal / Toast Component */}
      {toastModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sidebar/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-light-background rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 flex flex-col space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  toastModal.type === 'error' ? 'bg-red-100 text-red-600' :
                  toastModal.type === 'info' ? 'bg-input-background text-primary-orange' : 'bg-amber-100 text-amber-600'
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary-text">
                    {toastModal.title || 'Notice'}
                  </h3>
                  <p className="text-xs text-secondary-text font-medium">Final Assessment Notification</p>
                </div>
              </div>
              <button
                onClick={() => setToastModal({ isOpen: false, title: '', message: '', type: 'warning' })}
                className="text-secondary-text hover:text-secondary-text p-1.5 rounded-xl hover:bg-input-background transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-4 rounded-xl border border-amber-200/80">
              <p className="text-xs font-semibold text-primary-text leading-relaxed">
                {toastModal.message}
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setToastModal({ isOpen: false, title: '', message: '', type: 'warning' })}
                className="px-5 py-2 bg-button-orange hover:bg-hover-orange text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default AssessmentPage;
