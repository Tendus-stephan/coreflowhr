import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { 
    ChevronRight, ChevronLeft, X,
    Info, HelpCircle, Sparkles, Lightbulb, Rocket,
    Users, Briefcase, Mail, Calendar, FileText, BarChart3
} from 'lucide-react';
import VisualPreview from '../components/onboarding/VisualPreview';
import { supabase } from '../services/supabase';

interface SlideIssue {
    issue: string;
    solution: string;
}

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    content: string;
    detailedSteps: string[];
    commonIssues: SlideIssue[];
    tips: string[];
    icon: React.ReactNode;
    accentColor: string;
    visualLabel: string;
}

const slides: Slide[] = [
    {
        id: 1,
        title: "Welcome to CoreflowHR!",
        subtitle: "The Future of Recruitment",
        accentColor: "indigo",
        visualLabel: "DASHBOARD",
        content: "Your all-in-one recruitment management platform. Streamline your hiring process with AI-powered candidate matching, automated workflows, and comprehensive analytics.",
        detailedSteps: [
            "Navigate through the platform using the sidebar menu on the left",
            "Access your Dashboard to see an overview of all activities",
            "Use the Candidates page to manage your recruitment pipeline",
            "Create and manage Jobs from the Jobs page",
            "Configure Settings to customize your experience"
        ],
        commonIssues: [
            {
                issue: "Can't see the sidebar menu",
                solution: "Check if you're on a public page. The sidebar only appears on authenticated pages. Make sure you're logged in."
            },
            {
                issue: "Page is blank or not loading",
                solution: "Refresh the page (Ctrl+R). If the issue persists, check your connection and clear browser cache."
            }
        ],
        tips: [
            "Bookmark the Dashboard page for quick access",
            "Use keyboard shortcuts: Ctrl+K (or Cmd+K) to search",
            "Check the notification bell icon for important updates"
        ],
        icon: <Rocket className="w-10 h-10" />
    },
    {
        id: 2,
        title: "Manage Your Candidate Pipeline",
        subtitle: "Visual Workflow",
        accentColor: "blue",
        visualLabel: "KANBAN",
        content: "Visualize your recruitment process with our Kanban board. Move candidates through stages: New → Screening → Interview → Offer → Hired.",
        detailedSteps: [
            "Go to the Candidates page from the sidebar",
            "View candidates organized in columns by stage",
            "Click and drag a candidate card to move them between stages",
            "Click on a card to view full details and take actions",
            "Filter candidates by job, stage, or AI match score"
        ],
        commonIssues: [
            {
                issue: "Can't move candidate to a stage",
                solution: "You must create an email workflow for that stage first. Go to Settings > Email Workflows."
            },
            {
                issue: "AI match score not showing",
                solution: "The candidate needs a CV uploaded and the job needs skills defined. Upload the CV and ensure job skills are listed."
            }
        ],
        tips: [
            "Use bulk actions to move multiple candidates at once",
            "Right-click on a card for a quick actions menu",
            "Export candidate data using the download button"
        ],
        icon: <Users className="w-10 h-10" />
    },
    {
        id: 3,
        title: "Create and Manage Job Postings",
        subtitle: "Hiring at Scale",
        accentColor: "emerald",
        visualLabel: "JOBS",
        content: "Post jobs and manage job statuses. It's crucial to carefully cross-check all job details and input core skills required for the position. Once a job is created and set to Active, candidates will be automatically sourced based on these skills.",
        detailedSteps: [
            "Click 'New Job' or go to Jobs page and click 'Create Job'",
            "Fill in details: Title, Department, Location, Type",
            "⚠️ IMPORTANT: Carefully cross-check all job information for accuracy",
            "⚠️ CRITICAL: Input all core skills required for the job - this directly impacts AI candidate matching accuracy",
            "Review and verify all details before proceeding",
            "Set status: Draft, Active, or Closed",
            "Once Active, candidates will be automatically sourced for the job based on the skills you've defined"
        ],
        commonIssues: [
            {
                issue: "Candidates not being sourced",
                solution: "Make sure the job is set to 'Active' status. Only active jobs trigger candidate sourcing. Also verify that core skills have been properly inputted."
            },
            {
                issue: "Poor AI match scores for candidates",
                solution: "Ensure you've inputted all core/required skills for the job. The AI matching system relies heavily on these skills to find suitable candidates."
            },
            {
                issue: "Job disappeared from the list",
                solution: "Check your filters - you might be viewing only 'Active' jobs. Switch to 'All'."
            }
        ],
        tips: [
            "⚠️ Always cross-check job details before setting to Active - accuracy is crucial",
            "⚠️ Input all core skills comprehensively - missing skills lead to poor candidate matches",
            "Use Draft status to prepare and review jobs before publishing",
            "The more specific and detailed your skills list, the better the AI matching will be",
            "Close jobs when filled to keep your dashboard clean"
        ],
        icon: <Briefcase className="w-10 h-10" />
    },
    {
        id: 4,
        title: "Automated Email Workflows",
        subtitle: "Seamless Communication",
        accentColor: "amber",
        visualLabel: "EMAILS",
        content: "Set up stage-based email automation to keep candidates engaged. Customize templates, use AI for content, and track communications.",
        detailedSteps: [
            "Go to Settings > Email Workflows",
            "Select the trigger stage (e.g., when moved to 'Screening')",
            "Choose or create an email template",
            "Set optional conditions like minimum AI score",
            "Enable the workflow and set optional delays"
        ],
        commonIssues: [
            {
                issue: "Emails not being sent",
                solution: "Check if the workflow is enabled and if an email template is correctly assigned."
            },
            {
                issue: "Placeholders showing (e.g. {name})",
                solution: "Ensure candidate profile has the required data. Verify placeholder names in Settings."
            }
        ],
        tips: [
            "Create workflows for all stages to fully automate",
            "Use AI-generated content to save writing time",
            "Test the workflow with a dummy candidate before sending emails out to ensure everything works correctly"
        ],
        icon: <Mail className="w-10 h-10" />
    },
    {
        id: 5,
        title: "Schedule and Manage Interviews",
        subtitle: "Sync Your Team",
        accentColor: "rose",
        visualLabel: "CALENDAR",
        content: "Use the calendar view to schedule interviews. Reschedule by dragging and dropping. Integrate with Google Meet for video calls.",
        detailedSteps: [
            "Go to the Calendar page from the sidebar",
            "Switch between Monthly, Weekly, or Daily views",
            "Click on a slot to schedule (only Interview-stage candidates appear)",
            "Video interviews auto-generate Google Meet links",
            "Drag and drop interviews on the calendar to reschedule"
        ],
        commonIssues: [
            {
                issue: "Google Meet link not generating",
                solution: "Check that Google Calendar integration is connected in Settings > Integrations."
            },
            {
                issue: "Can't see candidate in dropdown",
                solution: "Only candidates in the 'Interview' stage appear. Move them there first."
            }
        ],
        tips: [
            "Use the weekly view for detailed scheduling",
            "Add interview feedback immediately while it's fresh",
            "Export your calendar to sync with external apps"
        ],
        icon: <Calendar className="w-10 h-10" />
    },
    {
        id: 6,
        title: "Send and Track Job Offers",
        subtitle: "Close the Deal",
        accentColor: "violet",
        visualLabel: "OFFERS",
        content: "Create professional offer letters, send them via email, and track candidate responses. Support counter-offers and automatic updates.",
        detailedSteps: [
            "Create an offer from a candidate's profile",
            "Fill in Position, Salary, Start Date, and Benefits",
            "Review placeholders like {salary_amount} before sending",
            "Track status: Sent, Viewed, Accepted, Declined",
            "Accepted offers automatically move candidates to 'Hired'"
        ],
        commonIssues: [
            {
                issue: "Can't move to Offer stage",
                solution: "You must create an offer first. The system requires an active offer for this stage."
            },
            {
                issue: "Offer link expired",
                solution: "Links expire based on the date set. Extend the date in the offer details."
            }
        ],
        tips: [
            "Always review details before sending",
            "Set an expiration date to create a sense of urgency",
            "Track all communications in the negotiation history"
        ],
        icon: <FileText className="w-10 h-10" />
    },
    {
        id: 7,
        title: "AI-Powered Candidate Matching",
        subtitle: "Intelligence Built-in",
        accentColor: "cyan",
        visualLabel: "AI SCORES",
        content: "Our AI analyzes candidate CVs and calculates match scores based on job requirements. Get instant insights into fit and experience.",
        detailedSteps: [
            "Upload CVs (PDF, DOC, DOCX)",
            "Ensure job has skills defined for comparison",
            "AI parses skills, education, and work history",
            "View scores (0-100) color-coded on candidate cards",
            "Filter by score range to prioritize top talent"
        ],
        commonIssues: [
            {
                issue: "Score is 0 or null",
                solution: "Check if the job has skills defined and if the CV was parsed correctly."
            },
            {
                issue: "CV not being parsed",
                solution: "Ensure the file is not corrupted or password-protected. Max size is 10MB."
            }
        ],
        tips: [
            "Define detailed job skills for better accuracy",
            "Use scores as a guide, not the only deciding factor",
            "Scores update in real-time as you modify job requirements"
        ],
        icon: <Sparkles className="w-10 h-10" />
    },
    {
        id: 8,
        title: "Track Your Recruitment Metrics",
        subtitle: "Data-Driven Growth",
        accentColor: "slate",
        visualLabel: "METRICS",
        content: "Monitor key metrics on your dashboard: active jobs, total candidates, average time to fill, and more.",
        detailedSteps: [
            "Access Dashboard from the top of the sidebar",
            "View metrics: Active Jobs, Avg Time to Fill, Qualified Count",
            "Check Activity Feed for real-time system changes",
            "View upcoming interviews in the calendar widget",
            "Filter activity feed by date range or action type"
        ],
        commonIssues: [
            {
                issue: "Metrics showing zero",
                solution: "Metrics only count Active jobs. Closed jobs are excluded by default."
            },
            {
                issue: "Activity feed seems empty",
                solution: "The feed shows actions from the current user. Refresh to load the latest events."
            }
        ],
        tips: [
            "Check the dashboard daily for pipeline health",
            "Monitor Time to Fill to improve operational efficiency",
            "Use bulk actions to manage multiple candidates efficiently"
        ],
        icon: <Sparkles className="w-10 h-10" />
    }
];

