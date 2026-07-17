import React, { useState, useEffect, useRef } from 'react';
import { askChatbot, getChatHistory, getPlans } from '../api/api';
import { Send, Bot, User } from 'lucide-react';

const ChatbotPage = () => {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const key = `chatbot_session_id_${selectedPlanId || 'general'}`;
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(key, sid);
    }
    setSessionId(sid);
    
    const fetchHistory = async () => {
      try {
        const res = await getChatHistory(sid);
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
  }, [selectedPlanId]);

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
    if (!input.trim() || !sessionId) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    
    try {
      const planIdToPass = selectedPlanId || null;
      const res = await askChatbot(sessionId, userMsg, planIdToPass);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error answering your question.' }]);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanName = plans.find(p => p.id.toString() === selectedPlanId)?.application_name;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Bot className="text-blue-500 mr-3" size={24} />
          <div>
            <h2 className="text-lg font-bold text-gray-800">KT Assistant</h2>
            <p className="text-xs text-gray-500">
              {selectedPlanId ? `Answering with knowledge from: ${selectedPlanName}` : 'Ask questions about KT plans, risks, and progress.'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 font-medium">Context:</span>
          <select
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            <option value="">All Plans / General</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.application_name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <Bot size={48} className="mx-auto mb-4 opacity-50" />
            <p>Hello! I'm your AI assistant. Ask me anything about the KT process.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-gray-200 mr-3'}`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-gray-600" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex max-w-[75%] flex-row">
              <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gray-200 mr-3">
                <Bot size={16} className="text-gray-600" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 rounded-tl-none flex items-center space-x-1">
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
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatbotPage;
