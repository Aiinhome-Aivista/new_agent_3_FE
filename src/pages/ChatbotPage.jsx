import React, { useState, useEffect, useRef } from 'react';
import { askChatbot, getChatHistory, askChatbot2, getChatHistory2, getPlans } from '../api/api';
import { Send, Bot, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ChatbotPage = () => {
  const { user } = useAuth();
  const isSpecialRole = user?.role === 'PwC Leadership' || user?.role === 'Delivery / Engagement Manager';
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  const messagesEndRef = useRef(null);

  const generateSessionId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    const key = `chatbot_session_id_${selectedPlanId || 'general'}`;
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = generateSessionId();
      sessionStorage.setItem(key, sid);
    }
    setSessionId(sid);
    
    const fetchHistory = async () => {
      if (!user) return;
      const userId = user.email || user.id || 'unknown_user';
      const contextId = selectedPlanId || 'general';
      try {
        const historyCall = isSpecialRole ? getChatHistory2 : getChatHistory;
        const res = await historyCall(userId, contextId);
        const history = res.data.data;
        const formatted = [];
        history.forEach(item => {
          formatted.push({ role: 'user', content: item.question });
          formatted.push({ role: 'assistant', content: item.answer });
        });
        setMessages(formatted);
      } catch (err) {
        console.error("Error fetching chat history", err);
      }
    };
    fetchHistory();
  }, [selectedPlanId, user, isSpecialRole]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await getPlans();
        const approvedPlans = res.data.data.filter(p => p.status === 'approved');
        setPlans(approvedPlans);
      } catch (err) {
        console.error("Error fetching plans", err);
      }
    };
    fetchPlans();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !sessionId || !user) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    
    try {
      const planIdToPass = selectedPlanId || null;
      const userId = user.email || user.id || 'unknown_user';
      const contextId = selectedPlanId || 'general';
      const askCall = isSpecialRole ? askChatbot2 : askChatbot;
      const res = await askCall(sessionId, userMsg, userId, contextId, planIdToPass);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error answering your question.' }]);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanName = plans.find(p => p.id.toString() === selectedPlanId)?.application_name;

  const parseMarkdown = (text) => {
    if (!text) return { __html: '' };
    let html = text.replace(/```markdown\n?/g, '').replace(/```\n?/g, '');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-md font-bold mt-2 mb-1">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-3 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-3 mb-2">$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/^\s*\-\s+(.*$)/gim, '<div class="ml-4 flex"><span class="mr-2">•</span><span>$1</span></div>');
    return { __html: html };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-light-background rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-light-background border-b border-light-border flex justify-between items-center">
        <div className="flex items-center">
          <Bot className="text-primary-orange mr-3" size={24} />
          <div>
            <h2 className="text-lg font-bold text-primary-text">KT Assistant</h2>
            <p className="text-xs text-secondary-text">
              {selectedPlanId ? `Answering with knowledge from: ${selectedPlanName}` : 'Ask questions about KT plans, risks, and progress.'}
            </p>
          </div>
        </div>
        {!isSpecialRole && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary-text font-medium">Context:</span>
            <select
              className="text-sm border border-light-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-border"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              <option value="">All Plans / General</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>{plan.application_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-secondary-text mt-20">
            <Bot size={48} className="mx-auto mb-4 opacity-50" />
            <p>Hello! I'm your AI assistant. Ask me anything about the KT process.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-primary-orange ml-3' : 'bg-input-background mr-3'}`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-secondary-text" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary-orange text-white rounded-tr-none' : 'bg-input-background text-primary-text rounded-tl-none'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div 
                    className="text-sm whitespace-pre-wrap space-y-1"
                    dangerouslySetInnerHTML={parseMarkdown(msg.content)}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex max-w-[75%] flex-row">
              <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-input-background mr-3">
                <Bot size={16} className="text-secondary-text" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-input-background text-primary-text rounded-tl-none flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-4 bg-light-background border-t border-light-border">
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-light-border rounded-full focus:outline-none focus:ring-2 focus:ring-orange-border focus:border-orange-border"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-orange text-white hover:bg-hover-orange disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatbotPage;
