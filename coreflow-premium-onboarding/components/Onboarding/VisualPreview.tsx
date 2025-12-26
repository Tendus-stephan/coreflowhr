
import React from 'react';

interface VisualPreviewProps {
  label: string;
  color: string;
  slideId: number;
}

const VisualPreview: React.FC<VisualPreviewProps> = ({ label, color, slideId }) => {
  const accentColorClass = {
    indigo: 'bg-indigo-500',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
    cyan: 'bg-cyan-500',
    slate: 'bg-slate-500'
  }[color] || 'bg-slate-500';

  const accentBorderClass = {
    indigo: 'border-indigo-500/30',
    blue: 'border-blue-500/30',
    emerald: 'border-emerald-500/30',
    amber: 'border-amber-500/30',
    rose: 'border-rose-500/30',
    violet: 'border-violet-500/30',
    cyan: 'border-cyan-500/30',
    slate: 'border-slate-500/30'
  }[color] || 'border-slate-500/30';

  return (
    <div className="relative w-full aspect-[4/3] bg-zinc-950 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 overflow-hidden group">
      {/* Decorative Blur */}
      <div className={`absolute -top-1/2 -right-1/2 w-full h-full ${accentColorClass} blur-[120px] opacity-10 transition-colors duration-700`}></div>

      {/* Browser Bar */}
      <div className="flex items-center gap-1.5 mb-8">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/30"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30"></div>
        <div className="h-2 w-32 bg-white/5 rounded-full ml-4"></div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Sidebar Mock */}
        <div className="col-span-3 space-y-4">
          <div className="h-8 w-full bg-white/10 rounded-xl"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-1.5 w-full bg-white/${slideId === i ? '40' : '5'} rounded-full transition-all`}></div>
            ))}
          </div>
        </div>

        {/* Content Mock */}
        <div className="col-span-9 space-y-6">
          <div className="flex justify-between items-center">
             <div className="h-4 w-40 bg-white/20 rounded-full"></div>
             <div className={`h-10 w-10 ${accentColorClass} opacity-20 rounded-xl flex items-center justify-center border ${accentBorderClass}`}>
                <div className={`w-3 h-3 rounded-full ${accentColorClass.replace('bg-', 'bg-')}`}></div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="h-28 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className={`absolute bottom-3 right-3 h-1 w-12 bg-white/20 rounded-full`}></div>
             </div>
             <div className="h-28 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className={`absolute bottom-3 right-3 h-1 w-12 bg-white/20 rounded-full`}></div>
             </div>
          </div>

          <div className="space-y-3">
             <div className="h-1.5 w-full bg-white/5 rounded-full"></div>
             <div className="h-1.5 w-full bg-white/5 rounded-full"></div>
             <div className="h-1.5 w-3/4 bg-white/5 rounded-full"></div>
          </div>
          
          {/* Central Overlay Label */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 bg-white/10 backdrop-blur-xl px-10 py-5 rounded-3xl border border-white/20 shadow-2xl transition-all group-hover:rotate-0 group-hover:scale-110 duration-500 pointer-events-none">
             <span className="text-white font-black tracking-[0.2em] text-xl opacity-90">{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualPreview;
