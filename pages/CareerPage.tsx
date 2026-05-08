import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { MapPin, Search, Plus, Building2 } from 'lucide-react';

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

const typeStyle: Record<string, string> = {
    'Full-time':  'border-emerald-400 text-emerald-700 bg-emerald-50',
    'Part-time':  'border-blue-300   text-blue-700   bg-blue-50',
    'Contract':   'border-orange-300 text-orange-700 bg-orange-50',
    'Internship': 'border-purple-300 text-purple-700 bg-purple-50',
    'Remote':     'border-teal-300   text-teal-700   bg-teal-50',
};

const CareerPage: React.FC = () => {
    const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
    const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
    const [jobs, setJobs]           = useState<JobListing[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [query, setQuery]         = useState('');
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    useEffect(() => {
        if (!workspaceSlug) { setError('Invalid careers page link.'); setLoading(false); return; }

        const load = async () => {
            try {
                const { data: ws, error: wsErr } = await supabase
                    .from('workspaces')
                    .select('id, name, company_logo_url, company_description, slug')
                    .eq('slug', workspaceSlug)
                    .single();

                if (wsErr || !ws) { setError('This careers page could not be found.'); setLoading(false); return; }
                setWorkspace(ws as WorkspaceInfo);

                const { data: jobsData } = await supabase
                    .from('jobs')
                    .select('id, title, department, location, type, slug')
                    .eq('workspace_id', ws.id)
                    .eq('status', 'Active')
                    .neq('title', '__candidate_pool__')
                    .order('created_at', { ascending: false });

                setJobs((jobsData || []) as JobListing[]);
            } catch {
                setError('Something went wrong loading this page.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [workspaceSlug]);

    const filtered = jobs.filter(j => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
            j.title.toLowerCase().includes(q) ||
            (j.location || '').toLowerCase().includes(q) ||
            (j.department || '').toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !workspace) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                    <Building2 size={22} className="text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-900 mb-1">Page not found</p>
                <p className="text-sm text-gray-400">{error || 'This careers page does not exist.'}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans" style={{ background: '#f5f5f3' }}>

            {/* ── Top bar: logo / company name ─────────────────────────── */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
                    {workspace.company_logo_url ? (
                        <img
                            src={workspace.company_logo_url}
                            alt={workspace.name}
                            className="h-9 max-w-[160px] object-contain"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: '#1e3a5f' }}>
                            {workspace.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm font-semibold text-gray-800">{workspace.name}</span>
                </div>
            </div>

            {/* ── Main content ──────────────────────────────────────────── */}
            <div className="max-w-2xl mx-auto px-6 py-12">

                {/* Heading */}
                <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: '#0d1f3c' }}>
                    OPEN POSITIONS
                </h1>
                {workspace.company_description ? (
                    <p className="text-sm text-gray-500 mb-7 leading-relaxed max-w-lg">
                        {workspace.company_description}
                    </p>
                ) : (
                    <p className="text-sm text-gray-400 mb-7">
                        Explore our current openings and find your next role.
                    </p>
                )}

                {/* Search */}
                <div className="relative mb-6">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search roles or locations…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition-colors shadow-sm"
                    />
                </div>

                {/* Job list */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                            {jobs.length === 0 ? 'No open positions right now' : 'No roles match your search'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {jobs.length === 0 ? 'Check back soon for new opportunities.' : 'Try different keywords.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(job => {
                            const applyHref = job.slug
                                ? `/jobs/apply/${workspaceSlug}/${job.slug}`
                                : `/jobs/apply/${job.id}`;
                            const isHovered = hoveredId === job.id;
                            const tStyle = job.type ? (typeStyle[job.type] || 'border-gray-300 text-gray-600 bg-white') : null;

                            return (
                                <Link
                                    key={job.id}
                                    to={applyHref}
                                    onMouseEnter={() => setHoveredId(job.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group"
                                >
                                    {/* Title + meta */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            <span className="text-sm font-bold tracking-wide uppercase" style={{ color: '#0d1f3c' }}>
                                                {job.title}
                                            </span>
                                            {job.department && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                                                    {job.department}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {job.location && (
                                                <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                                    <MapPin size={10} />
                                                    {job.location}
                                                </span>
                                            )}
                                            {tStyle && job.type && (
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${tStyle}`}>
                                                    {job.type}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Apply button */}
                                    <div
                                        className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-150"
                                        style={{
                                            borderColor: isHovered ? '#0d1f3c' : '#d1d5db',
                                            background:  isHovered ? '#0d1f3c' : 'transparent',
                                        }}
                                    >
                                        <Plus size={15} style={{ color: isHovered ? '#fff' : '#9ca3af' }} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-gray-400 pb-10">Powered by CoreflowHR</p>
        </div>
    );
};

export default CareerPage;
