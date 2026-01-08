import React from 'react';

export const CoreLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center animate-out fade-out duration-1000 fill-mode-forwards">
      <div className="relative flex flex-col items-center">
        {/* Minimal Animated Ring */}
        <div className="absolute -inset-12 border border-indigo-50/50 rounded-full animate-[ping_3s_linear_infinite]"></div>
        <div className="absolute -inset-8 border border-indigo-100/30 rounded-full animate-[ping_2s_linear_infinite]"></div>
        
        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <img 
            src="/assets/images/coreflow-logo.png" 
            alt="CoreFlow HR" 
            className="object-contain"
            style={{ 
              height: '180px',
              width: 'auto',
              maxWidth: '600px'
            }}
          />
          
          {/* Elegant Progress Line */}
          <div className="w-24 h-[2px] bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-black w-full -translate-x-full animate-[loading_1.5s_ease-in-out_infinite]"></div>
          </div>
          
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.5em] mt-2 animate-pulse">
            Initializing System
          </span>
        </div>
      </div>
    </div>
  );
};
