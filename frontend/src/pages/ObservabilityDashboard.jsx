import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Sparkline bar chart (pure CSS, no deps) ────────────────────────────────
const SparklineChart = ({ data = [], dataKey, color = '#6366f1' }) => {
  if (!data.length)
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        No data
      </div>
    );

  const maxVal = Math.max(...data.map((d) => d[dataKey] ?? 0), 1);

  return (
    <div className="h-full w-full flex items-end gap-[2px] px-1">
      {data.map((d, i) => {
        const pct = Math.max(((d[dataKey] ?? 0) / maxVal) * 100, 2);
        const label =
          d.ts
            ? new Date(d.ts).toLocaleString([], { hour: '2-digit', minute: '2-digit' })
            : `#${i}`;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-[3px] opacity-80 hover:opacity-100 transition-opacity relative group cursor-default"
            style={{ height: `${pct}%`, background: color }}
          >
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap pointer-events-none">
              {label}
              <br />
              {dataKey}: {d[dataKey] ?? 0}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, iconBg, iconColor, badge, badgeColor }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
      </div>
    </div>
    <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
    {(sub || badge) && (
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${badgeColor}`}
          >
            {badge}
          </span>
        )}
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
      </div>
    )}
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────
export default function ObservabilityDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [timeRange, setTimeRange] = useState(24);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/admin/metrics/summary?hours=${timeRange}`);
      setMetrics(res.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000); // auto-refresh every 30 s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // ── derived values ──────────────────────────────────────────────────────
  const m = metrics;
  const errorRateBadgeColor =
    !m ? '' :
    m.requests.error_rate > 10 ? 'bg-red-100 text-red-700' :
    m.requests.error_rate > 5  ? 'bg-amber-100 text-amber-700' :
                                  'bg-emerald-100 text-emerald-700';

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Observability Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Real-time platform telemetry · auto-refreshes every 30 s
            {lastRefresh && (
              <span className="ml-2 text-xs text-slate-400">
                (last: {lastRefresh.toLocaleTimeString()})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range picker */}
          <select
            id="obs-time-range"
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm"
          >
            <option value={1}>Last 1 Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last 7 Days</option>
          </select>

          {/* Refresh button */}
          <button
            id="obs-refresh-btn"
            onClick={fetchMetrics}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm disabled:opacity-40"
            title="Refresh now"
          >
            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && !metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      )}

      {/* ── Stats grid ── */}
      {m && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="API Requests"
              value={m.requests.total.toLocaleString()}
              sub={`avg ${m.requests.avg_latency_ms} ms`}
              icon="api"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              badge={`${m.requests.error_rate}% errors`}
              badgeColor={errorRateBadgeColor}
            />
            <StatCard
              label="Gemini Inferences"
              value={m.gemini.total_calls.toLocaleString()}
              sub={`avg ${m.gemini.avg_latency_ms} ms · ${m.gemini.success_rate}% success`}
              icon="auto_awesome"
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              badge={`$${m.gemini.estimated_spend.toFixed(4)}`}
              badgeColor="bg-purple-100 text-purple-700"
            />
            <StatCard
              label="RAG Cache Hit Rate"
              value={`${m.cache.hit_rate}%`}
              sub={`${m.cache.hits} hits · ${m.cache.misses} misses`}
              icon="memory"
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              badge={m.cache.hit_rate >= 60 ? 'Good' : 'Low'}
              badgeColor={m.cache.hit_rate >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}
            />
            <StatCard
              label="Active Users"
              value={m.active_users}
              sub={`${m.errors.total} error event${m.errors.total !== 1 ? 's' : ''}`}
              icon="group"
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              badge={m.errors.total > 0 ? `${m.errors.total} errors` : 'No errors'}
              badgeColor={m.errors.total > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}
            />
          </div>

          {/* ── P95 + tokens highlight row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-500">
                <span className="material-symbols-outlined text-[24px]">speed</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">P95 Latency</p>
                <p className="text-2xl font-black text-indigo-800 mt-0.5">
                  {m.requests.p95_latency_ms}
                  <span className="text-sm font-medium ml-1">ms</span>
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-500">
                <span className="material-symbols-outlined text-[24px]">token</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider">Total Tokens</p>
                <p className="text-2xl font-black text-purple-800 mt-0.5">
                  {(m.gemini.total_tokens / 1_000).toFixed(1)}
                  <span className="text-sm font-medium ml-1">k</span>
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Est. AI Spend</p>
                <p className="text-2xl font-black text-amber-800 mt-0.5">
                  ${m.gemini.estimated_spend.toFixed(4)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Sparkline charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-800">Traffic Volume</h2>
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  {m.timeseries.length} buckets
                </span>
              </div>
              <div className="flex-1 h-40">
                <SparklineChart data={m.timeseries} dataKey="requests" color="#6366f1" />
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-2 uppercase tracking-wider">
                Requests over time
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-800">Error Volume</h2>
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  {m.timeseries.reduce((s, d) => s + (d.errors ?? 0), 0)} total
                </span>
              </div>
              <div className="flex-1 h-40">
                <SparklineChart data={m.timeseries} dataKey="errors" color="#f87171" />
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-2 uppercase tracking-wider">
                Error events over time
              </p>
            </div>
          </div>

          {/* ── Bottom: Top Endpoints + Error types ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Top Endpoints table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Top Endpoints</h2>
                <span className="text-xs text-slate-400">by call volume</span>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                {m.top_endpoints.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 text-sm">No request data</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-5 py-3">Path</th>
                        <th className="px-5 py-3 text-right">Hits</th>
                        <th className="px-5 py-3 text-right">Avg Latency</th>
                        <th className="px-5 py-3 text-right">Error %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.top_endpoints.map((ep, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors"
                        >
                          <td
                            className="px-5 py-3 font-mono text-xs text-slate-600 max-w-[220px] truncate"
                            title={ep.path}
                          >
                            {ep.path}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-slate-800">
                            {ep.count.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                ep.avg_latency_ms > 1000
                                  ? 'bg-red-100 text-red-700'
                                  : ep.avg_latency_ms > 500
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {ep.avg_latency_ms} ms
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-slate-500">
                            {ep.error_rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Error breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 bg-red-50/40 flex justify-between items-center">
                <h2 className="font-bold text-red-900">Errors by Type</h2>
                <span className="material-symbols-outlined text-red-400 text-[20px]">
                  bug_report
                </span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-72">
                {Object.keys(m.errors.by_type).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-emerald-600">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                    <p className="text-sm font-medium">No errors in range</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {Object.entries(m.errors.by_type)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => {
                        const pct = Math.round((count / m.errors.total) * 100);
                        return (
                          <li key={type}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-slate-700 truncate max-w-[160px]" title={type}>
                                {type}
                              </span>
                              <span className="font-bold text-red-600 ml-2">{count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ── Recent error log ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Recent Error Events</h2>
              <span className="text-xs text-slate-400">latest 20</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {m.recent_errors.length === 0 ? (
                <p className="p-8 text-center text-slate-400 text-sm">No error events recorded</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {m.recent_errors.map((err, i) => (
                    <li key={i} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-red-600">{err.error_type}</span>
                        <span className="text-[11px] text-slate-400">
                          {err.ts ? new Date(err.ts).toLocaleString() : '—'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-500 truncate">{err.path}</p>
                      {err.message && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{err.message}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
