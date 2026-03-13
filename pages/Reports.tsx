import * as React from 'react';
import { toUserError } from '../utils/edgeFunctionError';
import {
  Download, TrendingUp, TrendingDown, Calendar,
  Users, Briefcase, Target, Loader2, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell, Tooltip,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { PageLoader } from '../components/ui/PageLoader';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '../components/ui/chart';
import { api } from '../services/api';

// ─── Constants ─────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m',  days: 180 },
  { label: '1y',  days: 365 },
] as const;

function getPresetRange(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

type Metrics = Awaited<ReturnType<typeof api.reports.getMetrics>> | null;

const TTH_BENCHMARK = 21;

const tthChartConfig = {
  avgDays: { label: 'Within target', color: 'var(--chart-1)' },
  target:  { label: 'Over benchmark', color: '#e5e7eb' },
} satisfies ChartConfig;

// ─── Delta Badge ───────────────────────────────────────────────────────────

const DeltaBadge = ({ value, suffix = '%' }: { value: number; suffix?: string }) => (
  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
    value >= 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-red-100 text-red-600'
  }`}>
    {value >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
    {value >= 0 ? '+' : ''}{value}{suffix}
  </span>
);

// ─── Section Divider ───────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4 pt-2">
    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{title}</h2>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

// ─── Reports Page ──────────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const [preset, setPreset]           = React.useState<number>(30);
  const [customFrom, setCustomFrom]   = React.useState('');
  const [customTo, setCustomTo]       = React.useState('');
  const [useCustom, setUseCustom]     = React.useState(false);
  const [jobId, setJobId]             = React.useState<string | null>(null);
  const [jobs, setJobs]               = React.useState<{ id: string; title: string }[]>([]);
  const [metrics, setMetrics]         = React.useState<Metrics>(null);
  const [loading, setLoading]         = React.useState(true);
  const [error, setError]             = React.useState<string | null>(null);
  const [userRole, setUserRole]       = React.useState<string>('');
  const [exporting, setExporting]     = React.useState(false);

  const { dateFrom, dateTo } = React.useMemo(() => {
    if (useCustom && customFrom && customTo) {
      return {
        dateFrom: new Date(customFrom).toISOString(),
        dateTo:   new Date(customTo + 'T23:59:59').toISOString(),
      };
    }
    const r = getPresetRange(preset);
    return {
      dateFrom: new Date(r.from).toISOString(),
      dateTo:   new Date(r.to + 'T23:59:59').toISOString(),
    };
  }, [useCustom, customFrom, customTo, preset]);

  React.useEffect(() => {
    api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {});
  }, []);

  React.useEffect(() => {
    api.jobs.list({}).then((res) => {
      const list = res?.data ?? [];
      setJobs(list.map((j: { id: string; title: string }) => ({ id: j.id, title: j.title || 'Untitled' })));
    });
  }, []);

  React.useEffect(() => {
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
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const canExport   = userRole === 'Admin' || userRole === 'Recruiter';
  const clearFilters = () => { setUseCustom(false); setPreset(30); setJobId(null); };

  // ── Derived ───────────────────────────────────────────────────────────────

  const pc  = metrics?.pipelineConversion;
  const tth = metrics?.timeToHire;
  const oa  = metrics?.offerAcceptance;
  const ior = metrics?.interviewOfferRatio;
  const sq  = metrics?.sourceQuality;

  const totalPipeline = (pc?.screening_count ?? 0) + (pc?.interview_count ?? 0) +
    (pc?.offer_count ?? 0) + (pc?.hired_count ?? 0);

  const hasAnyData = metrics && (
    (tth?.weekly_series?.length ?? 0) > 0 ||
    totalPipeline > 0 ||
    ((oa?.counts?.sent ?? 0) + (oa?.counts?.accepted ?? 0) + (oa?.counts?.declined ?? 0)) > 0 ||
    (ior?.interview_count ?? 0) + (ior?.offer_count ?? 0) > 0 ||
    (sq?.rows?.length ?? 0) > 0
  );

  // Funnel
  const funnelStages = [
    { label: 'Screened',    count: pc?.screening_count ?? 0, color: '#111827' },
    { label: 'Interviewed', count: pc?.interview_count ?? 0, color: '#7c3aed' },
    { label: 'Offered',     count: pc?.offer_count     ?? 0, color: '#0ea5e9' },
    { label: 'Hired',       count: pc?.hired_count     ?? 0, color: '#10b981' },
  ];
  const funnelMax  = Math.max(pc?.screening_count ?? 0, 1);
  const funnelData = funnelStages.map((stage, i) => ({
    value: stage.count,
    name:  stage.label,
    fill:  stage.color,
    dropPct: i > 0 && funnelStages[i - 1].count > 0
      ? Math.round(((funnelStages[i - 1].count - stage.count) / funnelStages[i - 1].count) * 100)
      : null,
  }));

  // Conversion rates — use pre-computed values from the RPC where available
  const toInterviewRate = pc?.conversion_screening_to_interview_pct ?? 0;
  const toOfferRate     = pc?.conversion_interview_to_offer_pct     ?? 0;
  const toHiredRate     = pc?.conversion_offer_to_hired_pct         ?? 0;
  const overallRate     = pc && pc.screening_count > 0 ? Math.round(((pc.hired_count ?? 0) / pc.screening_count) * 100) : 0;

  // Offers
  const offerData = oa?.counts
    ? (['accepted', 'sent', 'viewed', 'declined', 'negotiating'] as const)
        .map((k) => ({ key: k, value: oa.counts![k] ?? 0 }))
        .filter((d) => d.value > 0)
    : [];
  const offerTotal = offerData.reduce((s, d) => s + d.value, 0) || 1;
  const offerBarColors: Record<string, string> = {
    accepted: 'bg-emerald-500', sent: 'bg-gray-800',
    viewed: 'bg-sky-400', declined: 'bg-red-400', negotiating: 'bg-amber-400',
  };

  // Velocity
  const velocitySeries = (tth?.weekly_series ?? []).map((e, i) => ({
    week: e.week ? new Date(e.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `W${i + 1}`,
    days: e.avg_days ?? 0,
  }));

  // TTH stacked bar
  const tthBarData = (tth?.weekly_series ?? []).map((entry, i) => {
    const days = entry.avg_days ?? 0;
    return {
      week:    entry.week ? new Date(entry.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `W${i + 1}`,
      avgDays: Math.min(days, TTH_BENCHMARK),
      target:  Math.max(0, days - TTH_BENCHMARK),
    };
  });

  // Sources
  const sourceRows = [...(sq?.rows ?? [])].sort((a, b) => b.hire_rate_pct - a.hire_rate_pct);
  const topSource  = sourceRows[0] ?? null;

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

  return (
    <div className="p-6 pb-16 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Hiring analytics & performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pill date filter */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
            {DATE_PRESETS.map(({ label, days }) => (
              <button key={days} onClick={() => { setUseCustom(false); setPreset(days); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  !useCustom && preset === days
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>{label}
              </button>
            ))}
            <button onClick={() => setUseCustom(true)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                useCustom ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Calendar size={11} /> Custom
            </button>
          </div>

          {useCustom && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-black" />
              <span className="text-gray-300 text-xs">→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-black" />
            </div>
          )}

          <CustomSelect value={jobId ?? ''} onChange={(val) => setJobId(val || null)}
            className="px-3 py-1.5 rounded-lg min-w-[140px]"
            options={[{ value: '', label: 'All Jobs' }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]} />

          {(jobId || useCustom) && (
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-1">
              Clear
            </button>
          )}

          {canExport && (
            <Button variant="black" size="sm"
              icon={exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              onClick={handleExport} disabled={exporting || !hasAnyData}>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Loading / Empty ── */}
      {loading ? (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <PageLoader fullScreen={false} />
        </div>
      ) : !hasAnyData ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          {(jobId || useCustom) ? (
            <>
              <p className="text-gray-500 text-sm">No data for the selected filters.</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            </>
          ) : (
            <p className="text-gray-500 text-sm">No hiring data yet. Metrics appear once candidates move through your pipeline.</p>
          )}
        </div>
      ) : (
        <>
          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'In Pipeline',     value: totalPipeline,                                                            icon: Users,    delta: null },
              { label: 'Hired',           value: pc?.hired_count ?? 0,                                                     icon: Briefcase, delta: null },
              { label: 'Acceptance Rate', value: oa?.acceptance_rate_pct != null ? `${oa.acceptance_rate_pct}%` : '—',    icon: Target,   delta: oa?.trend_pct ?? null },
              { label: 'Avg Time to Hire',value: tth?.avg_days ? `${tth.avg_days}d` : '—',                                 icon: Clock,    delta: tth?.trend_pct != null ? -tth.trend_pct : null },
            ].map(({ label, value, icon: Icon, delta }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:border-gray-200 transition-colors">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
                  {delta != null && <div className="mt-1"><DeltaBadge value={delta} /></div>}
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-400">
                  <Icon size={16} />
                </div>
              </div>
            ))}
          </div>

          {/* ── Pipeline ── */}
          <SectionHeader title="Pipeline" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Funnel */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Pipeline Funnel</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Drop-off by stage</p>
                </div>
                <span className="text-xs text-gray-400">{overallRate}% <span className="text-gray-300">overall</span></span>
              </div>
              {funnelMax > 1 ? (
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          const pct = funnelMax > 0 ? Math.round((d.value / funnelMax) * 100) : 0;
                          return (
                            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg">
                              <p className="text-xs font-bold text-gray-900">{d.name}</p>
                              <p className="text-xs text-gray-500">{d.value.toLocaleString()} · {pct}%</p>
                              {d.dropPct != null && d.dropPct > 0 && (
                                <p className="text-xs text-red-500 mt-0.5">−{d.dropPct}% from previous</p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Funnel dataKey="value" data={funnelData} isAnimationActive>
                        {funnelData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={funnelData[i].fill} />
                        ))}
                        <LabelList
                          position="center"
                          content={(props: any) => {
                            const { x, y, width, height, value, name, dropPct } = props;
                            if (!value || height < 26) return null;
                            const pct = funnelMax > 0 ? Math.round((value / funnelMax) * 100) : 0;
                            const cx  = x + width / 2;
                            const cy  = y + height / 2;
                            const showDrop = dropPct != null && dropPct > 0 && height >= 44;
                            return (
                              <g>
                                <text x={cx} y={showDrop ? cy - 14 : cy - 7} textAnchor="middle" dominantBaseline="middle"
                                  style={{ fontSize: 12, fontWeight: 700, fill: 'white', pointerEvents: 'none' }}>
                                  {name}
                                </text>
                                <text x={cx} y={showDrop ? cy + 1 : cy + 8} textAnchor="middle" dominantBaseline="middle"
                                  style={{ fontSize: 11, fill: 'rgba(255,255,255,0.75)', pointerEvents: 'none' }}>
                                  {value.toLocaleString()} · {pct}%
                                </text>
                                {showDrop && (
                                  <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle"
                                    style={{ fontSize: 10, fontWeight: 700, fill: '#fca5a5', pointerEvents: 'none' }}>
                                    ↓ −{dropPct}%
                                  </text>
                                )}
                              </g>
                            );
                          }}
                        />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 text-sm text-gray-300">No pipeline data yet</div>
              )}
            </div>

            {/* Pipeline Health */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Pipeline Health</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Conversion by stage</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{overallRate}%</p>
                  <p className="text-[10px] text-gray-400">overall</p>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                {[
                  { label: 'Screened → Interview', rate: toInterviewRate, color: 'bg-violet-500' },
                  { label: 'Interview → Offer',    rate: toOfferRate,     color: 'bg-sky-500' },
                  { label: 'Offer → Hired',        rate: toHiredRate,     color: 'bg-emerald-500' },
                ].map(({ label, rate, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs font-bold text-gray-900">{rate}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 pt-4 mt-4 border-t border-gray-50">
                {pc?.screening_count ?? 0} screened · {pc?.hired_count ?? 0} hired
              </p>
            </div>
          </div>

          {/* ── Offers & Velocity ── */}
          <SectionHeader title="Offers & Velocity" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Offer Acceptance */}
            {offerData.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Offer Acceptance</h3>
                    <p className="text-xs text-gray-400 mt-0.5">By status</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{oa?.acceptance_rate_pct ?? 0}%</p>
                    {oa?.trend_pct != null && <div className="flex justify-end mt-0.5"><DeltaBadge value={oa.trend_pct} /></div>}
                  </div>
                </div>
                <div className="flex-1 space-y-3.5">
                  {offerData.map((d) => (
                    <div key={d.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500 capitalize">{d.key}</span>
                        <span className="text-xs font-bold text-gray-900">
                          {d.value} <span className="text-gray-400 font-normal">· {Math.round((d.value / offerTotal) * 100)}%</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${offerBarColors[d.key] ?? 'bg-gray-400'} transition-all duration-500`}
                          style={{ width: `${Math.round((d.value / offerTotal) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 pt-4 mt-4 border-t border-gray-50">
                  {offerData.reduce((s, d) => s + d.value, 0)} total offers
                </p>
              </div>
            )}

            {/* Hiring Velocity */}
            <div className={`bg-white border border-gray-100 rounded-xl p-6 flex flex-col ${offerData.length === 0 ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Hiring Velocity</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Avg days to hire · {TTH_BENCHMARK}d benchmark</p>
                </div>
                {tth?.avg_days != null && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">
                      {tth.avg_days}<span className="text-sm font-medium text-gray-400 ml-1">d</span>
                    </p>
                    {tth.trend_pct != null && <div className="flex justify-end mt-0.5"><DeltaBadge value={-tth.trend_pct} /></div>}
                  </div>
                )}
              </div>
              {velocitySeries.length > 1 ? (
                <div className="flex-1 min-h-[180px]">
                  <ChartContainer config={{}} className="h-full w-full">
                    <BarChart data={velocitySeries} barCategoryGap="30%">
                      <CartesianGrid vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={(v) => v.slice(0, 5)} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} width={24} />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="days" radius={[4, 4, 0, 0]} fill="var(--chart-2)" />
                    </BarChart>
                  </ChartContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic flex-1 flex items-center">Not enough weekly data yet.</p>
              )}
              {ior && ((ior.interview_count ?? 0) + (ior.offer_count ?? 0)) > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Interview–Offer Ratio</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">
                      {ior.ratio}<span className="text-xs font-normal text-gray-400 ml-1">per offer</span>
                    </p>
                  </div>
                  {ior.trend_pct != null && <DeltaBadge value={ior.trend_pct} />}
                </div>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default Reports;
