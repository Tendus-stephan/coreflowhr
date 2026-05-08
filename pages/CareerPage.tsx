import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { MapPin, Search, ChevronRight, Building2 } from 'lucide-react';

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

// Soft, non-outlined type badge colours
const typeBadge: Record<string, string> = {
    'Full-time':  'bg-emerald-50 text-emerald-700',
    'Part-time':  'bg-sky-50     text-sky-700',
    'Contract':   'bg-amber-50   text-amber-700',
    'Internship': 'bg-violet-50  text-violet-700',
    'Remote':     'bg-gray-100   text-gray-600',
};

// Deterministic gradient from first char — used when no cover image
const coverGradients = [
    'linear-gradient(135deg,#1e3a5f 0%,#2d6a9f 100%)',
    'linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)',
    'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',
    'linear-gradient(135deg,#141e30 0%,#243b55 100%)',
    'linear-gradient(135deg,#0d1117 0%,#1b2a41 100%)',
];
function pickGradient(name: string) {
    const idx = name.charCodeAt(0) % coverGradients.length;
    return coverGradients[idx];
}

// Strip "General" / null — only real departments get shown
const realDept = (d?: string | null) =>
    d && d.toLowerCase() !== 'general' ? d : null;

const CareerPage: React.FC = () => {
    const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
    const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
    const [jobs, setJobs]           = useState<JobListing[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [query, setQuery]         = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    // ── Data fetch (unchanged) ─────────────────────────────────────────────
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

    // ── Filter pills: unique real departments + unique types ───────────────
    const filterPills = useMemo(() => {
        const depts = [...new Set(jobs.map(j => realDept(j.department)).filter(Boolean))] as string[];
        const types = [...new Set(jobs.map(j => j.type).filter(Boolean))] as string[];
        return ['All', ...depts, ...types];
    }, [jobs]);

    // ── Filtered list ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = jobs;

        if (activeFilter !== 'All') {
            list = list.filter(j =>
                realDept(j.department) === activeFilter || j.type === activeFilter
            );
        }

        if (query.trim()) {
            const q = query.toLowerCase();
            list = list.filter(j =>
                j.title.toLowerCase().includes(q) ||
                (j.location || '').toLowerCase().includes(q) ||
                (realDept(j.department) || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [jobs, activeFilter, query]);

    // ── Loading ────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
            </div>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────
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

    const gradient = pickGradient(workspace.name);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">

            {/* ── 1. COMPANY HEADER ──────────────────────────────────────────── */}
            <div className="relative">
                {/* Cover banner */}
                <div
                    className="w-full h-44 sm:h-52"
                    style={{ background: gradient }}
                />

                {/* Logo + info row — overlaps banner */}
                <div className="max-w-3xl mx-auto px-6">
                    <div className="relative -mt-10 flex items-end gap-5 pb-5 border-b border-gray-200 bg-white px-6 pt-0 rounded-b-2xl shadow-sm">

                        {/* Logo bubble */}
                        <div
                            className="flex-shrink-0 w-20 h-20 rounded-2xl border-4 border-white shadow-md -mt-10 flex items-center justify-center bg-white overflow-hidden"
                            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                        >
                            {workspace.company_logo_url ? (
                                <img
                                    src={workspace.company_logo_url}
                                    alt={workspace.name}
                                    className="w-full h-full object-contain p-1.5"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center rounded-xl"
                                    style={{ background: gradient }}
                                >
                                    <span className="text-white text-2xl font-extrabold">
                                        {workspace.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Name + description */}
                        <div className="flex-1 min-w-0 pt-2 pb-1">
                            <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">
                                {workspace.name}
                            </h1>
                            {workspace.company_description && (
                                <p className="text-sm text-gray-500 mt-0.5 leading-snug line-clamp-2">
                                    {workspace.company_description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. HEADING BLOCK ───────────────────────────────────────────── */}
            <div className="max-w-3xl mx-auto px-6 pt-9 pb-2">
                <h2 className="text-2xl font-semibold text-gray-900 leading-tight">
                    Open positions
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                    {jobs.length > 0
                        ? `${jobs.length} open role${jobs.length !== 1 ? 's' : ''}`
                        : 'No open roles right now'}
                </p>
            </div>

            {/* ── 3. SEARCH + FILTERS ────────────────────────────────────────── */}
            <div className="max-w-3xl mx-auto px-6 pt-5 pb-4 space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search roles or locations…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{ height: '44px' }}
                        className="w-full pl-10 pr-4 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all"
                    />
                </div>

                {/* Filter pills — only render if more than just "All" */}
                {filterPills.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {filterPills.map(pill => (
                            <button
                                key={pill}
                                onClick={() => setActiveFilter(pill)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    activeFilter === pill
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-800'
                                }`}
                            >
                                {pill}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── 4. JOB LIST ────────────────────────────────────────────────── */}
            <div className="max-w-3xl mx-auto px-6 pb-16">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                            {jobs.length === 0 ? 'No open positions right now' : 'No roles match your filters'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {jobs.length === 0 ? 'Check back soon.' : 'Try clearing your search or filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
                        {filtered.map((job, i) => {
                            const applyHref = job.slug
                                ? `/jobs/apply/${workspaceSlug}/${job.slug}`
                                : `/jobs/apply/${job.id}`;
                            const dept      = realDept(job.department);
                            const badge     = job.type ? (typeBadge[job.type] ?? 'bg-gray-100 text-gray-600') : null;

                            return (
                                <Link
                                    key={job.id}
                                    to={applyHref}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                                >
                                    {/* Left: title + meta */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-medium text-gray-900 leading-snug group-hover:text-gray-700 transition-colors">
                                            {job.title}
                                        </p>
                                        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                            {job.location && (
                                                <span className="flex items-center gap-1 text-[13px] text-gray-400">
                                                    <MapPin size={11} className="flex-shrink-0" />
                                                    {job.location}
                                                </span>
                                            )}
                                            {badge && job.type && (
                                                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${badge}`}>
                                                    {job.type}
                                                </span>
                                            )}
                                            {dept && (
                                                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                    {dept}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: View role */}
                                    <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-gray-700 transition-colors whitespace-nowrap">
                                        View role
                                        <ChevronRight size={14} />
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── 5. FOOTER BADGE ────────────────────────────────────────────── */}
            <div className="flex justify-center pb-10">
                <a
                    href="https://www.coreflowhr.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all shadow-sm"
                >
                    <img
                        src="/assets/images/coreflow-favicon-logo.png"
                        alt="CoreflowHR"
                        className="w-4 h-4 object-contain"
                    />
                    Powered by CoreflowHR
                </a>
            </div>

        </div>
    );
};

export default CareerPage;
