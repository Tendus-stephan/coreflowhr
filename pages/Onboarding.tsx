import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { 
    ChevronRight, ChevronLeft, X, Users, Briefcase, Mail, 
    Calendar, FileText, Sparkles, BarChart3, CheckCircle,
    AlertCircle, Info, ArrowRight, ExternalLink, HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

interface Slide {
    id: number;
    title: string;
    content: string;
    detailedSteps?: string[];
    commonIssues?: { issue: string; solution: string }[];
    icon: React.ReactNode;
    visual?: string;
    tips?: string[];
}

const slides: Slide[] = [
    {
        id: 1,
        title: "Welcome to CoreFlow!",
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
                solution: "Check if you're on a public page (like login). The sidebar only appears on authenticated pages. Make sure you're logged in."
            },
            {
                issue: "Page is blank or not loading",
                solution: "Refresh the page (Ctrl+R or Cmd+R). If the issue persists, check your internet connection and clear your browser cache."
            },
            {
                issue: "Getting 'Not authenticated' errors",
                solution: "Your session may have expired. Log out and log back in. If the problem continues, check that cookies are enabled in your browser."
            }
        ],
        tips: [
            "Bookmark the Dashboard page for quick access",
            "Use keyboard shortcuts: Ctrl+K (or Cmd+K) to search",
            "Check the notification bell icon for important updates"
        ],
        icon: <Sparkles className="w-12 h-12 text-black" />
    },
    {
        id: 2,
        title: "Manage Your Candidate Pipeline",
        content: "Visualize your recruitment process with our Kanban board. Move candidates through stages: New → Screening → Interview → Offer → Hired. Each candidate shows an AI match score to help you prioritize.",
        detailedSteps: [
            "Go to the Candidates page from the sidebar",
            "View candidates organized in columns by stage: New, Screening, Interview, Offer, Hired, Rejected",
            "Click and drag a candidate card to move them between stages",
            "Click on a candidate card to view full details and take actions",
            "Use the search bar to find specific candidates by name, email, or skills",
            "Filter candidates by job, stage, or AI match score",
            "The AI match score (0-100) appears on each candidate card - higher scores indicate better fit"
        ],
        commonIssues: [
            {
                issue: "Can't move candidate to a stage",
                solution: "You must create an email workflow for that stage first. Go to Settings > Email Workflows and create a workflow for the target stage. For 'Offer' stage, you also need to create an offer for the candidate first."
            },
            {
                issue: "AI match score not showing",
                solution: "The candidate needs a CV uploaded and the job needs skills defined. Upload the candidate's CV and ensure the job has required skills listed. The score will calculate automatically."
            },
            {
                issue: "Candidate stuck in 'New' stage",
                solution: "Candidates in 'New' stage must upload their CV first. They cannot be manually moved. Once they upload a CV, they automatically move to 'Screening' stage."
            },
            {
                issue: "Can't see all candidates",
                solution: "Check your filters - you may have a job or stage filter active. Clear filters or select 'All' to see all candidates. Also check if candidates are from closed jobs (they're hidden by default)."
            }
        ],
        tips: [
            "Use the bulk actions feature to move multiple candidates at once",
            "The color-coded AI scores help you quickly identify top candidates",
            "Right-click on a candidate card for quick actions menu",
            "Export candidate data using the download button"
        ],
        icon: <Users className="w-12 h-12 text-black" />
    },
    {
        id: 3,
        title: "Create and Manage Job Postings",
        content: "Post jobs, track applicants, and manage job statuses (Draft, Active, Closed). Generate public application links that candidates can use to apply directly. All your jobs in one place.",
        detailedSteps: [
            "Click 'New Job' button or go to Jobs page and click 'Create Job'",
            "Fill in job details: Title, Department, Location, Type (Full-time/Contract/Part-time)",
            "Add required skills - these are used for AI match scoring",
            "Set job status: Draft (not visible), Active (accepting applications), or Closed",
            "Save as Draft to work on it later, or set to Active to publish immediately",
            "Once Active, copy the public application link to share with candidates",
            "View all applicants for a job by clicking on the job card",
            "Close a job when the position is filled or no longer needed"
        ],
        commonIssues: [
            {
                issue: "Can't create a new job",
                solution: "Make sure all required fields are filled (Title, Location are mandatory). Check that you have an active subscription. If you see an error, refresh the page and try again."
            },
            {
                issue: "Public application link not working",
                solution: "The job must be set to 'Active' status. Draft jobs don't have working application links. Also ensure the link is copied completely - it should start with your domain URL."
            },
            {
                issue: "Can't see applicants for a job",
                solution: "Click on the job card to open the job details modal. Applicants are listed in the 'Candidates' tab. If you don't see any, no one has applied yet or the job is still in Draft status."
            },
            {
                issue: "Job disappeared from the list",
                solution: "Check your filter tabs - you might be viewing only 'Active' jobs. Switch to 'All' or 'Closed' tabs. Also, closed jobs are hidden from the Candidates page by default."
            },
            {
                issue: "Can't change job status",
                solution: "Make sure you're the owner of the job. Only the user who created the job can modify it. If you're getting an error, try refreshing the page."
            }
        ],
        tips: [
            "Use Draft status to prepare jobs before publishing",
            "Add detailed skills to improve AI matching accuracy",
            "The application link can be shared on job boards, social media, or your website",
            "Close jobs when filled to keep your dashboard clean"
        ],
        icon: <Briefcase className="w-12 h-12 text-black" />
    },
    {
        id: 4,
        title: "Automated Email Workflows",
        content: "Set up stage-based email automation to keep candidates engaged. Customize templates, use AI to generate content, and track all email communications in one place.",
        detailedSteps: [
            "Go to Settings > Email Workflows",
            "Click 'Create Workflow' to set up automated emails",
            "Select the trigger stage (when candidate moves to this stage, email is sent)",
            "Choose or create an email template for this workflow",
            "Set optional conditions: minimum AI match score, source filter",
            "Enable the workflow and set delay (if you want to send after X minutes)",
            "Test the workflow by moving a test candidate to the trigger stage",
            "View email history in the candidate's profile to see all sent emails",
            "Edit templates anytime - changes apply to future emails only"
        ],
        commonIssues: [
            {
                issue: "Emails not being sent automatically",
                solution: "Check that: 1) A workflow exists for the target stage, 2) The workflow is enabled, 3) An email template is assigned, 4) The candidate has a valid email address. Go to Settings > Email Workflows to verify."
            },
            {
                issue: "Placeholders showing in emails (like {candidate_name})",
                solution: "This means the template has placeholders that weren't replaced. Check that the candidate has all required data (name, email, etc.). Edit the template to use correct placeholder names or remove unused placeholders."
            },
            {
                issue: "Duplicate emails being sent",
                solution: "This can happen if a candidate is moved to a stage multiple times quickly. The system prevents duplicates within 5 minutes. If you see duplicates, check your workflow settings - you might have multiple workflows for the same stage."
            },
            {
                issue: "Can't create a workflow",
                solution: "You need to create an email template first. Go to Settings > Email Templates, create a template, then return to create the workflow. Also ensure you have an active subscription."
            },
            {
                issue: "Email template not found",
                solution: "The template might have been deleted. Go to Settings > Email Templates and check if it exists. If not, create a new one and update your workflow to use it."
            }
        ],
        tips: [
            "Create workflows for all stages to automate your entire process",
            "Use AI-generated content to save time writing emails",
            "Test workflows with a test candidate before using with real candidates",
            "Review email logs regularly to ensure emails are being sent",
            "Use placeholders like {candidate_name}, {job_title} to personalize emails"
        ],
        icon: <Mail className="w-12 h-12 text-black" />
    },
    {
        id: 5,
        title: "Schedule and Manage Interviews",
        content: "Use the calendar view to schedule interviews (monthly, weekly, or daily). Reschedule by dragging and dropping. Integrate with Google Meet for video calls and collect interview feedback.",
        detailedSteps: [
            "Go to the Calendar page from the sidebar",
            "Switch between Monthly, Weekly, or Daily view using the view selector",
            "Click on a date/time slot to schedule a new interview",
            "Select the candidate from the dropdown (only candidates in 'Interview' stage appear)",
            "Choose interview type: In-person, Video (Google Meet), or Phone",
            "For video interviews, a Google Meet link is automatically generated",
            "Add interview location/address for in-person interviews",
            "Set interview duration and add notes/agenda",
            "Drag and drop interviews on the calendar to reschedule",
            "Click on an interview to view details, edit, or cancel",
            "After the interview, add feedback and scorecard from the interview details"
        ],
        commonIssues: [
            {
                issue: "Can't schedule an interview",
                solution: "The candidate must be in 'Interview' stage first. Move them to Interview stage from the Candidates page. Also ensure you have an email workflow configured for the Interview stage."
            },
            {
                issue: "Google Meet link not generating",
                solution: "Check that Google Calendar integration is connected in Settings > Integrations. You may need to reconnect your Google account. Also ensure you have calendar permissions enabled."
            },
            {
                issue: "Can't see candidate in interview dropdown",
                solution: "Only candidates in 'Interview' stage appear. Move the candidate to Interview stage first. Also check that the candidate belongs to an active job (not a closed job)."
            },
            {
                issue: "Can't drag and drop to reschedule",
                solution: "Make sure you're clicking and holding on the interview card, not just clicking. On mobile, use the edit button instead. Also check that you have permission to edit the interview."
            },
            {
                issue: "Interview reminders not being sent",
                solution: "Interview reminders are sent via email workflows. Ensure you have an email workflow configured for the Interview stage. Check Settings > Email Workflows."
            }
        ],
        tips: [
            "Use the weekly view for detailed scheduling",
            "Set up interview reminders in email workflows",
            "Add interview feedback immediately after the interview while it's fresh",
            "Use color coding or tags to organize different interview types",
            "Export your calendar to sync with external calendar apps"
        ],
        icon: <Calendar className="w-12 h-12 text-black" />
    },
    {
        id: 6,
        title: "Send and Track Job Offers",
        content: "Create professional offer letters, send them via email, and track candidate responses. Support counter offers and automatically update candidate stages when offers are accepted or declined.",
        detailedSteps: [
            "Go to the Offers page or create an offer from a candidate's profile",
            "Click 'Create Offer' and select the candidate",
            "Fill in offer details: Position, Salary, Start Date, Benefits, Notes",
            "Choose an offer template or create a custom offer letter",
            "Review the offer - placeholders like {salary_amount} will be replaced automatically",
            "Click 'Send Offer' to email it to the candidate",
            "The candidate receives an email with a secure link to view and respond",
            "Track offer status: Draft, Sent, Viewed, Accepted, Declined, or Negotiating",
            "If candidate counters, review their proposal and create a new offer",
            "When accepted, candidate automatically moves to 'Hired' stage and receives hired email",
            "When declined, candidate automatically moves to 'Rejected' stage"
        ],
        commonIssues: [
            {
                issue: "Can't create an offer",
                solution: "The candidate must be in 'Interview' or 'Offer' stage. Move them to one of these stages first. Also ensure the candidate has a valid email address."
            },
            {
                issue: "Offer email not being sent",
                solution: "Check that: 1) Candidate has a valid email, 2) Email service is configured (check Settings), 3) No email errors in the email logs. Go to candidate profile > Email History to see sent emails."
            },
            {
                issue: "Candidate can't access offer link",
                solution: "Offer links expire after the expiration date set. Check if the offer has expired. Also ensure the link was copied completely. The candidate should click the link directly from their email."
            },
            {
                issue: "Placeholders showing in offer email",
                solution: "This means offer-specific placeholders weren't replaced. Ensure the offer has all required fields filled (salary, start date, etc.). Edit the offer template to use correct placeholder names."
            },
            {
                issue: "Can't move candidate to Offer stage",
                solution: "You must create an offer for the candidate first. The system requires an active offer before allowing movement to Offer stage. Create the offer, then move the candidate."
            },
            {
                issue: "Counter offer not showing",
                solution: "Counter offers appear in the offer's negotiation history. Open the offer details to see the full negotiation timeline. The candidate's proposed changes are listed there."
            }
        ],
        tips: [
            "Always review offer details before sending",
            "Set an expiration date to create urgency",
            "Use offer templates to save time",
            "Track all offer communications in the negotiation history",
            "Create a new offer when responding to counter offers"
        ],
        icon: <FileText className="w-12 h-12 text-black" />
    },
    {
        id: 7,
        title: "AI-Powered Candidate Matching",
        content: "Our AI analyzes candidate CVs and calculates match scores based on job requirements. Get instant insights into candidate skills, experience, and fit for each role.",
        detailedSteps: [
            "Upload candidate CVs when they apply or manually add them",
            "Ensure jobs have required skills defined (these are used for matching)",
            "AI automatically parses CVs to extract: skills, experience, education, work history",
            "Match score (0-100) is calculated by comparing candidate skills to job requirements",
            "View AI match score on candidate cards (color-coded: Green 80+, Yellow 60-79, Orange 40-59, Red <40)",
            "Click on a candidate to see detailed AI analysis and skill breakdown",
            "Scores update automatically when job skills or candidate CVs change",
            "Use the score to prioritize which candidates to interview first",
            "Filter candidates by match score range to find top candidates quickly"
        ],
        commonIssues: [
            {
                issue: "AI match score not showing",
                solution: "The candidate needs a CV uploaded AND the job needs skills defined. Upload the candidate's CV file and ensure the job has at least one required skill listed. The score calculates automatically after both are present."
            },
            {
                issue: "Score seems incorrect",
                solution: "Scores are based on skill matching. Ensure the job has accurate required skills listed. The candidate's CV must have been parsed correctly - check the candidate's skills list. Scores update when you modify job skills or re-upload CVs."
            },
            {
                issue: "CV not being parsed",
                solution: "Supported formats: PDF, DOC, DOCX. Ensure the file is not corrupted or password-protected. Large files (>10MB) may take longer. Check the candidate's profile to see if skills were extracted."
            },
            {
                issue: "Skills not extracted from CV",
                solution: "The CV might not have clear skill listings. Try a different CV format or manually add skills to the candidate profile. The AI looks for common technical skills and keywords."
            },
            {
                issue: "Score is 0 or null",
                solution: "This usually means: 1) No skills match between candidate and job, 2) Job has no skills defined, 3) Candidate CV wasn't parsed. Check both the job skills and candidate skills lists."
            }
        ],
        tips: [
            "Define detailed job skills for more accurate matching",
            "Review AI analysis to understand why a score was given",
            "Use scores as a guide, not the only factor in hiring decisions",
            "Scores update in real-time as you modify job requirements",
            "Filter by score range to quickly find top candidates"
        ],
        icon: <Sparkles className="w-12 h-12 text-black" />
    },
    {
        id: 8,
        title: "Track Your Recruitment Metrics",
        content: "Monitor key metrics on your dashboard: active jobs, total candidates, average time to fill, and more. View your activity feed to see everything that's happening in real-time.",
        detailedSteps: [
            "Access the Dashboard from the sidebar (home icon)",
            "View key metrics at the top: Active Jobs, Total Candidates, Qualified Candidates, Avg Time to Fill",
            "Check the Activity Feed to see recent actions: candidate moves, job posts, emails sent, etc.",
            "View upcoming interviews in the calendar widget",
            "See recent candidates and jobs in the quick access sections",
            "Use bulk actions to move multiple candidates at once",
            "Filter activity feed by date range or action type",
            "Export metrics data for reporting (coming soon)",
            "Metrics update in real-time as you perform actions"
        ],
        commonIssues: [
            {
                issue: "Metrics showing zero or incorrect numbers",
                solution: "Metrics only count active jobs (not closed). Closed jobs and their candidates are excluded. Also ensure you're viewing your own data - metrics are user-specific. Refresh the page if numbers seem stale."
            },
            {
                issue: "Activity feed not showing recent actions",
                solution: "Activity feed shows actions from the current user only. If you don't see an action, it might have been performed by another user. Refresh the page to load latest activities."
            },
            {
                issue: "Avg Time to Fill seems wrong",
                solution: "This metric calculates average time from when a candidate applies to when they're moved to 'Hired' stage. It only includes candidates who reached Hired stage. If you have no hired candidates yet, it will show 0 or N/A."
            },
            {
                issue: "Can't see all candidates on dashboard",
                solution: "The dashboard shows a summary view. Go to the Candidates page to see the full list. The dashboard only shows recent or highlighted candidates."
            },
            {
                issue: "Notifications not appearing",
                solution: "Check the notification bell icon in the top right. Ensure your browser allows notifications. Also check Settings > Notifications to ensure email notifications are enabled."
            }
        ],
        tips: [
            "Check the dashboard daily to stay on top of your recruitment pipeline",
            "Use the activity feed to track all system changes",
            "Monitor Avg Time to Fill to improve your hiring process",
            "Set up email notifications for important events",
            "Use bulk actions to efficiently manage multiple candidates"
        ],
        icon: <BarChart3 className="w-12 h-12 text-black" />
    }
];

