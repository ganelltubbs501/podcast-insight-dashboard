import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Minimize2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getStoredUser } from '../services/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  time: string;
}

interface LiveChatWidgetProps {
  transcriptData?: any;
}

const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({ transcriptData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: 'Hi there! 👋 How can I help you with your podcast today?', sender: 'agent', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    setMessages(prev => [...prev, userMsg]);
    const userMessage = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      // Get current user for context
      const user = await getStoredUser();

      // Build page context
      const pageContext = {
        currentPage: location.pathname,
        transcriptData: transcriptData || null,
        userData: user ? { name: user.name, email: user.email } : null
      };

      // Call AI chat API
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
          pageContext
        })
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();

      // Update conversation history for context
      const newHistory = [
        ...conversationHistory,
        { role: 'user' as const, parts: [{ text: userMessage }] },
        { role: 'model' as const, parts: [{ text: data.response }] }
      ];
      setConversationHistory(newHistory);

      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'agent',
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please make sure the backend server is running and try again.",
        sender: 'agent',
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-gray-100 w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl border border-gray-300 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          {/* Header */}
          <div className="bg-primary p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                   <User className="h-6 w-6 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-primary"></div>
              </div>
              <div>
                <h3 className="font-bold text-sm">Support Agent</h3>
                <p className="text-xs text-primary">Typically replies instantly</p>
              </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition">
                    <Minimize2 className="h-4 w-4" />
                </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-100 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-primary text-white rounded-br-none' 
                      : 'bg-gray-100 text-textBody border border-gray-300 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-primary text-right' : 'text-textMuted'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-300 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-gray-100 border-t border-gray-300 flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="bg-primary text-white p-2 rounded-full hover:bg-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary hover:scale-105 transition flex items-center justify-center z-50"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
      </button>
    </div>
  );
};

export default LiveChatWidget;