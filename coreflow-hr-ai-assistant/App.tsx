
import React, { useState, useEffect } from 'react';
import { AIChatPanel } from './components/AIChatPanel';
import { CoreLoader } from './components/CoreLoader';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate an elegant system initialization delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white selection:bg-indigo-100">
      {loading && <CoreLoader />}

      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50 rounded-full blur-[140px]"></div>
      </div>

      {/* Main Page Content (Placeholder) */}
      <div className={`relative z-10 flex flex-col p-12 max-w-4xl transition-all duration-1000 ${loading ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic mb-2">
            CoreFlow <span className="text-indigo-600 font-normal">v3.0</span>
          </h1>
          <p className="text-gray-400 font-medium tracking-tight text-lg">Next-generation recruitment workflow.</p>
        </header>
        
        <div className="grid grid-cols-2 gap-6 opacity-20 grayscale pointer-events-none">
          <div className="h-40 bg-gray-100 rounded-3xl border border-gray-200"></div>
          <div className="h-40 bg-gray-100 rounded-3xl border border-gray-200"></div>
          <div className="h-80 col-span-2 bg-gray-100 rounded-3xl border border-gray-200"></div>
        </div>
      </div>

      {/* The AI Action Dropup */}
      <AIChatPanel />

      <div className="fixed bottom-6 left-10 text-[9px] font-bold text-gray-300 uppercase tracking-[0.4em] pointer-events-none">
        Neural Node Active • Session ID: CF-992
      </div>
    </div>
  );
};

export default App;
