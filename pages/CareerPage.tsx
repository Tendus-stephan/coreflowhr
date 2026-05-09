import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { MapPin, Search, ChevronRight, Building2 } from 'lucide-react';
import { darkenHex } from '../utils/colorUtils';

interface WorkspaceInfo {
    id: string;
    name: string;
    company_logo_url?: string | null;
    company_description?: string | null;
    banner_color?: string | null;
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


const DEFAULT_BANNER = '#1e3a5f';
const buildGradient = (color: string) =>
    `linear-gradient(135deg, ${color} 0%, ${darkenHex(color, 38)} 100%)`;

// Strip null / "General" — only real departments shown
const realDept = (d?: string | null) => (d && d.toLowerCase() !== 'general' ? d : null);

const MAX_W = '780px';

const CareerPage: React.FC = () => {
    const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
    const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
    const [jobs, setJobs]           = useState<JobListing[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [query, setQuery]         = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [logoErr, setLogoErr]     = useState(false);

    // ── Data fetch (no logic changes) ─────────────────────────────────────
    useEffect(() => {
        if (!workspaceSlug) { setError('Invalid careers page link.'); setLoading(false); return; }

        const load = async () => {
            try {
                const { data: ws, error: wsErr } = await supabase
                    .from('workspaces')
                    .select('id, name, company_logo_url, slug')
                    .eq('slug', workspaceSlug)
                    .single();

                if (wsErr || !ws) { setError('This careers page could not be found.'); setLoading(false); return; }

                // Fetch optional columns separately — non-fatal if migrations not yet applied
                let desc: string | null = null;
                let bannerColor: string | null = null;
                try {
                    const { data: extra } = await supabase
                        .from('workspaces')
                        .select('company_description, banner_color')
                        .eq('id', ws.id)
                        .single();
                    desc        = (extra as any)?.company_description ?? null;
                    bannerColor = (extra as any)?.banner_color ?? null;
                } catch { /* non-fatal */ }

                // Prefer client logo when the workspace has exactly one client with a logo set
                let clientLogoUrl: string | null = null;
                try {
                    const { data: clientsWithLogo } = await supabase
                        .from('clients')
                        .select('logo_url')
                        .eq('workspace_id', ws.id)
                        .not('logo_url', 'is', null);
                    if (clientsWithLogo && clientsWithLogo.length === 1) {
                        clientLogoUrl = (clientsWithLogo[0] as any).logo_url ?? null;
                    }
                } catch { /* non-fatal */ }

                setWorkspace({
                    ...(ws as WorkspaceInfo),
                    company_logo_url: clientLogoUrl || (ws as any).company_logo_url || null,
                    company_description: desc,
                    banner_color: bannerColor,
                });

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

    const filterPills = useMemo(() => {
        const depts = [...new Set(jobs.map(j => realDept(j.department)).filter(Boolean))] as string[];
        const types = [...new Set(jobs.map(j => j.type).filter(Boolean))] as string[];
        return ['All', ...depts, ...types];
    }, [jobs]);

    const filtered = useMemo(() => {
        let list = jobs;
        if (activeFilter !== 'All') {
            list = list.filter(j => realDept(j.department) === activeFilter || j.type === activeFilter);
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
            </div>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────
    if (error || !workspace) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                    <Building2 size={22} className="text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-900 mb-1">Page not found</p>
                <p className="text-sm text-gray-400">{error || 'This careers page does not exist.'}</p>
            </div>
        );
    }

    const gradient = buildGradient(workspace.banner_color || DEFAULT_BANNER);

    return (
        <div className="min-h-screen bg-white font-sans">

            {/* ── 1. COMPANY HEADER ──────────────────────────────────────── */}
            <div className="relative">

                {/* Cover banner with curved + faded bottom edge */}
                <div
                    className="relative w-full overflow-hidden"
                    style={{ height: '200px', background: gradient }}
                >
                    {/* Soft curve + fade into page bg */}
                    <div
                        className="absolute inset-x-0 bottom-0"
                        style={{
                            height: '80px',
                            background: 'linear-gradient(to bottom, transparent 0%, #ffffff 100%)',
                            borderRadius: '0 0 0 0',
                        }}
                    />
                    {/* Subtle SVG curve mask at very bottom */}
                    <svg
                        viewBox="0 0 1440 40"
                        className="absolute bottom-0 left-0 w-full"
                        preserveAspectRatio="none"
                        style={{ height: '40px' }}
                    >
                        <path d="M0,40 C480,0 960,0 1440,40 L1440,40 L0,40 Z" fill="#ffffff" />
                    </svg>
                </div>

                {/* Logo + name — relative so it paints above the banner's fade overlay */}
                <div className="mx-auto px-6 relative" style={{ maxWidth: MAX_W }}>
                    <div className="flex items-center gap-4 -mt-10 pb-6">

                        {/* Logo: white rounded bg, shadow, overlaps banner */}
                        <div
                            className="flex-shrink-0 bg-white flex items-center justify-center overflow-hidden"
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: '10px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
                                border: '0.5px solid #e5e7eb',
                            }}
                        >
                            {workspace.company_logo_url && !logoErr ? (
                                <img
                                    src={workspace.company_logo_url}
                                    alt={workspace.name}
                                    className="w-full h-full object-contain p-2"
                                    onError={() => setLogoErr(true)}
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ background: gradient }}
                                >
                                    <span className="text-white text-2xl font-extrabold select-none">
                                        {workspace.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Name + description — plain text, no card/box */}
                        <div className="min-w-0">
                            <h1 className="font-bold text-gray-900 leading-tight" style={{ fontSize: '18px' }}>
                                {workspace.name}
                            </h1>
                            {workspace.company_description && (
                                <p className="text-gray-500 mt-0.5 leading-snug line-clamp-2" style={{ fontSize: '13px' }}>
                                    {workspace.company_description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. HEADING BLOCK ───────────────────────────────────────── */}
            <div className="mx-auto px-6 pb-5" style={{ maxWidth: MAX_W }}>
                <h2 className="text-2xl font-semibold text-gray-900">Open positions</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                    {jobs.length > 0
                        ? `${jobs.length} open role${jobs.length !== 1 ? 's' : ''}`
                        : 'No open roles right now'}
                </p>
            </div>

            {/* ── 3. SEARCH + FILTERS (grouped, 8px gap) ─────────────────── */}
            <div className="mx-auto px-6 pb-5" style={{ maxWidth: MAX_W }}>
                {/* Search — 44px, visible border */}
                <div className="relative" style={{ marginBottom: '8px' }}>
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search roles or locations…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{ height: '44px' }}
                        className="w-full pl-10 pr-4 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100 transition-all"
                    />
                </div>

                {/* Filter pills — standardized height, 8px below search */}
                {filterPills.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {filterPills.map(pill => (
                            <button
                                key={pill}
                                onClick={() => setActiveFilter(pill)}
                                style={{ height: '34px', paddingLeft: '14px', paddingRight: '14px' }}
                                className={`rounded-full text-xs font-medium transition-all whitespace-nowrap ${
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

            {/* ── 4. JOB LIST ────────────────────────────────────────────── */}
            <div className="mx-auto px-6 pb-16" style={{ maxWidth: MAX_W }}>
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
                    <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                        {filtered.map((job, i) => {
                            const applyHref  = job.slug ? `/jobs/apply/${workspaceSlug}/${job.slug}` : `/jobs/apply/${job.id}`;
                            const isLast     = i === filtered.length - 1;

                            return (
                                <Link
                                    key={job.id}
                                    to={applyHref}
                                    className="flex items-center gap-4 px-5 group transition-colors"
                                    style={{
                                        paddingTop: '16px',
                                        paddingBottom: '16px',
                                        borderBottom: isLast ? 'none' : '0.5px solid #f0f0f0',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fafafa')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    {/* Title + meta */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-gray-700 transition-colors" style={{ fontWeight: 500 }}>
                                            {job.title}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1.5">
                                            {job.location && (
                                                <span className="flex items-center gap-1 text-[13px] text-gray-400">
                                                    <MapPin size={11} className="flex-shrink-0" />
                                                    {job.location}
                                                </span>
                                            )}
                                            {job.location && job.type && (
                                                <span className="text-[13px] text-gray-400">·</span>
                                            )}
                                            {job.type && (
                                                <span className="text-[13px] text-gray-400">{job.type}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* View role */}
                                    <span className="flex-shrink-0 flex items-center gap-0.5 text-xs font-medium text-gray-400 group-hover:text-gray-700 transition-colors whitespace-nowrap">
                                        View role <ChevronRight size={14} />
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── 5. FOOTER BADGE ────────────────────────────────────────── */}
            <div className="flex justify-center pb-12">
                <a
                    href="https://www.coreflowhr.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all shadow-sm"
                >
                    <img
                        src="/assets/images/coreflow-favicon-logo.png"
                        alt=""
                        className="w-4 h-4 object-contain opacity-70"
                    />
                    Powered by CoreflowHR
                </a>
            </div>

        </div>
    );
};

export default CareerPage;
