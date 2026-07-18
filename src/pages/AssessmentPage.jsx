import React, { useState, useEffect, useRef } from 'react';
import { getPlans, getStakeholders, getMeetings, generateQuestions, submitAnswer, getResults, getPlanTopics, completeAssessment, getAttemptDetails } from '../api/api';
import Loader from '../components/Loader';
import { FileQuestion, CheckCircle2, RefreshCw, Award, Sparkles, User, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


const AssessmentPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [meetings, setMeetings] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
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
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [plansRes, stRes, meetingsRes] = await Promise.all([getPlans(), getStakeholders(), getMeetings()]);
        const appPlans = plansRes.data.data.filter(p => p.status === 'approved');
        const stList = stRes.data.data;

        setPlans(appPlans);
        setStakeholders(stList);
        setMeetings(meetingsRes.data.data || []);
        
        if (appPlans.length > 0) {
          const defaultPlanId = appPlans[0].id.toString();
          setSelectedPlanId(defaultPlanId);
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
    if (selectedPlanId && stakeholders.length > 0 && user?.email) {
      setCurrentQuestionIndex(-1);
      setChatMessages([]);
      setSessionResults([]);
      setAssessmentCompleted(false);
      setCurrentAnswer('');
      
      fetchResults(selectedPlanId, null, stakeholders);
      
      const checkCompletedTopics = async () => {
        try {
          const res = await getPlanTopics(selectedPlanId);
          const topics = res.data.data || [];
          const completedList = topics.filter(t => t.completion_percent === 100).map(t => t.topic);
          setCompletedTopics(completedList);
          const hasCompleted = completedList.length > 0;
          setHasCompletedTopics(hasCompleted);
          if (!hasCompleted) {
            setWarningMsg("No KT topics are available for assessment yet.");
            setQuestions([]);
          } else {
            setWarningMsg('');
          }
        } catch (err) {
          console.error(err);
        }
      };
      checkCompletedTopics();
    }
  }, [selectedPlanId, stakeholders, user]);

  const fetchResults = async (planId = selectedPlanId, stakeholderId = null, stList = stakeholders, limit = undefined) => {
    try {
      const resolvedPlanId = planId;
      if (!resolvedPlanId) return;

      const resolvedStakeholderId = stakeholderId || user?.stakeholder_id || stList.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())?.id;

      console.log("[DEV LOG] Current User Email:", user?.email);
      console.log("[DEV LOG] Current Stakeholder ID:", resolvedStakeholderId);
      console.log("[DEV LOG] Selected Plan ID:", resolvedPlanId);
      console.log("[DEV LOG] Assessment API Request - planId:", resolvedPlanId, "stakeholderId:", resolvedStakeholderId, "limit:", limit);
      
      const res = await getResults(resolvedPlanId, resolvedStakeholderId, limit);
      const allResults = res.data.data || [];
      
      console.log("[DEV LOG] Assessment API Response:", allResults);
      console.log("[DEV LOG] Raw Results Length:", allResults.length);

      let filteredResults = allResults;
      if (user?.role === 'Incoming Team Member (Knowledge Receiver)') {
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

  const handleGenerateQuestions = async () => {
    if (!selectedPlanId) return;
    setGenerating(true);
    try {
      const res = await generateQuestions(selectedPlanId);
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
      alert(msg);
      setWarningMsg(msg);
    } finally {
      setGenerating(false);
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

        const compRes = await completeAssessment({
          asid: currentAsid,
          plan_id: selectedPlanId,
          stakeholder_id: stakeholderId,
          // All session scores collected in React state — sent to backend for averaging
          // (scores are no longer persisted in the assessments table)
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
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileQuestion className="mr-3 text-indigo-600 w-8 h-8" />
          {isReceiver ? 'Conversational Assessments' : 'Assessment Results'}
        </h2>
        {user && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <User className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold">{user.name}</span>
          </div>
        )}
      </div>

      {/* Plan Selector & Generate Button Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Knowledge Plan</label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-800 text-sm"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              disabled={currentQuestionIndex >= 0 && !assessmentCompleted}
            >
              {plans.map(p => <option key={p.id} value={p.id}>{p.application_name}</option>)}
            </select>
          </div>
          
          {canSetup && (
            <button
              onClick={handleGenerateQuestions}
              disabled={generating || !hasCompletedTopics || (currentQuestionIndex >= 0 && !assessmentCompleted)}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md text-sm"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          )}
        </div>
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
          <div className="relative max-w-4xl mx-auto w-full bg-gradient-to-br from-indigo-50 to-purple-50 p-10 md:p-12 rounded-3xl border border-indigo-100 flex flex-col justify-center items-center text-center space-y-6 min-h-[420px] shadow-sm">
            {/* View Assessment Results Button placed near the top-right of the setup section */}
            <div className="absolute top-6 right-6">
              <button
                onClick={handleOpenHistory}
                disabled={historyLoading}
                className="px-4 py-2 bg-white text-indigo-600 font-semibold border border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="p-5 bg-white rounded-full shadow-md text-indigo-600">
              <FileQuestion className="w-14 h-14" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {canSetup ? "Ready to Start Your Assessment?" : "Conversational Assessment Overview"}
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto text-sm leading-relaxed">
                {canSetup 
                  ? "Click the Generate Questions button above to launch an interactive, conversational assessment. The AI will evaluate your answers topic by topic."
                  : "Review historical conversational assessment scores and evaluation feedback completed by the incoming team members."
                }
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-gray-600 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Completed Topics Only
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                <Sparkles className="w-4 h-4" /> AI Conversational Scoring
              </div>
            </div>
          </div>
        )}

        {/* Scenario 2: Active Chat Assessment Flow */}
        {isReceiver && currentQuestionIndex >= 0 && !assessmentCompleted && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
            {/* Header progress bar */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-bold">
                  {questions.length > 0 ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
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
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm border ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-50 text-indigo-955 border-indigo-100 rounded-tr-none font-medium' 
                      : 'bg-white text-gray-800 border-gray-200 rounded-tl-none font-medium'
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
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="bg-white text-gray-800 border border-gray-200 max-w-[70%] p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-3">
                    <div className="flex space-x-1.5 items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-xs text-gray-500 italic font-medium">Evaluating your answer...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

             {/* Answer Input Controls */}
            <div className="p-5 bg-white border-t border-gray-100 rounded-b-2xl">
              <form onSubmit={handleSubmitAnswer} className="flex flex-col gap-4">
                <textarea
                  required
                  rows="4"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  disabled={evaluationLoading}
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-800 disabled:bg-gray-100 disabled:text-gray-400 placeholder-gray-400 transition-all text-sm resize-none"
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
                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md text-sm"
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
            
            {/* Completion Header badge */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 pb-6 border-b border-gray-100">
              <div className="p-4 bg-green-50 text-green-600 rounded-full shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Assessment Completed!</h3>
                <p className="text-gray-500 text-sm max-w-md">
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-gradient-to-br from-gray-50 to-indigo-50/20 p-6 rounded-2xl border border-gray-100">
                  <div className="flex flex-col justify-center items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-50">
                    <Award className="w-6 h-6 text-indigo-600 mb-1" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Overall Score</p>
                    <h4 className="text-lg font-bold text-gray-800 mt-1">{totalScore} / {maxPossible}</h4>
                  </div>
                  
                  <div className="flex flex-col justify-center items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-50">
                    <Sparkles className="w-6 h-6 text-indigo-600 mb-1" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Average Score</p>
                    <h4 className="text-lg font-bold text-gray-800 mt-1">{avgScore.toFixed(1)} / 10</h4>
                  </div>

                  <div className="flex flex-col justify-center items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-50">
                    <BookOpen className="w-6 h-6 text-indigo-600 mb-1" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Attempted</p>
                    <h4 className="text-lg font-bold text-gray-800 mt-1">{sessionResults.length} Qs</h4>
                  </div>

                  <div className="flex flex-col justify-center items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-50">
                    <FileQuestion className="w-6 h-6 text-indigo-600 mb-1" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Questions</p>
                    <h4 className="text-lg font-bold text-gray-800 mt-1">{questions.length} Qs</h4>
                  </div>

                  <div className="flex flex-col justify-center items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-50">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mb-1" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Completion</p>
                    <h4 className="text-lg font-bold text-gray-800 mt-1">
                      {questions.length > 0 ? Math.round((sessionResults.length / questions.length) * 100) : 0}%
                    </h4>
                  </div>

                  <div className="flex flex-col justify-center items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-50">
                    <RefreshCw className="w-6 h-6 text-indigo-600 mb-1" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time Taken</p>
                    <h4 className="text-lg font-bold text-gray-800 mt-1">
                      {timeTaken >= 60 ? `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s` : `${timeTaken}s`}
                    </h4>
                  </div>
                </div>
              );
            })()}

            {overallFeedback && (
              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-6 rounded-2xl border border-indigo-100/50 shadow-sm space-y-2">
                <h4 className="text-base font-bold text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  Overall AI Assessment Feedback Summary
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed font-medium italic">
                  "{overallFeedback}"
                </p>
              </div>
            )}

            {/* Question-wise results breakdown */}
            <div className="space-y-4 pt-4">
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="text-indigo-600 w-5 h-5" />
                Question-Wise Report Breakdown
              </h4>
              
              {sessionResults.map((result, idx) => (
                <div key={idx} className="p-5 border border-gray-100 rounded-2xl bg-gray-50 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-sans">
                      Question {idx + 1}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      result.score >= 8 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : result.score >= 5 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      Score: {result.score}/10
                    </span>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-gray-800">Q: {result.question}</h5>
                    <p className="text-sm text-gray-600 mt-1 italic">Your Answer: "{result.answer}"</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 text-sm text-gray-700 shadow-inner">
                    <p className="font-semibold text-xs text-indigo-500 uppercase tracking-wider mb-1">AI Evaluation Feedback</p>
                    <p className="leading-relaxed">{result.feedback}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="pt-6 border-t border-gray-100 flex justify-center">
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md hover:scale-105"
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
                <h3 className="text-xl font-bold text-gray-900">
                  Knowledge Receivers Assessment Results
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  View scores, overall evaluations, and detail breakdowns of conversational assessments taken by Knowledge Receivers.
                </p>
              </div>
            </div>

            {groupedAttempts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupedAttempts.map((attempt, idx) => {
                  const planName = plans.find(p => p.id.toString() === selectedPlanId.toString())?.application_name || 'Knowledge Transfer Plan';
                  
                  return (
                    <div key={idx} className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex flex-col space-y-4 justify-between">
                      {/* Plan Title & Score badge */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider font-sans">
                            {planName}
                          </span>
                          <h4 className="text-base font-bold text-gray-900 mt-1.5">
                            Receiver: {attempt.stakeholder_name}
                          </h4>
                          <p className="text-xs text-gray-400">
                            {attempt.stakeholder_email}
                          </p>
                        </div>

                        {/* Overall Score Progress layout */}
                        <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl shadow-inner min-w-[90px]">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Score</span>
                          <span className={`text-lg font-extrabold block mt-0.5 ${
                            attempt.overall_score >= 40 
                              ? 'text-green-600' 
                              : attempt.overall_score >= 25 
                                ? 'text-amber-600' 
                                : 'text-red-600'
                          }`}>
                            {Math.round(attempt.overall_score)} / 50
                          </span>
                        </div>
                      </div>

                      {/* Completed Topics list */}
                      {completedTopics.length > 0 && (
                        <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100/50 text-xs">
                          <span className="font-bold text-gray-700 block mb-1.5">Completed Topics Covered:</span>
                          <ul className="list-disc pl-4 space-y-1 text-gray-600 font-medium">
                            {completedTopics.map((topic, i) => (
                              <li key={i}>{topic}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Performance Feedback */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Overall Performance Feedback</span>
                        <p className="text-sm text-gray-700 leading-relaxed italic font-medium">
                          "{attempt.feedback}"
                        </p>
                      </div>

                      {/* Metrics Summary panel */}
                      <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <span className="text-[9px] text-gray-400 block font-semibold uppercase tracking-wider">Attempted</span>
                          <span className="text-xs font-bold text-gray-700 mt-0.5 block">5 / 5 Qs</span>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <span className="text-[9px] text-gray-400 block font-semibold uppercase tracking-wider">Completion</span>
                          <span className="text-xs font-bold text-gray-700 mt-0.5 block">100%</span>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <span className="text-[9px] text-gray-400 block font-semibold uppercase tracking-wider">Overall Score</span>
                          <span className="text-xs font-bold text-gray-700 mt-0.5 block">{Math.round(attempt.overall_score)} / 50</span>
                        </div>
                      </div>

                      {/* Assessment Date & View Full Report */}
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                        <span className="text-xs text-gray-400 font-medium">
                          Date: {new Date(attempt.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          onClick={() => handleViewDetails(attempt)}
                          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-xl transition-all text-xs shadow-md"
                        >
                          View Full Report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-gray-50 rounded-full text-gray-400 shadow-inner">
                  <Award className="w-12 h-12 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-800">No Assessment Results Found</h4>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    There are no completed assessments for this Knowledge plan yet.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Previous Assessment Attempts List Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Award className="text-indigo-600 w-6 h-6" />
                    {isReceiver ? 'Latest 5 Assessment Results' : 'Assessment Results History'}
                  </h3>
                  {isReceiver && (
                    <p className="text-xs text-gray-500 ml-8 font-medium">
                      Showing your most recent {groupedAttempts.length > 0 ? groupedAttempts.length : ''} assessment attempt{groupedAttempts.length !== 1 ? 's' : ''} for this plan
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-semibold leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {historyLoading ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                    <span className="text-sm text-gray-500 font-medium">Fetching your assessment history...</span>
                  </div>
                ) : groupedAttempts.length > 0 ? (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-inner">
                    {groupedAttempts.map((attempt, idx) => {
                      return (
                        <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-indigo-50/10 px-6 rounded-none transition-all">
                          <div className="space-y-1 flex-1">
                            <div className="flex justify-between items-start gap-4">
                              <p className="text-sm font-semibold text-gray-800">
                                Assessment Date: {new Date(attempt.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </p>
                              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 shadow-sm">
                                Score: {Math.round(attempt.overall_score)} / 50
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed italic">
                              "{attempt.feedback}"
                            </p>
                          </div>
                          <button
                            onClick={() => handleViewDetails(attempt)}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-xl transition-all text-xs flex-shrink-0 shadow-sm border border-indigo-100 h-fit self-center"
                          >
                            View Details
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 px-4 flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-gray-50 rounded-full text-gray-400 shadow-inner">
                      <Award className="w-12 h-12 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-800">No Assessment History Found</h4>
                      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                        Complete your first assessment to see your previous attempts here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all text-sm shadow-sm"
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
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="text-green-500 w-6 h-6" />
                  Assessment Report Details
                </h3>
                <button 
                  onClick={() => {
                    setSelectedAttempt(null);
                    setAttemptQuestions([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-semibold leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {/* Report Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50/30">
                {attemptDetailsLoading ? (
                  <div className="text-center py-24 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                    <span className="text-sm text-gray-500 font-medium">Loading session breakdown...</span>
                  </div>
                ) : (
                  <>
                    {/* Overall Summary Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider font-sans">
                            Overall Summary
                          </span>
                          <h4 className="text-sm font-semibold text-gray-800">
                            Candidate: {selectedAttempt.stakeholder_name || user?.name || 'Receiver'}
                          </h4>
                          <p className="text-xs text-gray-400">
                            Completed on: {new Date(selectedAttempt.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="bg-white px-5 py-3 rounded-xl border border-indigo-100 text-center shadow-sm min-w-[120px]">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Final Score</span>
                          <span className="text-xl font-extrabold text-indigo-600">{Math.round(selectedAttempt.overall_score)} / 50</span>
                        </div>
                      </div>
                      <div className="border-t border-indigo-100/50 pt-3">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">Final Overall Feedback</span>
                        <p className="text-sm text-gray-700 leading-relaxed italic">
                          "{selectedAttempt.feedback}"
                        </p>
                      </div>
                    </div>

                    {/* Question-wise results breakdown */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="text-indigo-600 w-5 h-5" />
                        Question-by-Question Breakdown
                      </h4>
                      
                      {attemptQuestions.map((result, idx) => (
                        <div key={idx} className="p-5 border border-gray-100 rounded-2xl bg-white space-y-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-sans">
                              Question {idx + 1}
                            </span>
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-gray-800">Q: {result.question}</h5>
                            <p className="text-sm text-gray-600 mt-1 italic">Answer: "{result.answer}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 flex justify-between bg-gray-50/50">
                <button
                  onClick={() => {
                    setSelectedAttempt(null);
                    setAttemptQuestions([]);
                  }}
                  className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all text-sm shadow-sm"
                >
                  Back to History
                </button>
                <button
                  onClick={() => {
                    setSelectedAttempt(null);
                    setAttemptQuestions([]);
                    setIsHistoryModalOpen(false);
                  }}
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-sm"
                >
                  Close Report
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
