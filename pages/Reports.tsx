import * as React from 'react';
import { toUserError } from '../utils/edgeFunctionError';
import {
  Download, TrendingUp, TrendingDown, Filter, Calendar,
  Users, Briefcase, Target, Loader2, Clock, Award, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, CartesianGrid,
  PieChart, Pie, Sector, Label,
  RadialBarChart, RadialBar, PolarRadiusAxis,
} from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { PageLoader } from '../components/ui/PageLoader';
import {
  ChartContainer, ChartLegend, ChartLegendContent,
  ChartTooltip, ChartTooltipContent, ChartStyle,
  type ChartConfig,
} from '../components/ui/chart';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { api } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
] as const;

function getPresetRange(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

type Metrics = Awaited<ReturnType<typeof api.reports.getMetrics>> | null;

const TTH_BENCHMARK = 21;

// ─── Delta Badge ──────────────────────────────────────────────────────────────

const DeltaBadge = ({ value, suffix = '%' }: { value: number; suffix?: string }) => (
  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
    value >= 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-red-100 text-red-600'
  }`}>
    {value >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
    {value >= 0 ? '+' : ''}{value}{suffix}
  </span>
);

// ─── Stat Card (matches Dashboard exactly) ────────────────────────────────────

const StatCard = ({ title, value, delta, icon: Icon }: {
  title: string; value: string | number; delta?: number | null; icon: React.ElementType;
}) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 flex items-start justify-between hover:border-gray-200 transition-colors">
    <div>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
      {delta != null && <div className="mt-1.5"><DeltaBadge value={delta} /></div>}
    </div>
    <div className="p-2.5 rounded-lg bg-gray-50 text-gray-900 border border-gray-100">
      <Icon size={18} />
    </div>
  </div>
);

// ─── Chart configs ────────────────────────────────────────────────────────────

const tthChartConfig = {
  avgDays: { label: 'Within target', color: 'var(--chart-1)' },
  target:  { label: 'Over benchmark', color: '#e5e7eb' },
} satisfies ChartConfig;

const pipelineChartConfig = {
  toInterview: { label: 'Screening → Interview', color: 'var(--chart-1)' },
  toOffer:     { label: 'Interview → Offer',     color: 'var(--chart-2)' },
} satisfies ChartConfig;

const offerChartConfig = {
  accepted:    { label: 'Accepted',    color: 'var(--chart-1)' },
  sent:        { label: 'Sent',        color: '#111827' },
  viewed:      { label: 'Viewed',      color: 'var(--chart-2)' },
  declined:    { label: 'Declined',    color: '#f87171' },
  negotiating: { label: 'Negotiating', color: 'var(--chart-4)' },
} satisfies ChartConfig;

// ─── Reports Page ─────────────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const [preset, setPreset] = React.useState<number>(30);
  const [customFrom, setCustomFrom] = React.useState('');
  const [customTo, setCustomTo] = React.useState('');
  const [useCustom, setUseCustom] = React.useState(false);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [jobs, setJobs] = React.useState<{ id: string; title: string }[]>([]);
  const [metrics, setMetrics] = React.useState<Metrics>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string>('');
  const [exporting, setExporting] = React.useState(false);
  const [activeOfferSlice, setActiveOfferSlice] = React.useState('accepted');

  const { dateFrom, dateTo } = React.useMemo(() => {
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const canExport = userRole === 'Admin' || userRole === 'Recruiter';
  const clearFilters = () => { setUseCustom(false); setPreset(30); setJobId(null); };

  // ── Derived ─────────────────────────────────────────────────────────────────

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

  const tthBarData = (tth?.weekly_series ?? []).map((entry, i, arr) => {
    const days = entry.avg_days ?? 0;
    return {
      week: entry.week
        ? new Date(entry.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : `W${i + 1}`,
      avgDays: Math.min(days, TTH_BENCHMARK),
      target:  Math.max(0, days - TTH_BENCHMARK),
      isLatest: i === arr.length - 1,
    };
  });

  const toInterviewRate = pc && pc.screening_count > 0
    ? Math.round((pc.interview_count / pc.screening_count) * 100) : 0;
  const toOfferRate = pc && pc.interview_count > 0
    ? Math.round((pc.offer_count / pc.interview_count) * 100) : 0;
  const pipelineRadialData = [{ month: 'pipeline', toInterview: toInterviewRate, toOffer: toOfferRate }];
  const overallFunnelRate = pc && pc.screening_count > 0
    ? Math.round(((pc.hired_count ?? 0) / pc.screening_count) * 100) : 0;

  const offerPieData = React.useMemo(() => {
    if (!oa?.counts) return [];
    return (['accepted', 'sent', 'viewed', 'declined', 'negotiating'] as const)
      .map((k) => ({ month: k, desktop: oa.counts![k] ?? 0, fill: `var(--color-${k})` }))
      .filter((d) => d.desktop > 0);
  }, [oa]);

  const activeOfferIndex = React.useMemo(
    () => Math.max(0, offerPieData.findIndex((d) => d.month === activeOfferSlice)),
    [offerPieData, activeOfferSlice]
  );

  const sourceRows = [...(sq?.rows ?? [])].sort((a, b) => b.hire_rate_pct - a.hire_rate_pct);
  const topSource = sourceRows[0] ?? null;

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
          <p className="text-gray-500 text-sm mt-1">Track your hiring performance</p>
        </div>
        {canExport && (
          <Button variant="black" size="sm"
            icon={exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            onClick={handleExport} disabled={exporting || !hasAnyData}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter size={15} />
            <span className="text-xs font-bold uppercase tracking-wider">Date range</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {DATE_PRESETS.map(({ label, days }) => (
              <button key={days} onClick={() => { setUseCustom(false); setPreset(days); }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  !useCustom && preset === days
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}>{label}
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
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-black" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-black" />
            </div>
          )}
          <CustomSelect value={jobId ?? ''} onChange={(val) => setJobId(val || null)}
            className="px-3 py-1.5 rounded-lg min-w-[160px]"
            options={[{ value: '', label: 'All Jobs' }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]} />
          {(jobId || useCustom) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
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
              <p className="text-gray-600">No data for the selected filters.</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            </>
          ) : (
            <p className="text-gray-600">No hiring data yet. Metrics appear once candidates move through your pipeline.</p>
          )}
        </div>
      ) : (
        <>
          {/* ── Row 1: KPI tiles ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="In Pipeline"      value={totalPipeline}                                                  icon={Users}    delta={null} />
            <StatCard title="Hired"            value={pc?.hired_count ?? 0}                                           icon={Briefcase} delta={null} />
            <StatCard title="Acceptance Rate"  value={oa?.acceptance_rate_pct != null ? `${oa.acceptance_rate_pct}%` : '—'} icon={Target}   delta={oa?.trend_pct ?? null} />
            <StatCard title="Avg Time to Hire" value={tth?.avg_days ? `${tth.avg_days}d` : '—'}                       icon={Clock}    delta={tth?.trend_pct != null ? -tth.trend_pct : null} />
          </div>

          {/* ── Row 2: Time to Hire + Pipeline Health ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Time to Hire — stacked bar */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Time to Hire</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Weekly avg · {TTH_BENCHMARK}d benchmark</p>
                  </div>
                </div>
                {tth?.trend_pct != null && <DeltaBadge value={-tth.trend_pct} />}
              </div>

              {tth?.avg_days != null && (
                <p className="text-3xl font-bold text-gray-900 tracking-tight mt-4 mb-4">
                  {tth.avg_days}
                  <span className="text-base font-medium text-gray-400 ml-1">days avg</span>
                </p>
              )}

              {tthBarData.length > 0 ? (
                <>
                  <ChartContainer config={tthChartConfig} className="h-[200px] w-full">
                    <BarChart data={tthBarData} barCategoryGap="32%">
                      <CartesianGrid vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        tickFormatter={(v) => v.slice(0, 6)} />
                      <ChartTooltip
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="avgDays" stackId="a" fill="var(--color-avgDays)" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="target"  stackId="a" fill="var(--color-target)"  radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                  <p className="text-xs text-gray-400 mt-3">
                    Violet = within {TTH_BENCHMARK}d · Grey = over benchmark
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic mt-4">No weekly data in this period.</p>
              )}
            </div>

            {/* Pipeline Health — radial stacked */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Pipeline Health</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Conversion by stage</p>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <ChartContainer config={pipelineChartConfig} className="w-full max-w-[220px] aspect-square">
                  <RadialBarChart data={pipelineRadialData} endAngle={180} innerRadius={70} outerRadius={120}>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 14}
                                  style={{ fontSize: 24, fontWeight: 700, fill: '#111827' }}>
                                  {overallFunnelRate}%
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 6}
                                  style={{ fontSize: 11, fill: '#6b7280' }}>
                                  overall
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </PolarRadiusAxis>
                    <RadialBar dataKey="toInterview" stackId="a" cornerRadius={5}
                      fill="var(--color-toInterview)" className="stroke-transparent stroke-2" />
                    <RadialBar dataKey="toOffer" stackId="a" cornerRadius={5}
                      fill="var(--color-toOffer)" className="stroke-transparent stroke-2" />
                  </RadialBarChart>
                </ChartContainer>
              </div>

              <div className="pt-4 border-t border-gray-50 space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" />
                    Screening → Interview
                  </span>
                  <span className="font-bold text-gray-900">{toInterviewRate}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                    Interview → Offer
                  </span>
                  <span className="font-bold text-gray-900">{toOfferRate}%</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                  <span className="text-gray-400">{pc?.screening_count ?? 0} screened · {pc?.hired_count ?? 0} hired</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 3: Offer Acceptance + Source Performance ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Offer Acceptance — interactive pie */}
            {offerPieData.length > 0 && (() => {
              const pieId = 'offer-pie';
              return (
                <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
                  <ChartStyle id={pieId} config={offerChartConfig} />
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                        <Briefcase size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Offer Acceptance</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {oa?.acceptance_rate_pct ?? 0}% rate
                          {oa?.trend_pct != null && <span className="ml-2 inline-flex align-middle"><DeltaBadge value={oa.trend_pct} /></span>}
                        </p>
                      </div>
                    </div>
                    <Select value={activeOfferSlice} onValueChange={setActiveOfferSlice}>
                      <SelectTrigger className="h-7 w-[110px]" aria-label="Select status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {offerPieData.map((d) => (
                          <SelectItem key={d.month} value={d.month}>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `var(--color-${d.month})` }} />
                              <span className="capitalize">{d.month}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-1 items-center justify-center py-2" data-chart={pieId}>
                    <ChartContainer id={pieId} config={offerChartConfig}
                      className="w-full max-w-[220px] aspect-square">
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={offerPieData} dataKey="desktop" nameKey="month"
                          innerRadius={60} strokeWidth={4}
                          activeIndex={activeOfferIndex}
                          activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                            <g>
                              <Sector {...props} outerRadius={outerRadius + 8} />
                              <Sector {...props} outerRadius={outerRadius + 20} innerRadius={outerRadius + 10} />
                            </g>
                          )}
                        >
                          <Label
                            content={({ viewBox }) => {
                              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                const active = offerPieData[activeOfferIndex];
                                return (
                                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                    <tspan x={viewBox.cx} y={viewBox.cy}
                                      style={{ fontSize: 26, fontWeight: 700, fill: '#111827' }}>
                                      {active?.desktop ?? 0}
                                    </tspan>
                                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20}
                                      style={{ fontSize: 11, fill: '#6b7280' }} className="capitalize">
                                      {activeOfferSlice}
                                    </tspan>
                                  </text>
                                );
                              }
                            }}
                          />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </div>

                  <div className="pt-3 border-t border-gray-50 space-y-1.5">
                    {offerPieData.map((d) => (
                      <div key={d.month} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-gray-500 capitalize">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                          {d.month}
                        </span>
                        <span className="font-bold text-gray-900">{d.desktop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Source Performance — recruiter scorecard */}
            <div className={`bg-white border border-gray-100 rounded-xl p-6 flex flex-col ${offerPieData.length === 0 ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Source Performance</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Ranked by hire rate · focus your sourcing effort</p>
                </div>
              </div>

              {topSource && (
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg mb-4">
                  <Zap size={13} className="text-violet-600 flex-shrink-0" />
                  <span className="text-xs text-violet-700">
                    <span className="font-bold">{topSource.source}</span> is your best source at {topSource.hire_rate_pct}% hire rate
                  </span>
                </div>
              )}

              {sourceRows.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {sourceRows.map((row, i) => {
                    const tier = row.hire_rate_pct >= 30 ? 'excellent' : row.hire_rate_pct >= 15 ? 'good' : 'low';
                    const tierStyle = {
                      excellent: { bar: '#7c3aed', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
                      good:      { bar: '#0ea5e9', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
                      low:       { bar: '#d1d5db', badge: 'bg-gray-100 text-gray-500 border-gray-200' },
                    }[tier];
                    const srcBadge: Record<string, string> = {
                      Sourced: 'bg-blue-50 text-blue-700',
                      Applied: 'bg-green-50 text-green-700',
                      Referred: 'bg-purple-50 text-purple-700',
                      LinkedIn: 'bg-sky-50 text-sky-700',
                    };
                    return (
                      <div key={row.source} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-300 w-4 text-right flex-shrink-0">{i + 1}</span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold flex-shrink-0 ${srcBadge[row.source] ?? 'bg-gray-100 text-gray-700'}`}>
                          {row.source}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">{row.total} candidates · {row.hired_count} hired</span>
                            <span className="text-xs font-bold text-gray-900">{row.hire_rate_pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, row.hire_rate_pct)}%`, backgroundColor: tierStyle.bar }} />
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${tierStyle.badge}`}>
                          {tier}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No source data in this period.</p>
              )}

              {/* Interview–offer ratio footer */}
              {((ior?.interview_count ?? 0) + (ior?.offer_count ?? 0)) > 0 && (
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Interview–Offer Ratio</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {ior!.ratio}
                      <span className="text-sm font-medium text-gray-400 ml-1">per offer</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{ior!.interview_count} interviews · {ior!.offer_count} offers</p>
                  </div>
                  {ior?.trend_pct != null && <DeltaBadge value={ior.trend_pct} />}
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
