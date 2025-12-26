
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './components/Onboarding/Onboarding';

const DashboardPlaceholder: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
    <div className="bg-white p-12 rounded-[2rem] shadow-xl border border-slate-100 max-w-2xl w-full text-center space-y-6">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <Rocket className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome to CoreFlow</h1>
      <p className="text-lg text-slate-500 leading-relaxed">
        Your environment is ready. Start by posting your first job or importing candidates.
      </p>
      <div className="pt-6">
        <button 
          onClick={() => window.location.hash = '/onboarding'}
          className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200"
        >
          Restart Tutorial
        </button>
      </div>
    </div>
  </div>
);

import { Rocket } from 'lucide-react';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
