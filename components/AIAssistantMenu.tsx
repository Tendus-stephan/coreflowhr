import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, Sparkles, Command, ChevronDown, Zap, Loader2 } from 'lucide-react';
import { useSourcing } from '../contexts/SourcingContext';
import { getAIChatResponse, ChatMessage } from '../services/geminiService';

export const AIAssistantMenu: React.FC = () => {
  const { isSourcing, sourcingProgress } = useSourcing();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'CoreFlow AI system initialized. How can I help you with recruitment today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastRequestTime = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 3000; // 3 seconds minimum between requests

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Rate limiting: enforce minimum time between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: `Please wait ${Math.ceil(waitTime / 1000)} seconds before sending another message. This helps prevent rate limit errors.` 
      }]);
      return;
    }
    
    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    lastRequestTime.current = Date.now();

    try {
      const aiText = await getAIChatResponse(text, messages);
      // getAIChatResponse returns error messages as strings for quota/API errors
      // So we always add it as a message (it will be the error message if there was an error)
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      // If getAIChatResponse throws (unexpected error), show generic message
      // Otherwise, it returns the error message as a string
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: error?.message || 'I apologize, but I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentage = sourcingProgress.total > 0 
    ? (sourcingProgress.current / sourcingProgress.total) * 100 
    : 0;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4" style={{ pointerEvents: 'none' }}>
      
      {/* Chat Panel */}
      <div 
        className={`w-[340px] h-[450px] max-h-[calc(100vh-120px)] bg-white border border-gray-200 rounded-[28px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] origin-bottom-right ${
          isOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
        }`}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shadow-md">
              <Command size={16} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-wider">CoreFlow AI</h3>
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                  {isSourcing ? `Sourcing ${sourcingProgress.current}/${sourcingProgress.total}` : 'Active'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
            title="Minimize"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Sourcing Progress Banner (if active) */}
        {isSourcing && (
          <div className="px-5 py-2 border-b border-blue-100 bg-blue-50/50 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-blue-900 uppercase tracking-wider">
                Sourcing in progress
              </span>
              <span className="text-[9px] font-black text-blue-900">
                {sourcingProgress.current} / {sourcingProgress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#fafafb]/40 scrollbar-hide"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed ${
                m.role === 'user' 
                ? 'bg-black text-white rounded-[18px] rounded-tr-none shadow-sm font-medium' 
                : 'bg-white text-gray-800 rounded-[18px] rounded-tl-none border border-gray-100 shadow-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-[18px] rounded-tl-none border border-gray-100 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:200ms]"></span>
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:400ms]"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <div className="relative flex items-center gap-2.5 bg-gray-50 px-3.5 py-1 rounded-xl border border-gray-200 focus-within:border-indigo-500/40 focus-within:bg-white transition-all duration-300">
            <Zap size={13} className="text-gray-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask me anything about recruitment..."
              className="flex-1 bg-transparent border-none outline-none text-[12px] text-gray-900 placeholder:text-gray-400 py-2"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="w-7 h-7 flex items-center justify-center bg-black text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 disabled:opacity-20 transition-all flex-shrink-0"
            >
              <Send size={12} />
            </button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.4em]">CoreFlow v3.0</span>
          </div>
        </div>
      </div>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center justify-center w-14 h-14 rounded-[20px] bg-black shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isOpen ? 'rotate-90 scale-90' : 'hover:scale-110'
        }`}
        style={{ pointerEvents: 'auto' }}
        title="Open AI Assistant"
      >
        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-tr from-indigo-500/20 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {isOpen ? (
          <X size={20} className="text-white" />
        ) : (
          <>
            {isSourcing ? (
              <Loader2 size={20} className="text-white animate-spin" />
            ) : (
              <Sparkles size={20} className="text-white animate-pulse" />
            )}
            {isSourcing && sourcingProgress.current > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm">
                {sourcingProgress.current}
              </span>
            )}
          </>
        )}
        
        {/* Border Accents */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-white/20"></div>
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-white/20"></div>
      </button>
    </div>,
    document.body
  );
};