import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { MapPin, Briefcase, Clock, ArrowRight, Building2 } from 'lucide-react';

interface WorkspaceInfo {
    id: string;
    name: string;
    company_logo_url?: string | null;
    company_description?: string | null;
    slug: string;
}

interface JobListing {
    id: string;
    title: string;
    department?: string | null;
    location?: string | null;
    type?: string | null;
    slug?: string | null;
}

const CareerPage: React.FC = () => {
    const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
    const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
    const [jobs, setJobs] = useState<JobListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!workspaceSlug) {
            setError('Invalid careers page link.');
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                const { data: ws, error: wsErr } = await supabase
                    .from('workspaces')
                    .select('id, name, company_logo_url, company_description, slug')
                    .eq('slug', workspaceSlug)
                    .single();

                if (wsErr || !ws) {
                    setError('This careers page could not be found.');
                    setLoading(false);
                    return;
                }

                setWorkspace(ws as WorkspaceInfo);

                const { data: jobsData } = await supabase
                    .from('jobs')
                    .select('id, title, department, location, type, slug')
                    .eq('workspace_id', ws.id)
                    .eq('status', 'Active')
                    .neq('title', '__candidate_pool__')
                    .order('created_at', { ascending: false });

                setJobs((jobsData || []) as JobListing[]);
            } catch (err: any) {
                setError('Something went wrong loading this page.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [workspaceSlug]);

    // Group jobs by department
    const grouped: Record<string, JobListing[]> = {};
    for (const job of jobs) {
        const dept = job.department || 'General';
        if (!grouped[dept]) grouped[dept] = [];
        grouped[dept].push(job);
    }
    const departments = Object.keys(grouped).sort();

    const typeColors: Record<string, string> = {
        'Full-time': 'bg-green-50 text-green-700',
        'Part-time': 'bg-blue-50 text-blue-700',
        'Contract': 'bg-orange-50 text-orange-700',
        'Internship': 'bg-purple-50 text-purple-700',
        'Remote': 'bg-teal-50 text-teal-700',
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !workspace) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                    <Building2 size={22} className="text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-900 mb-2">Page not found</p>
                <p className="text-sm text-gray-500">{error || 'This careers page does not exist.'}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans">
            {/* Header */}
            <div className="border-b border-gray-100 bg-white">
                <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center text-center">
                    {workspace.company_logo_url ? (
                        <img
                            src={workspace.company_logo_url}
                            alt={workspace.name}
                            className="h-14 max-w-[200px] object-contain mb-5"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center mb-5">
                            <span className="text-white text-xl font-bold">
                                {workspace.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{workspace.name}</h1>
                    {workspace.company_description && (
                        <p className="text-sm text-gray-500 max-w-xl leading-relaxed">
                            {workspace.company_description}
                        </p>
                    )}
                </div>
            </div>

            {/* Jobs */}
            <div className="max-w-3xl mx-auto px-6 py-10">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Open Positions</h2>

                {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-xl border border-gray-100">
                        <Briefcase size={28} className="text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">No open positions right now</p>
                        <p className="text-xs text-gray-400">Check back soon for new opportunities.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {departments.map(dept => (
                            <div key={dept}>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    {dept}
                                </h3>
                                <div className="space-y-2">
                                    {grouped[dept].map(job => {
                                        const applyHref = job.slug
                                            ? `/jobs/apply/${workspaceSlug}/${job.slug}`
                                            : `/jobs/apply/${job.id}`;

                                        return (
                                            <Link
                                                key={job.id}
                                                to={applyHref}
                                                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all group"
                                            >
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                                                        {job.title}
                                                    </span>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        {job.location && (
                                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                                <MapPin size={11} />
                                                                {job.location}
                                                            </span>
                                                        )}
                                                        {job.type && (
                                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[job.type] || 'bg-gray-100 text-gray-600'}`}>
                                                                <Clock size={10} />
                                                                {job.type}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-700 flex-shrink-0 ml-4 transition-colors" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-gray-400 pb-10">Powered by CoreflowHR</p>
        </div>
    );
};

export default CareerPage;