const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [tab, setTab] = useState<'steps' | 'troubleshoot' | 'tips'>('steps');

    // Check if onboarding already completed
    // Only redirect if truly completed to prevent loops
    useEffect(() => {
        // Only check once on mount, don't re-check on every render
        let isMounted = true;
        
        const checkOnboardingStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && isMounted) {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('onboarding_completed')
                        .eq('id', user.id)
                        .maybeSingle(); // Use maybeSingle to avoid errors if profile doesn't exist
                    
                    // Only redirect if onboarding is explicitly marked as completed
                    // This prevents redirect loops
                    if (isMounted && profile?.onboarding_completed === true) {
                        // Use replace to prevent back button issues
                        navigate('/dashboard', { replace: true });
                    }
                }
            } catch (error) {
                // Silently handle errors - don't redirect on error
                console.warn('Error checking onboarding status:', error);
            }
        };
        
        checkOnboardingStatus();
        
        return () => {
            isMounted = false; // Cleanup to prevent state updates after unmount
        };
    }, []); // Empty dependency array - only check once on mount

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

    const handleComplete = async () => {
        try {
            // Mark as completed first and wait for it to complete
            await markOnboardingCompleted();
            // Immediately redirect to dashboard - no completion screen
            // Using window.location to force a full page reload so ProtectedRoute gets fresh data
            window.location.href = '/#/dashboard';
        } catch (error) {
            console.error('Error completing onboarding:', error);
            // Even if there's an error, try to redirect to dashboard
            window.location.href = '/#/dashboard';
        }
    };

    const markOnboardingCompleted = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        onboarding_completed: true,
                        onboarding_completed_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
                
                if (error) {
                    console.error('Error updating onboarding status:', error);
                    throw error;
                }
                
                // Wait a moment to ensure the database update has propagated
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error marking onboarding as completed:', error);
            throw error; // Re-throw so handleComplete can handle it
        }
    };

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handleBack();
            // ESC key removed - users must complete onboarding
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [handleNext, handleBack]);

    const slide = slides[currentIndex];
    const progress = ((currentIndex + 1) / slides.length) * 100;

    return (
        <div className="fixed inset-0 bg-slate-50 font-sans overflow-hidden">
            <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                
                {/* Left Side: Dynamic Visual Showcase */}
                <div className="hidden lg:flex lg:col-span-5 bg-slate-950 flex-col p-12 relative overflow-hidden">
                    <div className="relative z-20 my-auto flex items-center justify-start -ml-4">
                        <div className="scale-100">
                            <VisualPreview label={slide.visualLabel} color={slide.accentColor} slideId={slide.id} />
                        </div>
                    </div>

                    <div className="relative z-20 mt-auto space-y-6">
                        <div className="flex gap-2">
                             <span className="px-4 py-1.5 bg-white/10 text-white/80 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">Module {slide.id}</span>
                             <span className="px-4 py-1.5 bg-white/10 text-white/80 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">Interactive</span>
                        </div>
                        <h3 className="text-5xl font-black text-white tracking-tighter leading-none italic">{slide.subtitle}</h3>
                        <p className="text-white/40 text-lg max-w-sm font-medium leading-relaxed">
                            Master the CoreflowHR interface in minutes with our guided visual tours.
                        </p>
                </div>

                    {/* Gradient Background Blobs */}
                    {slide.accentColor === 'indigo' && (
                        <>
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-indigo-600"></div>
                            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-indigo-400"></div>
                        </>
                    )}
                    {slide.accentColor === 'blue' && (
                        <>
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-blue-600"></div>
                            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-blue-400"></div>
                        </>
                    )}
                    {slide.accentColor === 'emerald' && (
                        <>
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-emerald-600"></div>
                            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-emerald-400"></div>
                        </>
                    )}
                    {slide.accentColor === 'amber' && (
                        <>
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-amber-600"></div>
                            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-amber-400"></div>
                        </>
                    )}
                    {slide.accentColor === 'rose' && (
                        <>
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-rose-600"></div>
                            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-rose-400"></div>
                        </>
                    )}
                    {slide.accentColor === 'violet' && (
                        <>
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-violet-600"></div>
                            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-violet-400"></div>
                        </>
                    )}
                    {slide.accentColor === 'cyan' && (
                        <>
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-cyan-600"></div>
                            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-cyan-400"></div>
                        </>
                    )}
                    {slide.accentColor === 'slate' && (
                        <>
                            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20 transition-all duration-1000 bg-slate-600"></div>
                            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[150px] opacity-10 transition-all duration-1000 bg-slate-400"></div>
                        </>
                    )}
                </div>

                {/* Right Side: Interactive Guide */}
                <div className="lg:col-span-7 flex flex-col h-full bg-white relative overflow-hidden">
                    {/* Header */}
                    <div className="px-10 py-8 flex items-center justify-between flex-shrink-0 border-b border-slate-100">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{slide.title}</h1>
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-12 bg-indigo-600 rounded-full"></div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tutorial Progress</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <img 
                                src="/assets/images/coreflow-favicon-logo.png" 
                                alt="CoreflowHR" 
                                className="object-contain"
                                style={{
                                    display: 'block',
                                    width: '90px',
                                    height: '90px'
                                }}
                                onError={(e) => {
                                    console.error('Logo failed to load');
                                    const img = e.target as HTMLImageElement;
                                    img.style.border = '2px solid red';
                                }}
                                onLoad={() => {
                                    console.log('Logo loaded successfully');
                                }}
                            />
                        </div>
                            </div>

                    {/* Content Section */}
                    <div className="flex-1 overflow-y-auto px-10 py-8">
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
                    <div className="flex-shrink-0 p-10 bg-white border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {slides.map((_, i) => (
                            <button
                                    key={i}
                                    onClick={() => {
                                        setCurrentIndex(i);
                                        setTab('steps');
                                    }}
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
