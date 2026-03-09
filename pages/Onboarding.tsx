import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
    ChevronRight, ChevronLeft,
    Info, HelpCircle, Sparkles, Lightbulb, Rocket,
    Users, Briefcase, Mail, Calendar, FileText, BarChart3,
    UserPlus, Inbox, TrendingUp, Zap
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
        subtitle: "Your Complete Recruitment OS",
        accentColor: "indigo",
        visualLabel: "DASHBOARD",
        content: "CoreflowHR is your all-in-one recruitment platform — from AI-powered candidate sourcing to offer letters and e-signatures. This guide walks you through every feature so you're ready to hire from day one.",
        detailedSteps: [
            "Navigate using the sidebar: Dashboard, Jobs, Candidates, Calendar, Offers, Reports",
            "Start by inviting your team in Settings > Team Members",
            "Create your first job — candidates are automatically sourced once a job is Active",
            "Manage candidates through the pipeline: New → Screening → Interview → Offer → Hired",
            "Send emails, schedule interviews, and track everything without leaving the platform",
            "Connect Slack and Google Calendar in Settings > Integrations for real-time sync"
        ],
        commonIssues: [
            {
                issue: "Can't see the sidebar menu",
                solution: "The sidebar only appears on authenticated pages. Make sure you're logged in — if you're on the login or landing page, sign in first."
            },
            {
                issue: "Page is blank or not loading",
                solution: "Refresh the page (Ctrl+R / Cmd+R). If the issue persists, clear your browser cache or try an incognito window."
            }
        ],
        tips: [
            "Bookmark the Dashboard for a daily overview of your pipeline",
            "Check the notification bell icon for unread candidate replies and system updates",
            "Use arrow keys to navigate between slides in this guide"
        ],
        icon: <Rocket className="w-10 h-10" />
    },
    {
        id: 2,
        title: "Set Up Your Team",
        subtitle: "Roles, Permissions & Collaboration",
        accentColor: "violet",
        visualLabel: "TEAM",
        content: "Invite colleagues to your workspace and assign roles to control what each person can see and do. Roles are workspace-wide — set them carefully before your team starts working.",
        detailedSteps: [
            "Go to Settings > Team Members",
            "Click 'Invite Member' and enter the person's email address",
            "Choose their role: Admin (full access), Hiring Manager (manage jobs & candidates), or Viewer (read-only)",
            "They receive an invite email with a link to join — the link expires in 3 days",
            "Manage existing members from the same page: change roles or remove access at any time",
            "⚠️ Only one Admin per workspace — this is always the account owner and cannot be reassigned"
        ],
        commonIssues: [
            {
                issue: "Invited person didn't receive the email",
                solution: "Ask them to check spam/junk folder. Invite links expire after 3 days. If expired, re-invite them from Settings > Team Members."
            },
            {
                issue: "Can't promote someone to Admin",
                solution: "Only one Admin is allowed per workspace. The Admin role stays with the original account owner and cannot be transferred."
            },
            {
                issue: "Can't invite more Viewers",
                solution: "There's a maximum of 5 Viewers per workspace. Remove an existing Viewer before adding a new one."
            }
        ],
        tips: [
            "Hiring Managers can create jobs, manage candidates, send offers, and schedule interviews",
            "Viewers are ideal for clients or stakeholders who only need read-only visibility",
            "Invite team members early — it's faster to work collaboratively from the start"
        ],
        icon: <UserPlus className="w-10 h-10" />
    },
    {
        id: 3,
        title: "Jobs & Automated AI Sourcing",
        subtitle: "Let AI Find Your Candidates",
        accentColor: "emerald",
        visualLabel: "JOBS",
        content: "Create a job and our AI automatically sources matching candidates from professional databases (powered by People Data Labs). The accuracy of sourcing depends entirely on the skills and details you provide — be thorough.",
        detailedSteps: [
            "Go to Jobs and click 'Create Job'",
            "Fill in: Title, Department, Location, Employment Type, and Description",
            "⚠️ CRITICAL: Add all core required skills — these directly drive AI candidate matching and sourcing quality",
            "Review all details carefully before publishing — errors affect who gets sourced",
            "Set status to 'Active' to begin automated sourcing (Draft jobs are not sourced)",
            "Sourced candidates appear in the Candidates board under the 'New' stage automatically",
            "⚠️ Sourced candidates do not have emails yet — you'll contact them via LinkedIn outreach first",
            "Close the job when the position is filled to keep your workspace tidy"
        ],
        commonIssues: [
            {
                issue: "No candidates appearing after setting to Active",
                solution: "Sourcing runs in the background and may take a few minutes. Ensure the job has skills listed — jobs without skills produce no results. Check the sourcing status bar on the Candidates page."
            },
            {
                issue: "Candidate quality is poor or irrelevant",
                solution: "Add more specific and relevant skills. Vague entries like 'management' produce weaker matches than specific ones like 'React.js' or 'Python'."
            },
            {
                issue: "Job disappeared from the list",
                solution: "Check your filter — you may be viewing only Active jobs. Switch the filter to 'All' to see Draft and Closed jobs."
            }
        ],
        tips: [
            "Be specific with skills: 'TypeScript' beats 'JavaScript'; 'Paid Social' beats 'Marketing'",
            "Each workspace has a monthly sourcing credit cap — use them on your highest-priority jobs",
            "Use Draft status to review and verify job details before sourcing begins",
            "The more complete and accurate your job description, the better the AI matching will be"
        ],
        icon: <Briefcase className="w-10 h-10" />
    },
    {
        id: 4,
        title: "Managing Your Candidate Pipeline",
        subtitle: "Kanban-Style Hiring Workflow",
        accentColor: "blue",
        visualLabel: "KANBAN",
        content: "Your pipeline uses a Kanban board with 6 stages: New → Screening → Interview → Offer → Hired / Rejected. Each stage unlocks different actions. Candidates move forward as you qualify them.",
        detailedSteps: [
            "Go to Candidates from the sidebar — filter by job to focus on a single role",
            "New stage: sourced candidates without emails — use LinkedIn Outreach to contact them",
            "Open a candidate card → Email tab → click 'Generate Outreach Message' to create a personalised LinkedIn message with a registration link",
            "Once the candidate registers via the link, they auto-move to Screening and receive a CV upload email",
            "Drag and drop candidate cards between stages, or use the stage dropdown inside their profile",
            "Click any card to open the full profile: CV, AI score, notes, email history, interview feedback, and offers",
            "Filter by job, stage, or AI score to prioritise who to focus on",
            "Use bulk actions at the top of the board to move or email multiple candidates at once"
        ],
        commonIssues: [
            {
                issue: "Candidate stuck in 'New' — no email to contact",
                solution: "This is expected. Sourced candidates don't have emails by default. Use the LinkedIn Outreach feature to generate a personalised message with a registration link."
            },
            {
                issue: "Can't drag a candidate to a stage",
                solution: "Candidates without emails cannot be moved past 'New'. Ensure active email workflows are set up in Settings > Email Workflows for each stage."
            },
            {
                issue: "AI match score is 0 or not showing",
                solution: "Upload the candidate's CV and ensure the job has skills listed. Both are required for the AI to calculate a score."
            }
        ],
        tips: [
            "Candidates in 'New' have no emails — don't attempt to email them directly",
            "After a candidate registers, they auto-receive the Screening workflow email (CV request)",
            "Use the Notes tab in candidate profiles to log call summaries and observations",
            "Rejected candidates are hidden by default — toggle 'Show Rejected' to view them"
        ],
        icon: <Users className="w-10 h-10" />
    },
    {
        id: 5,
        title: "Email Communication & Two-Way Inbox",
        subtitle: "Send, Receive & Reply — All in One Place",
        accentColor: "amber",
        visualLabel: "INBOX",
        content: "CoreflowHR handles all candidate communication in both directions. Automated workflows send emails when candidates move stages. Candidates can reply directly, and you can read and respond without leaving the platform.",
        detailedSteps: [
            "📧 Automated workflows: Settings > Email Workflows → create a workflow per stage (Screening, Interview, Offer, Hired, Rejected)",
            "⚠️ REQUIRED: Set up a 'Screening' workflow before generating LinkedIn outreach — it sends the CV upload email after a candidate registers",
            "✍️ Manual emails: Open a candidate profile → Email tab → compose and send a one-off email at any time",
            "📥 Inbound replies: When a candidate replies to your email, it appears in their Email History tab with an unread badge",
            "↩️ Reply in-thread: Click 'Reply' on any email in the history to respond — threads stay grouped by conversation",
            "🤖 Use AI to generate email content — click the AI icon in the compose area for template suggestions",
            "Track email status on each message: Sent → Delivered → Opened → Clicked"
        ],
        commonIssues: [
            {
                issue: "Can't see candidate replies",
                solution: "Replies appear in the candidate's Email tab under Email History. Look for the blue unread dot on their card. You may need to refresh the page."
            },
            {
                issue: "Candidate didn't receive the CV upload email after registering",
                solution: "A 'Screening' workflow must exist and be enabled in Settings > Email Workflows. Without it, no email is sent on registration."
            },
            {
                issue: "Placeholders not replaced in sent emails (e.g. {name} appears literally)",
                solution: "Ensure the candidate profile has all required fields filled in. Check that placeholder variable names in your template match exactly."
            }
        ],
        tips: [
            "Unread replies show a blue dot on the candidate's pipeline card — don't miss them",
            "Reply in-thread to maintain conversation context and keep history tidy",
            "AI-generated templates are a starting point — personalise before sending for best results",
            "Email history per candidate is threaded by conversation, making it easy to follow any exchange"
        ],
        icon: <Inbox className="w-10 h-10" />
    },
    {
        id: 6,
        title: "Schedule & Manage Interviews",
        subtitle: "Sync, Schedule, and Track",
        accentColor: "rose",
        visualLabel: "CALENDAR",
        content: "Schedule interviews directly from the Calendar page or from a candidate's profile. Supports Google Meet (auto-link), Phone, and In-Person. All interviews sync to Google Calendar automatically when connected.",
        detailedSteps: [
            "Go to Calendar in the sidebar — or open a candidate profile and click 'Schedule Interview'",
            "Click any time slot on the calendar to open the scheduling form",
            "Only candidates in the 'Interview' stage appear in the candidate dropdown — move them there first",
            "Choose interview type: Google Meet (auto-generates a meeting link), Phone, or In-Person",
            "Add interviewer name, duration, location/address, and any preparation notes",
            "The candidate receives an interview confirmation email automatically",
            "Drag and drop interviews on the calendar to reschedule — a reschedule email is sent automatically",
            "Click any interview to view details, edit, cancel, or retry a failed calendar sync"
        ],
        commonIssues: [
            {
                issue: "Candidate not appearing in the scheduling dropdown",
                solution: "Only candidates in the 'Interview' stage are shown. Open their profile and move them to Interview stage first."
            },
            {
                issue: "Google Meet link not being generated",
                solution: "Connect Google Calendar in Settings > Integrations first. The Meet link is generated via your connected Google account."
            },
            {
                issue: "'Calendar sync failed' warning on an interview",
                solution: "Open the interview details and click 'Retry sync'. If it keeps failing, reconnect Google Calendar in Settings > Integrations."
            }
        ],
        tips: [
            "Add interview feedback immediately after — use the Feedback tab on the candidate profile while it's fresh",
            "Weekly calendar view gives the clearest overview for scheduling multiple interviews",
            "Slack notifications fire automatically when an interview is scheduled (if Slack is connected)"
        ],
        icon: <Calendar className="w-10 h-10" />
    },
    {
        id: 7,
        title: "Offers, Counter-Offers & E-Signatures",
        subtitle: "Close the Deal Professionally",
        accentColor: "cyan",
        visualLabel: "OFFERS",
        content: "Create professional offer letters and send them with a unique candidate link. Candidates can accept, decline, or submit a counter-offer directly. Optionally require a legally-binding e-signature via Dropbox Sign.",
        detailedSteps: [
            "Go to Offers in the sidebar, or open a candidate profile → Offer tab → 'Create Offer'",
            "Fill in: Position Title, Salary (amount, currency, period), Start Date, Benefits, and Expiry Date",
            "Add offer notes or a personalised message for the candidate",
            "✍️ E-Signature: Toggle 'Require e-Signature' to send via Dropbox Sign — the candidate signs digitally and you receive a signed PDF",
            "Click Send — the candidate gets an email with a unique offer link",
            "Candidate can: Accept the offer, Decline it, or submit a Counter Offer with proposed terms",
            "Counter offers show negotiation details — review and respond from the Offers page",
            "Accepted offers automatically move the candidate to 'Hired' stage"
        ],
        commonIssues: [
            {
                issue: "Can't move a candidate to 'Offer' stage",
                solution: "You must create and send an offer first. The Offer stage requires an active offer linked to the candidate."
            },
            {
                issue: "The offer link has expired",
                solution: "Edit the offer to extend the expiry date, save, and re-send the offer email to the candidate."
            },
            {
                issue: "E-signature email not received by candidate",
                solution: "Ask them to check spam — the Dropbox Sign email comes from a Dropbox address, not CoreflowHR. You can resend the signing request from the Offers page."
            }
        ],
        tips: [
            "Set an expiry date to create urgency — 3 to 5 business days is a common standard",
            "All negotiation rounds are tracked in the offer history — you can see every counter offer exchanged",
            "Once signed via Dropbox Sign, the offer status updates to 'Signed' automatically",
            "You receive a Slack notification when a candidate accepts, declines, or sends a counter offer (if Slack is connected)"
        ],
        icon: <FileText className="w-10 h-10" />
    },
    {
        id: 8,
        title: "AI Scoring & Reports",
        subtitle: "Data-Driven Hiring Decisions",
        accentColor: "slate",
        visualLabel: "REPORTS",
        content: "Use AI match scores to instantly prioritise candidates, and track recruitment performance with the full Reports page. Export data to CSV for client reporting or deeper analysis.",
        detailedSteps: [
            "🤖 AI Scores: Upload a candidate's CV → AI parses skills, experience, and education → calculates a match score (0–100) against the job's required skills",
            "Scores are colour-coded on candidate cards: green (strong match), amber (partial), red (weak)",
            "Filter candidates by score range on the Kanban board to surface top talent quickly",
            "📊 Reports: Go to Reports in the sidebar",
            "View metrics: candidates by stage, hiring funnel breakdown, jobs overview, and time-to-fill",
            "Set a date range using the date pickers, then click 'Download Report' to export as CSV",
            "Dashboard metrics (active jobs, pipeline totals, avg time-to-fill) update in real time as you work"
        ],
        commonIssues: [
            {
                issue: "AI score is 0 or not showing on a candidate",
                solution: "Two things are required: (1) the candidate's CV must be uploaded and parsed, and (2) the job must have skills defined. Both must be present for the AI to score."
            },
            {
                issue: "CV upload fails or doesn't parse",
                solution: "Ensure the file isn't password-protected or corrupted. Supported formats: PDF, DOC, DOCX. Maximum file size is 10MB."
            },
            {
                issue: "Reports page showing empty or zero data",
                solution: "Reports pull from Active jobs only. Ensure you have Active jobs with candidates in your pipeline. Try widening your date range."
            }
        ],
        tips: [
            "Specific job skills produce far more accurate AI scores — 'Python 3' beats 'programming'",
            "Use the Reports page to share hiring progress with clients or leadership — export a clean CSV",
            "AI scores are a guide, not a decision — always review the full CV alongside the score",
            "Dashboard metrics update live as you move candidates through stages"
        ],
        icon: <TrendingUp className="w-10 h-10" />
    },
    {
        id: 9,
        title: "Integrations & Slack Notifications",
        subtitle: "Stay Connected Across Your Tools",
        accentColor: "indigo",
        visualLabel: "INTEGRATIONS",
        content: "Connect CoreflowHR to the tools your team already uses. Slack delivers real-time hiring notifications to your channel. Google Calendar syncs every interview automatically.",
        detailedSteps: [
            "Go to Settings > Integrations",
            "📅 Google Calendar: Click 'Connect' → authorise with your Google account → all interviews sync automatically from that point",
            "💬 Slack: Click 'Connect Slack' → in your Slack workspace go to Apps > Incoming Webhooks > Add New → copy the webhook URL → paste it in CoreflowHR",
            "Once Slack is connected, notifications fire for: candidate stage changes, interviews scheduled, offers sent, and offer responses (accepted / declined / counter-offer)",
            "Each team member connects their own Google Calendar — it's per-user, not workspace-wide",
            "Disconnect any integration at any time from the same Settings > Integrations page"
        ],
        commonIssues: [
            {
                issue: "Google Calendar not syncing interviews",
                solution: "Check the integration is connected in Settings > Integrations. For individual interviews that failed, open the interview details and click 'Retry sync'."
            },
            {
                issue: "Slack notifications not appearing",
                solution: "Verify the webhook URL in Settings starts with https://hooks.slack.com/. Test it by moving a candidate to a new stage. If no notification appears, regenerate the webhook in Slack and re-paste."
            },
            {
                issue: "Slack webhook URL shows an error when saving",
                solution: "The URL must start exactly with https://hooks.slack.com/services/. Go to your Slack workspace > Apps > Incoming Webhooks to generate a valid URL."
            }
        ],
        tips: [
            "Create a dedicated #recruiting Slack channel so hiring notifications don't clutter other channels",
            "Slack notifications are non-blocking — they never delay any action even if Slack is temporarily down",
            "Google Calendar is per-user — if you have multiple team members, each connects their own account",
            "Microsoft Teams integration is coming soon — watch for updates in Settings > Integrations"
        ],
        icon: <Zap className="w-10 h-10" />
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
            // Mark as completed first and wait for it to complete
            await markOnboardingCompleted();
            // Immediately redirect to dashboard - no completion screen
            // Using window.location.replace to force a full page reload and prevent back button issues
            window.location.replace('/dashboard');
        } catch (error) {
            console.error('Error completing onboarding:', error);
            // Even if there's an error, try to redirect to dashboard
            window.location.replace('/dashboard');
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
                                                        {String(i + 1).padStart(2, '0')}
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
