import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
    ChevronRight, ChevronLeft,
    Info, HelpCircle, Sparkles, Lightbulb, Rocket,
    Users, Briefcase, Mail, Calendar, FileText, Building2
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
        content: "Your all-in-one recruitment platform. Post jobs, attract inbound applicants, manage your hiring pipeline, and close offers — all in one place.",
        detailedSteps: [
            "Navigate using the sidebar: Dashboard, Jobs, Candidates, Clients, Calendar, Offers",
            "Start by creating a job in the Jobs page",
            "Share your job link on LinkedIn, Indeed, or CV-Library to attract applicants",
            "Manage inbound applicants on the Candidates page (Kanban pipeline)",
            "Configure your workspace in Settings: email workflows, team members, integrations"
        ],
        commonIssues: [
            {
                issue: "Can't see the sidebar menu",
                solution: "The sidebar only appears when you're logged in. Make sure you're authenticated and not on a public page."
            },
            {
                issue: "Page is blank or not loading",
                solution: "Refresh the page (Ctrl+R). If the issue persists, check your connection and clear your browser cache."
            }
        ],
        tips: [
            "Bookmark the Dashboard for quick access to your hiring overview",
            "Invite team members from Settings → Team to collaborate on hiring",
            "Use the CoreflowHR AI assistant (floating button) for quick help"
        ],
        icon: <Rocket className="w-10 h-10" />
    },
    {
        id: 2,
        title: "Post Jobs & Share Externally",
        subtitle: "Attract Inbound Talent",
        accentColor: "emerald",
        visualLabel: "JOBS",
        content: "Create a job, set it to Active, then share the application link on job boards. Candidates apply directly — no manual sourcing needed.",
        detailedSteps: [
            "Go to Jobs → click 'New Job'",
            "Fill in Title, Department, Location, Type, and a clear Description",
            "Add required Skills — these are used to AI-score inbound applicants",
            "Set status to 'Active' to open the role for applications",
            "Click the job in the table → use 'Share this role' to copy pre-formatted posts",
            "Paste your copied post on LinkedIn, Indeed, or CV-Library",
            "Applicants who submit the form appear instantly in your Candidates pipeline"
        ],
        commonIssues: [
            {
                issue: "No candidates appearing after sharing",
                solution: "Confirm the job is set to 'Active'. Only active jobs accept applications. Check that your shared link points to the correct job."
            },
            {
                issue: "Job disappeared from the list",
                solution: "Check your filters — you may be viewing only 'Active' jobs. Switch to 'All' to see Draft and Closed jobs."
            }
        ],
        tips: [
            "Use Draft status to draft and review a job before making it live",
            "The more complete your job description and skills list, the higher-quality your applicants",
            "Close jobs once filled to keep your pipeline clean and metrics accurate",
            "Each job has a unique shareable link — you can use it across multiple platforms"
        ],
        icon: <Briefcase className="w-10 h-10" />
    },
    {
        id: 3,
        title: "Manage Your Candidate Pipeline",
        subtitle: "Visual Workflow",
        accentColor: "blue",
        visualLabel: "KANBAN",
        content: "Every inbound applicant lands in your Waitlist. Move them through stages — Screening → Interview → Offer → Hired — as they progress through your process.",
        detailedSteps: [
            "Go to Candidates in the sidebar",
            "Select a job from the dropdown to filter your pipeline",
            "Waitlist: newly submitted applications — review CVs and move promising ones to Screening",
            "Drag and drop cards between stages to progress candidates",
            "Click any card to open the full candidate profile (CV, notes, emails, score)",
            "You can also add candidates manually or bulk-import CVs using the import button",
            "Use filters to view by stage, job, or AI match score"
        ],
        commonIssues: [
            {
                issue: "Can't drag a candidate to a stage",
                solution: "Some stage transitions are locked (e.g. you can't move directly to Offer without going through Interview). Follow the correct stage order."
            },
            {
                issue: "AI match score is missing",
                solution: "The candidate needs a CV uploaded and the job needs skills defined. Once both are present, the score calculates automatically."
            },
            {
                issue: "Candidate doesn't appear in pipeline",
                solution: "Check the job filter at the top — make sure you're viewing 'All Jobs' or the specific job the candidate applied to."
            }
        ],
        tips: [
            "Waitlist is your inbox — review it daily and clear out applicants who aren't a fit early",
            "Use bulk actions (select multiple cards) to reject or move many candidates at once",
            "Leave notes on candidate profiles so your whole team stays aligned",
            "Import CVs in bulk to manually add candidates who didn't apply through the link"
        ],
        icon: <Users className="w-10 h-10" />
    },
    {
        id: 4,
        title: "Automated Email Workflows",
        subtitle: "Seamless Communication",
        accentColor: "amber",
        visualLabel: "EMAILS",
        content: "Set up email workflows once, and CoreflowHR automatically sends the right message every time a candidate moves to a new stage.",
        detailedSteps: [
            "Go to Settings → Email Workflows",
            "Create a workflow for each stage: Screening, Interview, Offer, Hired, Rejected",
            "Choose an email template (or create one) for each workflow",
            "Enable the workflow — it fires automatically on stage transitions",
            "Candidates also receive a confirmation email when they submit an application",
            "Customize templates with placeholders like {{candidate_name}}, {{job_title}}",
            "View sent email history in the candidate's profile → Emails tab"
        ],
        commonIssues: [
            {
                issue: "Email not sent when I move a candidate",
                solution: "Check that a workflow for that stage exists and is enabled in Settings → Email Workflows."
            },
            {
                issue: "Placeholders like {{name}} showing literally in emails",
                solution: "Ensure the candidate profile has the required fields filled in. Check your template uses the correct placeholder syntax."
            },
            {
                issue: "Candidate didn't receive application confirmation",
                solution: "The confirmation email is sent automatically on submission. Ask the candidate to check their spam folder."
            }
        ],
        tips: [
            "Set up your Screening workflow first — it's triggered most often",
            "Use the Rejected workflow with a kind, professional template to maintain your employer brand",
            "Test a workflow by moving a test candidate through stages before going live",
            "Email templates support HTML for rich formatting"
        ],
        icon: <Mail className="w-10 h-10" />
    },
    {
        id: 5,
        title: "Schedule and Manage Interviews",
        subtitle: "Sync Your Team",
        accentColor: "rose",
        visualLabel: "CALENDAR",
        content: "Schedule interviews directly from CoreflowHR and see them in your Google Calendar. Use the CoreFlow Interviews tab to track all scheduled interviews in one list.",
        detailedSteps: [
            "Go to Calendar in the sidebar",
            "Click 'Schedule Interview' to create a new interview",
            "Select the candidate, date, time, and interview type (Video, Phone, In-person)",
            "Video interviews generate a Google Meet link automatically (if Google Calendar is connected)",
            "The Google Calendar tab shows your full calendar synced in real-time",
            "The CoreFlow Interviews tab shows a list of all interviews you've scheduled",
            "Connect Google Calendar in Settings → Integrations for two-way sync"
        ],
        commonIssues: [
            {
                issue: "Google Meet link not generating",
                solution: "Connect your Google Calendar account in Settings → Integrations. The integration must be active for Meet links to generate."
            },
            {
                issue: "Interview not appearing in Google Calendar",
                solution: "Check that your Google Calendar integration is connected and active in Settings → Integrations."
            }
        ],
        tips: [
            "Connect Google Calendar in Settings to keep everything in sync automatically",
            "Add interview feedback immediately after the call while details are fresh",
            "Use the CoreFlow Interviews tab to quickly see upcoming interviews without switching to Google"
        ],
        icon: <Calendar className="w-10 h-10" />
    },
    {
        id: 6,
        title: "Send and Track Job Offers",
        subtitle: "Close the Deal",
        accentColor: "violet",
        visualLabel: "OFFERS",
        content: "Create professional offer letters, send them directly to candidates via email, and track responses including counter-offers and e-signatures.",
        detailedSteps: [
            "Move a candidate to the 'Offer' stage in the pipeline",
            "Go to Offers in the sidebar → click 'New Offer'",
            "Fill in Position, Salary, Start Date, Benefits, and any Notes",
            "Click 'Send Offer' — the candidate receives a link to review and respond",
            "Track status: Draft → Sent → Awaiting Sign. → Signed (or Declined / Negotiating)",
            "If the candidate submits a counter-offer, you'll see it in the offer card to Accept, Negotiate, or Decline",
            "Once signed, download the signed PDF directly from the offer card"
        ],
        commonIssues: [
            {
                issue: "Can't send an offer",
                solution: "The candidate must have an email address on file. Check their profile and ensure their email is saved."
            },
            {
                issue: "Offer link says expired",
                solution: "Offers have an expiry date. Edit the offer and extend the expiry date, then resend."
            }
        ],
        tips: [
            "Set a short expiry date (5–7 days) to encourage prompt responses",
            "Review all salary details carefully before hitting Send — offers can't be edited once sent",
            "Use the Archive button to hide closed/rejected offers and keep your list clean",
            "Counter-offer history is tracked in full so you have a clear negotiation record"
        ],
        icon: <FileText className="w-10 h-10" />
    },
    {
        id: 7,
        title: "Manage Clients",
        subtitle: "Your Client Book",
        accentColor: "cyan",
        visualLabel: "CLIENTS",
        content: "If you're a recruitment agency, track your client companies in the Clients page. Link jobs to clients and keep all contact information in one place.",
        detailedSteps: [
            "Go to Clients in the sidebar",
            "Click 'New Client' to add a company",
            "Fill in Company Name, Industry, Contact Person, Email, and Phone",
            "Save the client — they appear in your client list",
            "When creating a job, associate it with a client for clear ownership",
            "Click a client to view their details and any linked roles"
        ],
        commonIssues: [
            {
                issue: "Duplicate client was created",
                solution: "This can happen if the Create button is clicked multiple times. Check your client list and delete the duplicate — the system now prevents this with a loading guard."
            },
            {
                issue: "Can't find a client in the list",
                solution: "Use the search bar at the top of the Clients page to filter by company name or contact."
            }
        ],
        tips: [
            "Keep client contact details up to date so your team always has the right person to call",
            "Linking jobs to clients makes it easy to report on how many roles you're filling per client",
            "Agency recruiters: use Notes to track relationship history and preferences per client"
        ],
        icon: <Building2 className="w-10 h-10" />
    },
    {
        id: 8,
        title: "AI-Powered CV Scoring",
        subtitle: "Intelligence Built-in",
        accentColor: "slate",
        visualLabel: "AI SCORES",
        content: "CoreflowHR automatically parses inbound CVs and scores each candidate against your job's required skills. Prioritise your best-fit applicants instantly.",
        detailedSteps: [
            "Candidates who apply via the job link can attach their CV — it's parsed automatically",
            "You can also upload CVs manually from the candidate's profile → CV tab",
            "AI extracts skills, education, and work history from the CV",
            "A match score (0–100) is calculated based on overlap with the job's required skills",
            "Scores appear as colour-coded badges on candidate cards in the pipeline",
            "Filter candidates by score range to quickly surface top applicants",
            "Define comprehensive skills on your job posting for the most accurate scoring"
        ],
        commonIssues: [
            {
                issue: "Score is 0 or not showing",
                solution: "The job must have skills defined and the candidate must have a parsed CV. Check both and the score will calculate automatically."
            },
            {
                issue: "CV failed to parse",
                solution: "Ensure the CV is a PDF, DOC, or DOCX file, not corrupted, and under 10MB. Password-protected files cannot be parsed."
            }
        ],
        tips: [
            "Always add skills to your job postings — without them, scoring won't work",
            "Use scores as a starting filter, not the final decision — context matters",
            "Bulk-import CVs for candidates you've already been in contact with to get them scored too"
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
                    
                    // If there's an error, don't redirect - let user proceed with onboarding
                    if (error) {
                        console.warn('Error checking onboarding status in Onboarding component:', error);
                        return;
                    }
                    
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
    }, [navigate]); // Added navigate to dependencies

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
            await markOnboardingCompleted();
            // Route through /auth/redirect rather than directly to /dashboard.
            // This re-runs subscription + onboarding checks and, if payment params
            // are present, polls for the Stripe webhook before committing a route.
            // This prevents the "payment pending trap" where a newly-paid user who
            // finishes onboarding gets bounced to pricing because ProtectedRoute's
            // fresh DB check runs before the webhook has updated the subscription.
            let redirectTarget = '/auth/redirect';
            try {
                const pending = sessionStorage.getItem('pendingPaymentSuccess');
                if (pending) {
                    // pending is like "?payment=success&session_id=cs_..."
                    sessionStorage.removeItem('pendingPaymentSuccess');
                    redirectTarget = `/auth/redirect${pending}`;
                }
            } catch { /* sessionStorage unavailable */ }
            sessionStorage.setItem('showDashboardLoader', 'true');
            window.location.replace(redirectTarget);
        } catch (error) {
            console.error('Error completing onboarding:', error);
            // Do NOT redirect on failure — user would loop back to onboarding
            // because onboarding_completed is still false in the DB.
            // Show an error instead so they can retry.
            alert('Something went wrong saving your progress. Please try again.');
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
                // Increased delay to 1.5 seconds to ensure database consistency
                await new Promise(resolve => setTimeout(resolve, 1500));
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
