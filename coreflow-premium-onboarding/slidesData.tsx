
import React from 'react';
import { 
    Users, Briefcase, Mail, Calendar, 
    FileText, Sparkles, BarChart3, Rocket
} from 'lucide-react';
import { Slide } from './types';

export const slides: Slide[] = [
    {
        id: 1,
        title: "Welcome to CoreFlow!",
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
        content: "Post jobs, track applicants, and manage job statuses. Generate public application links that candidates can use to apply directly.",
        detailedSteps: [
            "Click 'New Job' or go to Jobs page and click 'Create Job'",
            "Fill in details: Title, Department, Location, Type",
            "Add required skills - used for AI match scoring",
            "Set status: Draft, Active, or Closed",
            "Share the public link once the job is Active"
        ],
        commonIssues: [
            {
                issue: "Public link not working",
                solution: "The job must be set to 'Active' status. Draft jobs don't have working application links."
            },
            {
                issue: "Job disappeared from the list",
                solution: "Check your filters - you might be viewing only 'Active' jobs. Switch to 'All'."
            }
        ],
        tips: [
            "Use Draft status to prepare jobs before publishing",
            "Add detailed skills to improve AI matching accuracy",
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
            "Test with a dummy candidate before going live"
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
        icon: <BarChart3 className="w-10 h-10" />
    }
];
