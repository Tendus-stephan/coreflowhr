import React, { useState, useEffect, useMemo } from 'react';
import { toUserError } from '../utils/edgeFunctionError';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Briefcase,
  Target,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { PageLoader } from '../components/ui/PageLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
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

const tooltipContentStyle = {
  backgroundColor: '#fff',
  border: '1px solid #f3f4f6',
  borderRadius: '8px',
  boxShadow: '0 4px 16px -4px rgba(0,0,0,0.10)',
  padding: '10px 14px',
  fontSize: '12px',
};

// ── KPI stat card ────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ReactNode;
  trend?: number | null;
  trendLabel?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, suffix = '', icon, trend, trendLabel }) => {
  const up = trend != null && trend >= 0;
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">{label}</CardDescription>
        <div className="p-2 rounded-lg bg-gray-50 text-gray-500">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-gray-900">
          {value}{suffix}
        </div>
        {trend != null && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${up ? 'text-green-600' : 'text-amber-600'}`}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {up ? `+${trend}%` : `${trend}%`}
            {trendLabel && <span className="text-gray-400 font-normal">{trendLabel}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ── Source badge colours ─────────────────────────────────────────────────────
const sourceBadgeVariant = (source: string) => {
  const map: Record<string, 'blue' | 'success' | 'purple' | 'sky' | 'secondary'> = {
    Sourced: 'blue',
    Applied: 'success',
    Referred: 'purple',
    LinkedIn: 'sky',
  };
  return map[source] ?? 'secondary';
};

// ── Main component ───────────────────────────────────────────────────────────
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
      return { dateFrom: new Date(customFrom).toISOString(), dateTo: new Date(customTo + 'T23:59:59').toISOString() };
    }
    const r = getPresetRange(preset);
    return { dateFrom: new Date(r.from).toISOString(), dateTo: new Date(r.to + 'T23:59:59').toISOString() };
  }, [useCustom, customFrom, customTo, preset]);

  useEffect(() => { api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {}); }, []);

  useEffect(() => {
    api.jobs.list({}).then((res) => {
      setJobs((res?.data ?? []).map((j: { id: string; title: string }) => ({ id: j.id, title: j.title || 'Untitled' })));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.reports.getMetrics({ dateFrom, dateTo, jobId: jobId || undefined })
      .then((data) => { if (!cancelled) setMetrics(data); })
      .catch((err) => { if (!cancelled) { setError(toUserError(err, 'Unable to load report data.')); setMetrics(null); } })
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
  const hasAnyData = metrics && (
    (metrics.timeToHire?.weekly_series?.length ?? 0) > 0 ||
    (metrics.pipelineConversion?.screening_count ?? 0) + (metrics.pipelineConversion?.interview_count ?? 0) + (metrics.pipelineConversion?.offer_count ?? 0) + (metrics.pipelineConversion?.hired_count ?? 0) > 0 ||
    ((metrics.offerAcceptance?.counts?.sent ?? 0) + (metrics.offerAcceptance?.counts?.accepted ?? 0) + (metrics.offerAcceptance?.counts?.declined ?? 0)) > 0 ||
    (metrics.interviewOfferRatio?.interview_count ?? 0) + (metrics.interviewOfferRatio?.offer_count ?? 0) > 0 ||
    (metrics.sourceQuality?.rows?.length ?? 0) > 0
  );

  const clearFilters = () => { setUseCustom(false); setPreset(30); setJobId(null); };
  const activeFilters = jobId || useCustom;

  if (error) {
    return (
      <div className="px-10 py-10">
        <Card className="max-w-md mx-auto text-center p-8">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>Try again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-10 py-10 pb-14 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hiring performance analytics</p>
        </div>
        {canExport && (
          <Button
            variant="black"
            size="sm"
            icon={exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            onClick={handleExport}
            disabled={exporting || !hasAnyData}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        )}
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pr-1">
              <Calendar size={13} /> Date range
            </span>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => { setUseCustom(false); setPreset(days); }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                    !useCustom && preset === days
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1 ${
                  useCustom ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <div className="flex items-center gap-2">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-gray-900" />
                <span className="text-gray-400 text-xs">→</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-gray-900" />
              </div>
            )}
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <CustomSelect
              value={jobId ?? ''}
              onChange={(val) => setJobId(val || null)}
              className="px-3 py-1.5 rounded-lg min-w-[160px] text-xs"
              options={[{ value: '', label: 'All Jobs' }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]}
            />
            {activeFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2">
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Body ── */}
      {loading ? (
        <Card className="overflow-hidden"><PageLoader fullScreen={false} /></Card>
      ) : !hasAnyData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 size={32} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              {(jobId || useCustom)
                ? 'No data for the selected filters. Try a different date range or job.'
                : 'No hiring data yet. Metrics appear once you start moving candidates through your pipeline.'}
            </p>
            {activeFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="In pipeline"
              value={(metrics!.pipelineConversion?.screening_count ?? 0) + (metrics!.pipelineConversion?.interview_count ?? 0) + (metrics!.pipelineConversion?.offer_count ?? 0) + (metrics!.pipelineConversion?.hired_count ?? 0)}
              icon={<Users size={16} />}
            />
            <KpiCard
              label="Hired"
              value={metrics!.pipelineConversion?.hired_count ?? 0}
              icon={<Briefcase size={16} />}
              trend={metrics?.offerAcceptance?.trend_pct}
              trendLabel="vs prev period"
            />
            <KpiCard
              label="Offer acceptance"
              value={metrics!.offerAcceptance?.acceptance_rate_pct ?? '—'}
              suffix={metrics!.offerAcceptance?.acceptance_rate_pct != null ? '%' : ''}
              icon={<Target size={16} />}
              trend={metrics?.offerAcceptance?.trend_pct}
            />
            <KpiCard
              label="Avg time to hire"
              value={metrics!.timeToHire?.avg_days ?? '—'}
              suffix={metrics!.timeToHire?.avg_days ? ' days' : ''}
              icon={<Calendar size={16} />}
              trend={metrics?.timeToHire?.trend_pct != null ? -metrics!.timeToHire!.trend_pct : undefined}
              trendLabel="faster"
            />
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time to hire */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Time to hire</CardTitle>
                    <CardDescription className="mt-0.5">Average days from sourced to hired</CardDescription>
                  </div>
                  {metrics?.timeToHire?.trend_pct != null && (
                    <Badge variant={metrics.timeToHire.trend_pct >= 0 ? 'success' : 'warning'} className="flex-shrink-0">
                      {metrics.timeToHire.trend_pct >= 0
                        ? <><TrendingDown size={10} className="mr-1" />{metrics.timeToHire.trend_pct}% faster</>
                        : <><TrendingUp size={10} className="mr-1" />{Math.abs(metrics.timeToHire.trend_pct)}% slower</>}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {metrics?.timeToHire?.weekly_series?.length ? (
                  <>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight mb-5">
                      {metrics.timeToHire.avg_days} <span className="text-lg font-normal text-gray-400">days</span>
                    </p>
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.timeToHire.weekly_series} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                          <defs>
                            <linearGradient id="tthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#111827" stopOpacity={0.12} />
                              <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                          <XAxis dataKey="week" stroke="#d1d5db" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                            tickFormatter={(v) => v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''} />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip contentStyle={tooltipContentStyle} formatter={(val: number) => [val + ' days', 'Avg']} labelFormatter={(v) => v ? new Date(v).toLocaleDateString() : ''} />
                          <Area type="monotone" dataKey="avg_days" stroke="#111827" strokeWidth={1.5} fill="url(#tthGrad)" activeDot={{ r: 3, strokeWidth: 0, fill: '#111827' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No hires in this period</p>
                )}
              </CardContent>
            </Card>

            {/* Pipeline conversion */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pipeline conversion</CardTitle>
                <CardDescription>Candidate flow through each stage</CardDescription>
              </CardHeader>
              <CardContent>
                {(metrics?.pipelineConversion?.screening_count ?? 0) + (metrics?.pipelineConversion?.interview_count ?? 0) + (metrics?.pipelineConversion?.offer_count ?? 0) + (metrics?.pipelineConversion?.hired_count ?? 0) > 0 ? (
                  <div className="space-y-5">
                    {(() => {
                      const stages = [
                        { label: 'Screening', count: metrics!.pipelineConversion.screening_count, pct: null, color: 'bg-gray-900' },
                        { label: 'Interview', count: metrics!.pipelineConversion.interview_count, pct: metrics!.pipelineConversion.conversion_screening_to_interview_pct, color: 'bg-gray-700' },
                        { label: 'Offer', count: metrics!.pipelineConversion.offer_count, pct: metrics!.pipelineConversion.conversion_interview_to_offer_pct, color: 'bg-gray-500' },
                        { label: 'Hired', count: metrics!.pipelineConversion.hired_count, pct: metrics!.pipelineConversion.conversion_offer_to_hired_pct, color: 'bg-gray-400' },
                      ];
                      const maxCount = stages[0].count || 1;
                      return stages.map(({ label, count, pct, color }) => (
                        <div key={label} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 tabular-nums">{count}</span>
                              {pct != null && <Badge variant="secondary">{pct}%</Badge>}
                            </div>
                          </div>
                          <Progress
                            value={Math.max(2, Math.min(100, (count / maxCount) * 100))}
                            indicatorClassName={color}
                          />
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No pipeline activity in this period</p>
                )}
              </CardContent>
            </Card>

            {/* Offer acceptance */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Offer acceptance</CardTitle>
                    <CardDescription>Breakdown of offer responses</CardDescription>
                  </div>
                  {metrics?.offerAcceptance?.trend_pct != null && (
                    <Badge variant={metrics.offerAcceptance.trend_pct >= 0 ? 'success' : 'warning'}>
                      {metrics.offerAcceptance.trend_pct >= 0 ? '+' : ''}{metrics.offerAcceptance.trend_pct}%
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {metrics?.offerAcceptance?.counts && (metrics.offerAcceptance.counts.sent + metrics.offerAcceptance.counts.viewed + metrics.offerAcceptance.counts.accepted + metrics.offerAcceptance.counts.declined + metrics.offerAcceptance.counts.negotiating) > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight mb-5">
                      {metrics.offerAcceptance.acceptance_rate_pct}<span className="text-lg font-normal text-gray-400">%</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['sent', 'viewed', 'accepted', 'declined', 'negotiating'] as const).map((k) => {
                        const variantMap: Record<string, 'secondary' | 'success' | 'danger' | 'warning' | 'blue'> = {
                          sent: 'secondary', viewed: 'blue', accepted: 'success', declined: 'danger', negotiating: 'warning',
                        };
                        return (
                          <Badge key={k} variant={variantMap[k]} className="capitalize gap-1.5">
                            <span className="font-bold">{metrics!.offerAcceptance!.counts[k]}</span>
                            {k}
                          </Badge>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No offers in this period</p>
                )}
              </CardContent>
            </Card>

            {/* Interview–offer ratio */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Interview–offer ratio</CardTitle>
                    <CardDescription>Interviews needed per offer made</CardDescription>
                  </div>
                  {metrics?.interviewOfferRatio?.trend_pct != null && (
                    <Badge variant={metrics.interviewOfferRatio.trend_pct <= 0 ? 'success' : 'warning'}>
                      {metrics.interviewOfferRatio.trend_pct >= 0 ? '+' : ''}{metrics.interviewOfferRatio.trend_pct}%
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(metrics?.interviewOfferRatio?.interview_count ?? 0) + (metrics?.interviewOfferRatio?.offer_count ?? 0) > 0 ? (
                  <div className="space-y-4">
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                      {metrics!.interviewOfferRatio!.ratio}
                      <span className="text-base font-normal text-gray-400 ml-2">interviews / offer</span>
                    </p>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Interviews</p>
                        <p className="text-xl font-bold text-gray-900">{metrics!.interviewOfferRatio!.interview_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Offers</p>
                        <p className="text-xl font-bold text-gray-900">{metrics!.interviewOfferRatio!.offer_count}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No interviews or offers in this period</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Source quality table ── */}
          {(metrics?.sourceQuality?.rows?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source quality</CardTitle>
                <CardDescription>Candidate quality and conversion by source</CardDescription>
              </CardHeader>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Interviews</TableHead>
                    <TableHead className="text-right">Offers</TableHead>
                    <TableHead className="text-right">Hired</TableHead>
                    <TableHead className="text-right">Hire rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics!.sourceQuality!.rows.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell>
                        <Badge variant={sourceBadgeVariant(row.source)}>{row.source}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{row.total}</TableCell>
                      <TableCell className="text-right">{row.interview_count}</TableCell>
                      <TableCell className="text-right">{row.offer_count}</TableCell>
                      <TableCell className="text-right">{row.hired_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Progress
                            value={Math.min(100, row.hire_rate_pct)}
                            className="w-16 h-1.5"
                          />
                          <span className="font-semibold text-gray-900 tabular-nums w-10 text-right">
                            {row.hire_rate_pct}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