const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [completed, setCompleted] = useState(false);

    // Check if onboarding already completed
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                const { supabase } = await import('../services/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('onboarding_completed')
                        .eq('id', user.id)
                        .single();
                    
                    if (profile?.onboarding_completed) {
                        // Already completed, redirect to dashboard
                        navigate('/dashboard');
                    }
                }
            } catch (error) {
                console.error('Error checking onboarding status:', error);
            }
        };
        checkOnboardingStatus();
    }, [navigate]);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const handleSkip = async () => {
        // Mark as completed even if skipped
        try {
            await markOnboardingCompleted();
        } catch (error) {
            console.error('Error marking onboarding as completed:', error);
        }
        // Redirect to dashboard immediately when skipped
        navigate('/dashboard', { replace: true });
    };

    const handleComplete = async () => {
        setCompleted(true);
        try {
            await markOnboardingCompleted();
            // Small delay to show completion state, then redirect to dashboard
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 1500);
        } catch (error) {
            console.error('Error completing onboarding:', error);
            // Even if marking as completed fails, redirect to dashboard
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 1500);
        }
    };

    const markOnboardingCompleted = async () => {
        try {
            // Update user profile to mark onboarding as completed
            const { supabase } = await import('../services/supabase');
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .update({
                        onboarding_completed: true,
                        onboarding_completed_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
            }
        } catch (error) {
            console.error('Error marking onboarding as completed:', error);
            // Don't block navigation if update fails
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrevious();
            } else if (e.key === 'Escape') {
                handleSkip();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentSlide]);

    const slide = slides[currentSlide];
    const progress = ((currentSlide + 1) / slides.length) * 100;

    if (completed) {
        // Show completion message briefly, then redirect happens automatically
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">All Set!</h2>
                    <p className="text-gray-600 mb-6">You're ready to start using CoreFlow. Redirecting to your dashboard...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-black h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">If you're not redirected automatically, <button onClick={() => navigate('/dashboard', { replace: true })} className="text-black underline">click here</button></p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden">
                {/* Header */}
                <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                            <span className="text-black font-bold text-sm">CF</span>
                        </div>
                        <h1 className="text-lg font-bold">CoreFlow Tutorial</h1>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                        title="Skip Tutorial (ESC)"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-gray-200">
                    <div 
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Slide Content */}
                <div className="p-8 md:p-12 max-h-[70vh] overflow-y-auto">
                    <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
                        {/* Icon/Visual */}
                        <div className="flex-shrink-0">
                            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center">
                                {slide.icon}
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="flex-1">
                            <div className="mb-2 text-sm font-medium text-gray-500">
                                Step {currentSlide + 1} of {slides.length}
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                {slide.title}
                            </h2>
                            <p className="text-lg text-gray-600 leading-relaxed mb-6">
                                {slide.content}
                            </p>

                            {/* Detailed Steps */}
                            {slide.detailedSteps && slide.detailedSteps.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">How to Use:</h3>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                        {slide.detailedSteps.map((step, idx) => (
                                            <li key={idx} className="pl-2">{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Common Issues & Solutions */}
                            {slide.commonIssues && slide.commonIssues.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="w-5 h-5 text-orange-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">Common Issues & Solutions:</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {slide.commonIssues.map((item, idx) => (
                                            <div key={idx} className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                                                <div className="font-semibold text-gray-900 mb-1 flex items-start gap-2">
                                                    <HelpCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                                    <span>{item.issue}</span>
                                                </div>
                                                <div className="text-gray-700 ml-6">
                                                    <strong>Solution:</strong> {item.solution}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            {slide.tips && slide.tips.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">Pro Tips:</h3>
                                    </div>
                                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                                        {slide.tips.map((tip, idx) => (
                                            <li key={idx} className="pl-2">{tip}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2 mb-8">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                    index === currentSlide
                                        ? 'bg-black w-8'
                                        : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentSlide === 0}
                        className="flex items-center gap-2"
                    >
                        <ChevronLeft size={18} />
                        Previous
                    </Button>

                    <div className="text-sm text-gray-500">
                        {currentSlide + 1} / {slides.length}
                    </div>

                    <Button
                        variant="black"
                        onClick={handleNext}
                        className="flex items-center gap-2"
                    >
                        {currentSlide === slides.length - 1 ? (
                            <>
                                Complete
                                <CheckCircle size={18} />
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight size={18} />
                            </>
                        )}
                    </Button>
                </div>

                {/* Keyboard Hints */}
                <div className="px-6 py-2 bg-gray-100 border-t border-gray-200 text-xs text-gray-500 text-center">
                    Use ← → arrow keys to navigate • Press ESC to skip • Scroll down for detailed instructions
                </div>
            </div>
        </div>
    );
};

export default Onboarding;

