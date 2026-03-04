import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Users,
  Briefcase,
  Target,
  ArrowRight,
  Loader2,
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
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

type Metrics = Awaited<ReturnType<typeof api.reports.getMetrics>> | null;

const tooltipContentStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  padding: '10px 12px',
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
      return { dateFrom: new Date(customFrom).toISOString(), dateTo: new Date(customTo + 'T23:59:59').toISOString() };
    }
    const r = getPresetRange(preset);
    return { dateFrom: new Date(r.from).toISOString(), dateTo: new Date(r.to + 'T23:59:59').toISOString() };
  }, [useCustom, customFrom, customTo, preset]);

  useEffect(() => {
    api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      const res = await api.jobs.list({});
        const list = res?.data ?? [];
      setJobs(list.map((j: { id: string; title: string }) => ({ id: j.id, title: j.title || 'Untitled' })));
    };
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.reports
      .getMetrics({ dateFrom, dateTo, jobId: jobId || undefined })
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load metrics');
          setMetrics(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
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
      a.href = url;
      a.download = filename;
      a.click();
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
    (metrics.pipelineConversion?.screening_count ?? 0) + (metrics.pipelineConversion?.interview_count ?? 0) + (metrics.pipelineConversion?.offer_count ?? 0) + (metrics.pipelineConversion?.hired_count ?? 0) > 0 ||
    ((metrics.offerAcceptance?.counts?.sent ?? 0) + (metrics.offerAcceptance?.counts?.accepted ?? 0) + (metrics.offerAcceptance?.counts?.declined ?? 0)) > 0 ||
    (metrics.interviewOfferRatio?.interview_count ?? 0) + (metrics.interviewOfferRatio?.offer_count ?? 0) > 0 ||
    (metrics.sourceQuality?.rows?.length ?? 0) > 0
  );

  const clearFilters = () => {
    setUseCustom(false);
    setPreset(30);
    setJobId(null);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm max-w-md mx-auto text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => setError(null)}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-12">
      {/* Header — matches Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Track your hiring performance</p>
        </div>
        {canExport && (
          <Button
            variant="black"
            size="sm"
            icon={exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            onClick={handleExport}
            disabled={exporting || !hasAnyData}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        )}
      </div>

      {/* Filters — Dashboard-style pills */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Date range</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {DATE_PRESETS.map(({ label, days }) => (
              <button
                key={days}
                onClick={() => { setUseCustom(false); setPreset(days); }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
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
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${
                useCustom ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <Calendar size={12} /> Custom
            </button>
          </div>
          {useCustom && (
            <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        />
              <span className="text-gray-400 text-sm">to</span>
                        <input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        />
                      </div>
                    )}
          <select
            value={jobId ?? ''}
            onChange={(e) => setJobId(e.target.value || null)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white min-w-[160px] focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="">All Jobs</option>
                  {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          {(jobId || useCustom) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="text-gray-400 animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading reports…</p>
          </div>
      ) : !hasAnyData ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-sm text-center">
          {!metrics ? null : (jobId || useCustom) ? (
            <>
              <p className="text-gray-600">No data for the selected filters. Try a different date range or job.</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <p className="text-gray-600">
              No hiring data yet. Your metrics will appear here once you start adding candidates and moving them through your pipeline.
            </p>
          )}
          </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Time to hire — Dashboard-style card + chart */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                    <Target size={18} />
          </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Time to hire</h3>
                    {metrics?.timeToHire && (
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
                        {metrics.timeToHire.trend_pct >= 0 ? 'Faster' : 'Slower'} vs previous period
                      </p>
                    )}
          </div>
                </div>
                {metrics?.timeToHire && (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${metrics.timeToHire.trend_pct >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {metrics.timeToHire.trend_pct >= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {metrics.timeToHire.trend_pct >= 0 ? `${metrics.timeToHire.trend_pct}%` : `${Math.abs(metrics.timeToHire.trend_pct)}%`}
                  </span>
                )}
                    </div>
              {metrics?.timeToHire?.weekly_series?.length ? (
                <>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight mb-4">{metrics.timeToHire.avg_days} days</p>
                  <div className="h-[160px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.timeToHire.weekly_series} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tthGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="week" stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={(v) => v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''} />
                            <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip contentStyle={tooltipContentStyle} formatter={(val: number) => [val + ' days', 'Avg']} labelFormatter={(v) => v ? new Date(v).toLocaleDateString() : ''} />
                        <Area type="monotone" dataKey="avg_days" stroke="#3b82f6" strokeWidth={2} fill="url(#tthGrad)" activeDot={{ r: 4, strokeWidth: 0, fill: '#2563eb' }} />
                      </AreaChart>
                        </ResponsiveContainer>
                      </div>
                  </>
                ) : (
                <p className="text-gray-500 text-sm italic">No hires in this period.</p>
                )}
              </div>

            {/* Pipeline conversion — list-style like Dashboard */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                  <Users size={18} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Pipeline conversion</h3>
              </div>
              {(metrics?.pipelineConversion?.screening_count ?? 0) + (metrics?.pipelineConversion?.interview_count ?? 0) + (metrics?.pipelineConversion?.offer_count ?? 0) + (metrics?.pipelineConversion?.hired_count ?? 0) > 0 ? (
                    <div className="space-y-2">
                      {[
                    { label: 'Screening', count: metrics!.pipelineConversion.screening_count, pct: null },
                    { label: 'Interview', count: metrics!.pipelineConversion.interview_count, pct: metrics!.pipelineConversion.conversion_screening_to_interview_pct },
                    { label: 'Offer', count: metrics!.pipelineConversion.offer_count, pct: metrics!.pipelineConversion.conversion_interview_to_offer_pct },
                    { label: 'Hired', count: metrics!.pipelineConversion.hired_count, pct: metrics!.pipelineConversion.conversion_offer_to_hired_pct },
                  ].map(({ label, count, pct }, i) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-gray-200 transition-colors">
                      <span className="text-sm font-medium text-gray-700 w-24">{label}</span>
                      <span className="font-bold text-gray-900 w-10">{count}</span>
                      {pct != null && <span className="text-xs text-gray-500 flex-1">{pct}%</span>}
                      {i < 3 && <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                ) : (
                <p className="text-gray-500 text-sm italic">No pipeline activity in this period.</p>
                )}
              </div>

            {/* Offer acceptance — stat + bar chart feel */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Offer acceptance</h3>
                    {metrics?.offerAcceptance && (
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">vs previous period</p>
                    )}
                  </div>
                </div>
                {metrics?.offerAcceptance && (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${metrics.offerAcceptance.trend_pct >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {metrics.offerAcceptance.trend_pct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {metrics.offerAcceptance.trend_pct >= 0 ? `+${metrics.offerAcceptance.trend_pct}%` : metrics.offerAcceptance.trend_pct + '%'}
                  </span>
                )}
              </div>
              {metrics?.offerAcceptance?.counts && (metrics.offerAcceptance.counts.sent + metrics.offerAcceptance.counts.viewed + metrics.offerAcceptance.counts.accepted + metrics.offerAcceptance.counts.declined + metrics.offerAcceptance.counts.negotiating) > 0 ? (
                <>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight mb-4">{metrics.offerAcceptance.acceptance_rate_pct}%</p>
                  <div className="flex flex-wrap gap-2">
                    {(['sent', 'viewed', 'accepted', 'declined', 'negotiating'] as const).map((k) => (
                      <span key={k} className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-100 text-gray-700 text-xs font-medium capitalize">
                        {k}: {metrics!.offerAcceptance!.counts[k]}
                      </span>
                    ))}
                    </div>
                  </>
                ) : (
                <p className="text-gray-500 text-sm italic">No offers in this period.</p>
                )}
              </div>

              {/* Interview–offer ratio */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                  <BarChart3 size={18} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Interview–offer ratio</h3>
              </div>
              {(metrics?.interviewOfferRatio?.interview_count ?? 0) + (metrics?.interviewOfferRatio?.offer_count ?? 0) > 0 ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">
                    {metrics!.interviewOfferRatio!.ratio} <span className="text-lg font-medium text-gray-500">interviews per offer</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    {metrics!.interviewOfferRatio!.interview_count} interviews · {metrics!.interviewOfferRatio!.offer_count} offers
                  </p>
                  {metrics?.interviewOfferRatio && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      {metrics.interviewOfferRatio.trend_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {metrics.interviewOfferRatio.trend_pct >= 0 ? `+${metrics.interviewOfferRatio.trend_pct}%` : metrics.interviewOfferRatio.trend_pct + '%'} vs previous period
                    </span>
                  )}
                    </div>
                ) : (
                <p className="text-gray-500 text-sm italic">No interviews or offers in this period.</p>
                )}
              </div>
            </div>

          {/* Source quality table — Dashboard-style card */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 p-6 border-b border-gray-100">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-900">
                <Users size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Source quality</h3>
            </div>
              {(metrics?.sourceQuality?.rows?.length ?? 0) > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="text-left py-4 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Source</th>
                      <th className="text-right py-4 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Total</th>
                      <th className="text-right py-4 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Interviews</th>
                      <th className="text-right py-4 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Offers</th>
                      <th className="text-right py-4 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Hires</th>
                      <th className="text-right py-4 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Hire rate</th>
                      </tr>
                    </thead>
                    <tbody>
                    {metrics!.sourceQuality!.rows.map((row) => (
                      <tr key={row.source} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-5 font-medium text-gray-900">{row.source}</td>
                        <td className="py-4 px-5 text-right text-gray-700">{row.total}</td>
                        <td className="py-4 px-5 text-right text-gray-700">{row.interview_count}</td>
                        <td className="py-4 px-5 text-right text-gray-700">{row.offer_count}</td>
                        <td className="py-4 px-5 text-right text-gray-700">{row.hired_count}</td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-gray-900 min-w-[2.5rem]">{row.hire_rate_pct}%</span>
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: Math.min(100, row.hire_rate_pct) + '%' }} />
                            </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
              <p className="text-gray-500 text-sm italic p-6">No source data in this period.</p>
            )}
          </div>
          </>
        )}
    </div>
  );
};

export default Reports;
