
import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, X, Sparkles, Command, History, ChevronDown } from 'lucide-react';
import { getAIResponse } from '../services/geminiService';
import { Message } from '../types';

export const AIChatPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'CoreFlow AI system initialized. Awaiting commands.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiText = await getAIResponse(text, messages);
    setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      
      {/* Defined Dropup Panel - Compacted */}
      <div 
        className={`w-[340px] h-[450px] max-h-[calc(100vh-120px)] bg-white border border-gray-200 rounded-[28px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] origin-bottom-right ${
          isOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
        }`}
      >
        {/* Header - More Compact Padding */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shadow-md">
              <Command size={16} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Neural Agent</h3>
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Active Link</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">
              <History size={14} />
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Chat Stream - Adjusted padding */}
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

        {/* Defined Compact Input - Scaled down slightly */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="relative flex items-center gap-2.5 bg-gray-50 px-3.5 py-1 rounded-xl border border-gray-200 focus-within:border-indigo-500/40 focus-within:bg-white transition-all duration-300">
            <Zap size={13} className="text-gray-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Command..."
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
            <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.4em]">CoreFlow v3.0 Compact</span>
          </div>
        </div>
      </div>

      {/* The Defined FAB (Floating Action Button) - Scaled down to 14 from 16 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center justify-center w-14 h-14 rounded-[20px] bg-black shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isOpen ? 'rotate-90 scale-90' : 'hover:scale-110'
        }`}
      >
        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-tr from-indigo-500/20 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {isOpen ? (
          <X size={20} className="text-white" />
        ) : (
          <Sparkles size={20} className="text-white animate-pulse" />
        )}
        
        {/* Defined Border Accents */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-white/20"></div>
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-white/20"></div>
      </button>
    </div>
  );
};
