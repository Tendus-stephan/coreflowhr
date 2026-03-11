import React, { useState, useEffect, useMemo } from 'react';
import { toUserError } from '../utils/edgeFunctionError';
import {
  Download, TrendingUp, TrendingDown, Filter, Calendar,
  Users, Briefcase, Target, Loader2, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { PageLoader } from '../components/ui/PageLoader';
import { api } from '../services/api';

const DATE_PRESETS = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
] as const;

function getPresetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

type Metrics = Awaited<ReturnType<typeof api.reports.getMetrics>> | null;

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  padding: '10px 12px',
  fontSize: '12px',
};

// Teal delta badge — matches Figma's +4% pill
const DeltaBadge = ({ value, suffix = '%' }: { value: number; suffix?: string }) => (
  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
    value >= 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-red-100 text-red-600'
  }`}>
    {value >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
    {value >= 0 ? '+' : ''}{value}{suffix}
  </span>
);

// Donut ring — Activity card style
const RingChart = ({ pct, color, label, valueLabel }: { pct: number; color: string; label: string; valueLabel: string }) => {
  const safe = Math.max(0, Math.min(100, pct || 0));
  const data = [{ v: safe }, { v: 100 - safe }];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 88, height: 88 }}>
        <PieChart width={88} height={88}>
          <Pie data={data} cx={40} cy={40} innerRadius={28} outerRadius={40}
            startAngle={90} endAngle={-270} dataKey="v" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="#f3f4f6" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-bold text-gray-900 leading-none">{valueLabel}</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 font-medium text-center leading-tight">{label}</span>
    </div>
  );
};

const Reports: React.FC = () => {
  const [preset, setPreset] = useState<number>(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const { dateFrom, dateTo } = useMemo(() => {
    if (useCustom && customFrom && customTo) {
      return {
        dateFrom: new Date(customFrom).toISOString(),
        dateTo: new Date(customTo + 'T23:59:59').toISOString(),
      };
    }
    const r = getPresetRange(preset);
    return {
      dateFrom: new Date(r.from).toISOString(),
      dateTo: new Date(r.to + 'T23:59:59').toISOString(),
    };
  }, [useCustom, customFrom, customTo, preset]);

  useEffect(() => {
    api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {});
  }, []);

  useEffect(() => {
    api.jobs.list({}).then((res) => {
      const list = res?.data ?? [];
      setJobs(list.map((j: { id: string; title: string }) => ({ id: j.id, title: j.title || 'Untitled' })));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.reports
      .getMetrics({ dateFrom, dateTo, jobId: jobId || undefined })
      .then((data) => { if (!cancelled) setMetrics(data); })
      .catch((err) => {
        if (!cancelled) {
          setError(toUserError(err, 'Unable to load report data. Please check your connection and try again.'));
          setMetrics(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, jobId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { csv, filename } = await api.reports.exportCsv({ dateFrom, dateTo, jobId: jobId || undefined });
      if (!csv) return;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const canExport = userRole === 'Admin' || userRole === 'Recruiter';
  const hasAnyData = metrics && (
    (metrics.timeToHire?.weekly_series?.length ?? 0) > 0 ||
    (metrics.pipelineConversion?.screening_count ?? 0) + (metrics.pipelineConversion?.interview_count ?? 0) +
      (metrics.pipelineConversion?.offer_count ?? 0) + (metrics.pipelineConversion?.hired_count ?? 0) > 0 ||
    ((metrics.offerAcceptance?.counts?.sent ?? 0) + (metrics.offerAcceptance?.counts?.accepted ?? 0) +
      (metrics.offerAcceptance?.counts?.declined ?? 0)) > 0 ||
    (metrics.interviewOfferRatio?.interview_count ?? 0) + (metrics.interviewOfferRatio?.offer_count ?? 0) > 0 ||
    (metrics.sourceQuality?.rows?.length ?? 0) > 0
  );

  const clearFilters = () => { setUseCustom(false); setPreset(30); setJobId(null); };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-100 rounded-xl p-8 max-w-md mx-auto text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => setError(null)}>Try again</Button>
        </div>
      </div>
    );
  }

  // Derived values
  const pc = metrics?.pipelineConversion;
  const tth = metrics?.timeToHire;
  const oa = metrics?.offerAcceptance;
  const ior = metrics?.interviewOfferRatio;
  const sq = metrics?.sourceQuality;

  const totalPipeline = (pc?.screening_count ?? 0) + (pc?.interview_count ?? 0) +
    (pc?.offer_count ?? 0) + (pc?.hired_count ?? 0);

  // Time to hire bar chart — dark bars, purple = latest week
  const tthBarData = (tth?.weekly_series ?? []).map((entry, i, arr) => ({
    week: entry.week
      ? new Date(entry.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : `W${i + 1}`,
    days: entry.avg_days,
    isLatest: i === arr.length - 1,
  }));

  // Source quality grouped bar chart (Analytics 1 style)
  const sourceBarData = (sq?.rows ?? []).map((row) => ({
    name: row.source,
    Interviews: row.interview_count,
    Offers: row.offer_count,
    Hires: row.hired_count,
  }));

  // Ring chart percentages
  const ringInterviewRate = pc && pc.screening_count > 0
    ? Math.round((pc.interview_count / pc.screening_count) * 100) : 0;
  const ringOfferRate = pc && pc.interview_count > 0
    ? Math.round((pc.offer_count / pc.interview_count) * 100) : 0;
  const ringHireRate = oa?.acceptance_rate_pct ?? 0;
  const overallFunnelRate = pc && pc.screening_count > 0
    ? Math.round(((pc.hired_count ?? 0) / pc.screening_count) * 100) : 0;

  return (
    <div className="p-6 pb-12 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Track your hiring performance</p>
        </div>
        {canExport && (
          <Button
            variant="black" size="sm"
            icon={exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            onClick={handleExport}
            disabled={exporting || !hasAnyData}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Date range</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {DATE_PRESETS.map(({ label, days }) => (
              <button key={days} onClick={() => { setUseCustom(false); setPreset(days); }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  !useCustom && preset === days
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}>
                {label}
              </button>
            ))}
            <button onClick={() => setUseCustom(true)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${
                useCustom ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              <Calendar size={12} /> Custom
            </button>
          </div>
          {useCustom && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black" />
            </div>
          )}
          <CustomSelect
            value={jobId ?? ''}
            onChange={(val) => setJobId(val || null)}
            className="px-3 py-1.5 rounded-lg min-w-[160px]"
            options={[{ value: '', label: 'All Jobs' }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]}
          />
          {(jobId || useCustom) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <PageLoader fullScreen={false} />
        </div>
      ) : !hasAnyData ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          {!metrics ? null : (jobId || useCustom) ? (
            <>
              <p className="text-gray-600">No data for the selected filters. Try a different date range or job.</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            </>
          ) : (
            <p className="text-gray-600">
              No hiring data yet. Your metrics will appear here once you start adding candidates and moving them through your pipeline.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'In pipeline', value: totalPipeline, icon: <Users size={18} />, delta: null },
              { label: 'Hired', value: pc?.hired_count ?? 0, icon: <Briefcase size={18} />, delta: null },
              {
                label: 'Acceptance rate',
                value: oa?.acceptance_rate_pct != null ? `${oa.acceptance_rate_pct}%` : '—',
                icon: <Target size={18} />,
                delta: oa?.trend_pct ?? null,
              },
              {
                label: 'Avg time to hire',
                value: tth?.avg_days ? `${tth.avg_days}d` : '—',
                icon: <Clock size={18} />,
                // negate: faster = improvement = positive badge
                delta: tth?.trend_pct != null ? -tth.trend_pct : null,
              },
            ].map(({ label, value, icon, delta }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-5 flex items-start justify-between hover:border-gray-200 transition-colors">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
                  {delta != null && <div className="mt-1.5"><DeltaBadge value={delta} /></div>}
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-900">{icon}</div>
              </div>
            ))}
          </div>

          {/* Row 2: Time to Hire bar + Pipeline rings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Time to Hire — Revenue 2 bar style */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <Clock size={16} className="text-gray-900" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Time to Hire</h3>
                </div>
                {tth?.trend_pct != null && <DeltaBadge value={-tth.trend_pct} />}
              </div>
              <p className="text-xs text-gray-400 mb-3 ml-10">Average days per week to close a hire</p>
              {tth?.avg_days != null && (
                <p className="text-3xl font-bold text-gray-900 tracking-tight mb-4">
                  {tth.avg_days}
                  <span className="text-base font-medium text-gray-400 ml-1">days avg</span>
                </p>
              )}
              {tthBarData.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tthBarData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="week" stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`${val} days`, 'Avg']} />
                      <Bar dataKey="days" radius={[6, 6, 0, 0]}>
                        {tthBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.isLatest ? '#7c3aed' : '#111827'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No weekly data in this period.</p>
              )}
            </div>

            {/* Pipeline Health — Activity donut ring style */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <Target size={16} className="text-gray-900" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Pipeline Health</h3>
              </div>
              <div className="flex items-center justify-around flex-1 py-2">
                <RingChart pct={ringInterviewRate} color="#7c3aed" label="To Interview" valueLabel={`${ringInterviewRate}%`} />
                <RingChart pct={ringOfferRate} color="#84cc16" label="To Offer" valueLabel={`${ringOfferRate}%`} />
                <RingChart pct={ringHireRate} color="#0ea5e9" label="Offer Accepted" valueLabel={`${ringHireRate}%`} />
              </div>
              <div className="mt-5 pt-4 border-t border-gray-50">
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${overallFunnelRate}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Overall funnel efficiency: <span className="font-semibold text-gray-700">{overallFunnelRate}%</span>
                </p>
              </div>
            </div>
          </div>

          {/* Row 3: Source quality grouped bars + Offer/Ratio cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Source quality grouped bar — Analytics 1 style */}
            {sourceBarData.length > 0 && (
              <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <Users size={16} className="text-gray-900" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Source Quality</h3>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm border border-gray-300"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#9ca3af 0,#9ca3af 1px,transparent 0,transparent 50%)', backgroundSize: '4px 4px' }} />
                      Interviews
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-violet-600" />
                      Offers
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-gray-900" />
                      Hires
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-4 ml-10">Interviews · Offers · Hires by candidate source</p>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceBarData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barCategoryGap="25%" barGap={2}>
                      <defs>
                        <pattern id="hatchSrc" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="#9ca3af" strokeWidth="2.5" />
                        </pattern>
                      </defs>
                      <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="Interviews" fill="url(#hatchSrc)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Offers" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Hires" fill="#111827" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Offer acceptance + Interview-offer ratio stacked */}
            <div className={`flex flex-col gap-6 ${sourceBarData.length === 0 ? 'lg:col-span-3 lg:flex-row' : ''}`}>

              {oa?.counts && (oa.counts.sent + oa.counts.accepted + oa.counts.declined) > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl p-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <Briefcase size={16} className="text-gray-900" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">Offer Acceptance</h3>
                    </div>
                    {oa.trend_pct != null && <DeltaBadge value={oa.trend_pct} />}
                  </div>
                  <p className="text-3xl font-bold text-gray-900 tracking-tight mb-4">
                    {oa.acceptance_rate_pct}
                    <span className="text-base font-medium text-gray-400">%</span>
                  </p>
                  <div className="space-y-2.5">
                    {(['accepted', 'sent', 'viewed', 'declined', 'negotiating'] as const).map((k) => {
                      const count = oa.counts![k];
                      if (!count) return null;
                      const dotColors: Record<string, string> = {
                        accepted: 'bg-violet-600', sent: 'bg-gray-900',
                        viewed: 'bg-gray-400', declined: 'bg-red-400', negotiating: 'bg-amber-400',
                      };
                      return (
                        <div key={k} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[k]}`} />
                            <span className="text-xs text-gray-600 capitalize">{k}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-900">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {((ior?.interview_count ?? 0) + (ior?.offer_count ?? 0)) > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl p-6 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <Target size={16} className="text-gray-900" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Interview–Offer Ratio</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 tracking-tight">
                    {ior!.ratio}
                    <span className="text-sm font-medium text-gray-400 ml-1">per offer</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{ior!.interview_count} interviews · {ior!.offer_count} offers</p>
                  {ior?.trend_pct != null && (
                    <div className="mt-3"><DeltaBadge value={ior.trend_pct} /></div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Source quality detail table */}
          {(sq?.rows?.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                  <Users size={18} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Source breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      {['Source', 'Total', 'Interviews', 'Offers', 'Hires', 'Hire rate'].map((h, i) => (
                        <th key={h} className={`py-4 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sq!.rows.map((row) => (
                      <tr key={row.source} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            row.source === 'Sourced' ? 'bg-blue-50 text-blue-700' :
                            row.source === 'Applied' ? 'bg-green-50 text-green-700' :
                            row.source === 'Referred' ? 'bg-purple-50 text-purple-700' :
                            row.source === 'LinkedIn' ? 'bg-sky-50 text-sky-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{row.source}</span>
                        </td>
                        <td className="py-4 px-5 text-right text-gray-700">{row.total}</td>
                        <td className="py-4 px-5 text-right text-gray-700">{row.interview_count}</td>
                        <td className="py-4 px-5 text-right text-gray-700">{row.offer_count}</td>
                        <td className="py-4 px-5 text-right text-gray-700">{row.hired_count}</td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-gray-900 min-w-[2.5rem]">{row.hire_rate_pct}%</span>
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, row.hire_rate_pct)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
