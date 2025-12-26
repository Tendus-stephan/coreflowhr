
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronRight, ChevronLeft, X, CheckCircle,
    Info, HelpCircle, Sparkles, Lightbulb, ArrowRight, Rocket
} from 'lucide-react';
import { Button } from '../ui/Button';
import { slides } from '../../slidesData';
import VisualPreview from './VisualPreview';

const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [tab, setTab] = useState<'steps' | 'troubleshoot' | 'tips'>('steps');

    const handleNext = useCallback(() => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setTab('steps');
        } else {
            handleComplete();
        }
    }, [currentIndex]);

    const handleBack = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setTab('steps');
        }
    }, [currentIndex]);

    const handleComplete = () => {
        setCompleted(true);
        setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
    };

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handleBack();
            if (e.key === 'Escape') navigate('/dashboard');
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [handleNext, handleBack, navigate]);

    const slide = slides[currentIndex];
    const progress = ((currentIndex + 1) / slides.length) * 100;

    if (completed) {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
                <div className="max-w-md w-full text-center space-y-10">
                    <div className="relative mx-auto w-32 h-32">
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                        <div className="relative bg-indigo-600 rounded-full w-full h-full flex items-center justify-center shadow-2xl shadow-indigo-100">
                            <CheckCircle className="w-16 h-16 text-white" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-5xl font-black text-slate-900 tracking-tight">System Ready.</h2>
                        <p className="text-xl text-slate-500 leading-relaxed">Hang tight! We're tailoring your CoreFlow experience right now...</p>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full animate-[loading_2.5s_ease-in-out_forwards]"></div>
                    </div>
                </div>
                <style>{`
                    @keyframes loading {
                        from { width: 0%; }
                        to { width: 100%; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 lg:p-10 font-sans">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[92vh] max-h-[1000px] border border-slate-100">
                
                {/* Left Side: Dynamic Visual Showcase */}
                <div className="hidden lg:flex lg:col-span-5 bg-slate-950 flex-col p-16 relative overflow-hidden">
                    <div className="relative z-20 mb-auto">
                        <div className="flex items-center gap-3 text-white">
                            <div className="w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center shadow-xl">
                                <Rocket className="w-6 h-6" />
                            </div>
                            <span className="text-2xl font-black tracking-tight">CoreFlow</span>
                        </div>
                    </div>

                    <div className="relative z-20 my-auto scale-110">
                        <VisualPreview label={slide.visualLabel} color={slide.accentColor} slideId={slide.id} />
                    </div>

                    <div className="relative z-20 mt-auto space-y-6">
                        <div className="flex gap-2">
                             <span className="px-4 py-1.5 bg-white/10 text-white/80 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">Module {slide.id}</span>
                             <span className="px-4 py-1.5 bg-white/10 text-white/80 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">Interactive</span>
                        </div>
                        <h3 className="text-5xl font-black text-white tracking-tighter leading-none italic">{slide.subtitle}</h3>
                        <p className="text-white/40 text-lg max-w-sm font-medium leading-relaxed">
                            Master the CoreFlow interface in minutes with our guided visual tours.
                        </p>
                    </div>

                    {/* Gradient Background Blobs */}
                    <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-${slide.accentColor}-600`}></div>
                    <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-${slide.accentColor}-400`}></div>
                </div>

                {/* Right Side: Interactive Guide */}
                <div className="lg:col-span-7 flex flex-col h-full bg-white relative">
                    {/* Header */}
                    <div className="px-10 py-10 flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{slide.title}</h1>
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-12 bg-indigo-600 rounded-full"></div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tutorial Progress</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 overflow-y-auto px-10 pb-32">
                        <div className="max-w-2xl space-y-12">
                            <p className="text-2xl text-slate-500 font-medium leading-relaxed italic">
                                "{slide.content}"
                            </p>

                            {/* Interaction Tabs */}
                            <div className="space-y-8">
                                <nav className="flex gap-1 bg-slate-100 p-1.5 rounded-[1.5rem] w-fit">
                                    {[
                                        { id: 'steps', label: 'How it Works', icon: Info },
                                        { id: 'troubleshoot', label: 'Common Issues', icon: HelpCircle },
                                        { id: 'tips', label: 'Pro Tips', icon: Sparkles }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setTab(item.id as any)}
                                            className={`px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold transition-all ${tab === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>

                                {/* Dynamic Tab Content */}
                                <div className="min-h-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {tab === 'steps' && (
                                        <div className="grid gap-4">
                                            {slide.detailedSteps.map((step, i) => (
                                                <div key={i} className="group flex items-start gap-6 p-6 rounded-[2rem] hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-sm">
                                                        0{i + 1}
                                                    </div>
                                                    <p className="text-slate-700 font-bold pt-2 leading-relaxed text-lg">{step}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {tab === 'troubleshoot' && (
                                        <div className="space-y-6">
                                            {slide.commonIssues.map((issue, i) => (
                                                <div key={i} className="bg-amber-50 rounded-[2rem] p-8 space-y-3 border border-amber-100/50">
                                                    <h4 className="text-amber-900 font-black text-xl flex items-center gap-3">
                                                        <HelpCircle className="w-6 h-6" />
                                                        {issue.issue}
                                                    </h4>
                                                    <p className="text-amber-800/70 font-medium pl-9 leading-relaxed text-lg">
                                                        <span className="font-black text-amber-900/40 mr-2 underline decoration-wavy underline-offset-4">Fix:</span>
                                                        {issue.solution}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {tab === 'tips' && (
                                        <div className="space-y-4">
                                            {slide.tips.map((tip, i) => (
                                                <div key={i} className="flex items-start gap-6 p-8 rounded-[2.5rem] bg-indigo-50/40 border border-indigo-100/50 group hover:scale-[1.02] transition-transform">
                                                    <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-sm flex-shrink-0 border border-indigo-50">
                                                        <Lightbulb className="w-8 h-8 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
                                                    </div>
                                                    <p className="text-indigo-900 font-bold leading-relaxed pt-2 text-lg">
                                                        {tip}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Control Footer */}
                    <div className="absolute bottom-0 left-0 right-0 p-10 bg-white/80 backdrop-blur-xl border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {slides.map((_, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`h-2 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-12 bg-slate-900' : 'w-2 bg-slate-200 hover:bg-slate-300'}`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-4">
                            <Button 
                                variant="outline" 
                                size="lg" 
                                onClick={handleBack} 
                                disabled={currentIndex === 0}
                                className="px-6 rounded-[1.5rem] border-slate-200"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <Button 
                                variant="black" 
                                size="lg" 
                                onClick={handleNext}
                                className="min-w-[200px] rounded-[1.5rem] gap-3"
                            >
                                {currentIndex === slides.length - 1 ? 'Finish Setup' : 'Next Step'}
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
