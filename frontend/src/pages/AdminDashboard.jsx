import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Metric Card ──────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, icon, iconBg, iconColor, sub }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start mb-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
      </div>
    </div>
    <h3 className="text-2xl font-black text-slate-900">{value ?? '—'}</h3>
    {sub && <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>}
  </div>
);

// ── Metric Section ───────────────────────────────────────────────────────────
const MetricSection = ({ title, icon, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <span className="material-symbols-outlined text-[18px] text-slate-400">{icon}</span>
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h2>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('metrics');

  // Data
  const [metrics, setMetrics] = useState(null);
  const [versions, setVersions] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [reprocessState, setReprocessState] = useState({
    resumes: false, embeddings: false, applications: false, analytics: false,
  });
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessStatus, setReprocessStatus] = useState('');

  // Loading
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(24);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const res = await api.get(`/admin/metrics/summary?hours=${timeRange}`);
      setMetrics(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoadingMetrics(false);
    }
  }, [timeRange]);

  const fetchVersions = useCallback(async () => {
    try {
      setLoadingVersions(true);
      const res = await api.get('/admin/versions');
      setVersions(res.data);
    } catch { /* silent */ } finally {
      setLoadingVersions(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get('/admin/jobs');
      setJobs(res.data);
    } catch { /* silent */ } finally {
      setLoadingJobs(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch { /* silent */ } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchVersions();
    fetchJobs();
    fetchUsers();
  }, [fetchMetrics, fetchVersions, fetchJobs, fetchUsers]);

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { is_active: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleUpdateVersion = async (component, currentVersion) => {
    const newVersion = prompt(`New version for ${component} (current: ${currentVersion}):`, currentVersion);
    if (!newVersion || newVersion === currentVersion) return;
    try {
      await api.put(`/admin/versions/${component}`, { new_version: newVersion });
      fetchVersions();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleReprocess = async () => {
    const selected = Object.entries(reprocessState).filter(([, v]) => v).map(([k]) => k);
    if (selected.length === 0) { setReprocessStatus('Select at least one data type.'); return; }
    if (!confirm(`Reprocess: ${selected.join(', ')}? This runs in the background.`)) return;

    setReprocessing(true);
    setReprocessStatus('Starting reprocessing jobs...');
    const errors = [];
    for (const type of selected) {
      try {
        await api.post(`/admin/reprocess-${type === 'analytics' ? 'applications' : type}`, { all: true, item_ids: [] });
      } catch {
        errors.push(type);
      }
    }
    setReprocessing(false);
    setReprocessStatus(errors.length === 0
      ? `✓ Jobs started: ${selected.join(', ')}.`
      : `Completed with errors on: ${errors.join(', ')}.`
    );
    fetchJobs();
  };

  const REPROCESS_OPTIONS = [
    { key: 'resumes', label: 'Resume Parsing', desc: 'Re-runs PDF/DOCX extraction and entity parsing.' },
    { key: 'embeddings', label: 'Embeddings', desc: 'Rebuilds ChromaDB vector store.' },
    { key: 'applications', label: 'Matching', desc: 'Recalculates AI match scores.' },
    { key: 'analytics', label: 'Analytics', desc: 'Reprocesses metric aggregations.' },
  ];

  const VERSION_DISPLAY = [
    { key: 'parser_version', label: 'Parser Version', icon: 'document_scanner' },
    { key: 'embedding_version', label: 'Embedding Version', icon: 'hub' },
    { key: 'model_version', label: 'LLM Version', icon: 'memory' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Observability</h1>
          <p className="text-slate-500 mt-1">Platform metrics, AI versions, and background jobs.</p>
        </div>
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          {['metrics', 'users', 'versioning'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'versioning' ? 'AI Control' : tab === 'metrics' ? 'Metrics' : 'Users'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── METRICS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'metrics' && (
        <div className="space-y-8">
          {/* Controls */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-800">Platform Telemetry</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Range:</span>
              <select value={timeRange} onChange={e => setTimeRange(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value={1}>Last 1 Hour</option>
                <option value={6}>Last 6 Hours</option>
                <option value={24}>Last 24 Hours</option>
                <option value={168}>Last 7 Days</option>
              </select>
              <button onClick={fetchMetrics} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors" title="Refresh">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>
          </div>

          {loadingMetrics ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : !metrics ? (
            <div className="text-center py-12 text-slate-500">Failed to load metrics</div>
          ) : (
            <div className="space-y-8">
              {/* Platform */}
              <MetricSection title="Platform" icon="dns">
                <MetricCard label="API Requests" value={metrics.requests?.total?.toLocaleString()} icon="api" iconBg="bg-blue-50" iconColor="text-blue-600" sub={`Error rate: ${metrics.requests?.error_rate}%`} />
                <MetricCard label="Error Rate" value={`${metrics.requests?.error_rate}%`} icon="error" iconBg="bg-red-50" iconColor="text-red-500" sub={`${metrics.errors?.total} error events`} />
                <MetricCard label="Cache Hit Rate" value={`${metrics.cache?.hit_rate}%`} icon="memory" iconBg="bg-emerald-50" iconColor="text-emerald-600" sub={`${metrics.cache?.hits} hits / ${metrics.cache?.misses} misses`} />
                <MetricCard label="P95 Latency" value={`${metrics.requests?.p95_latency_ms}ms`} icon="speed" iconBg="bg-slate-100" iconColor="text-slate-600" />
              </MetricSection>

              {/* AI */}
              <MetricSection title="AI" icon="auto_awesome">
                <MetricCard label="Gemini Requests" value={metrics.gemini?.total_calls?.toLocaleString()} icon="psychology" iconBg="bg-purple-50" iconColor="text-purple-600" />
                <MetricCard label="Token Usage" value={`${((metrics.gemini?.total_tokens || 0) / 1000).toFixed(1)}k`} icon="data_usage" iconBg="bg-indigo-50" iconColor="text-indigo-600" />
                <MetricCard label="Estimated Cost" value={`$${metrics.gemini?.estimated_spend?.toFixed(4)}`} icon="attach_money" iconBg="bg-green-50" iconColor="text-green-600" />
                <MetricCard label="Avg AI Latency" value={`${metrics.gemini?.avg_latency_ms}ms`} icon="timer" iconBg="bg-amber-50" iconColor="text-amber-600" />
              </MetricSection>

              {/* Users */}
              <MetricSection title="Users" icon="group">
                <MetricCard label="Active Users" value={metrics.active_users} icon="person" iconBg="bg-sky-50" iconColor="text-sky-600" />
                <MetricCard label="Candidates" value={users.filter(u => u.role === 'candidate').length} icon="description" iconBg="bg-indigo-50" iconColor="text-indigo-600" />
                <MetricCard label="Recruiters" value={users.filter(u => u.role === 'recruiter').length} icon="work" iconBg="bg-purple-50" iconColor="text-purple-600" />
                <MetricCard label="Error Events" value={metrics.errors?.total} icon="report" iconBg={metrics.errors?.total > 0 ? 'bg-red-50' : 'bg-slate-100'} iconColor={metrics.errors?.total > 0 ? 'text-red-500' : 'text-slate-500'} />
              </MetricSection>

              {/* Recruitment */}
              <MetricSection title="Recruitment" icon="handshake">
                <MetricCard label="Jobs Posted" value={users.filter(u => u.role !== 'candidate').length > 0 ? '—' : '—'} icon="work_history" iconBg="bg-amber-50" iconColor="text-amber-600" />
                <MetricCard
                  label="Applications"
                  value={metrics.events ? (Object.entries(metrics.events).find(([k]) => k === 'job_application')?.[1]?.toLocaleString() ?? '—') : '—'}
                  icon="send" iconBg="bg-emerald-50" iconColor="text-emerald-600"
                />
                <MetricCard
                  label="Resume Uploads"
                  value={metrics.events ? (Object.entries(metrics.events).find(([k]) => k === 'resume_upload')?.[1]?.toLocaleString() ?? '—') : '—'}
                  icon="upload_file" iconBg="bg-blue-50" iconColor="text-blue-600"
                />
                <MetricCard
                  label="Resume Optimizer"
                  value={metrics.events ? (Object.entries(metrics.events).find(([k]) => k === 'resume_optimization')?.[1]?.toLocaleString() ?? '—') : '—'}
                  icon="auto_fix_high" iconBg="bg-purple-50" iconColor="text-purple-600"
                />
              </MetricSection>

              {/* Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">Top Endpoints</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-5 py-3">Path</th>
                          <th className="px-5 py-3">Hits</th>
                          <th className="px-5 py-3">Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.top_endpoints?.map((ep, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="px-5 py-3 font-mono text-xs text-slate-600 truncate max-w-[200px]" title={ep.path}>{ep.path}</td>
                            <td className="px-5 py-3 font-semibold text-slate-700">{ep.count}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${ep.avg_latency_ms > 1000 ? 'bg-red-100 text-red-700' : ep.avg_latency_ms > 500 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {ep.avg_latency_ms}ms
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 bg-red-50/50">
                    <h3 className="font-bold text-red-900">Recent Errors</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {metrics.recent_errors?.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">No errors in this time range</div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {metrics.recent_errors?.map((err, i) => (
                          <li key={i} className="p-4 hover:bg-slate-50">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-bold text-red-600">{err.error_type}</span>
                              <span className="text-xs text-slate-400">{new Date(err.ts).toLocaleString()}</span>
                            </div>
                            <p className="text-xs font-mono text-slate-700 break-words">{err.path}</p>
                            <p className="text-xs text-slate-500 break-words mt-0.5">{err.message}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── USERS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Platform Users</h3>
            <button onClick={fetchUsers} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wide">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            {loadingUsers ? (
              <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="px-5 py-3">Name / Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Joined</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <select value={u.role} onChange={e => changeUserRole(u._id, e.target.value)}
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border-none outline-none cursor-pointer
                            ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : ''}
                            ${u.role === 'recruiter' ? 'bg-blue-100 text-blue-700' : ''}
                            ${u.role === 'candidate' ? 'bg-slate-100 text-slate-700' : ''}
                          `}>
                          <option value="candidate">Candidate</option>
                          <option value="recruiter">Recruiter</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => toggleUserStatus(u._id, u.is_active)}
                          className={`text-xs font-bold px-3 py-1 rounded transition-colors ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── AI CONTROL TAB ──────────────────────────────────────────── */}
      {activeTab === 'versioning' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Version Management */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">AI Versions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Current pipeline component versions.</p>
              </div>
              {versions?.updated_at && (
                <p className="text-xs text-slate-400">Updated {new Date(versions.updated_at).toLocaleString()}</p>
              )}
            </div>
            <div className="p-5 space-y-3">
              {loadingVersions ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)
              ) : !versions ? (
                <div className="text-center text-slate-500 py-6">Failed to load versions</div>
              ) : (
                VERSION_DISPLAY.map(v => (
                  <div key={v.key} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <span className="material-symbols-outlined text-[20px]">{v.icon}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{v.label}</p>
                        <p className="text-base font-mono font-black text-indigo-600">{versions[v.key] || '—'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleUpdateVersion(v.key, versions[v.key])}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                      BUMP
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Unified Reprocessing */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-amber-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-amber-900">Reprocess Platform Data</h3>
                <p className="text-xs text-amber-700/70 mt-0.5">Select data types and trigger background reprocessing.</p>
              </div>
              <span className="material-symbols-outlined text-amber-500 text-3xl">build_circle</span>
            </div>
            <div className="p-5 space-y-3">
              {REPROCESS_OPTIONS.map(opt => (
                <label key={opt.key} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-amber-200 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reprocessState[opt.key]}
                    onChange={e => setReprocessState(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
              <button onClick={handleReprocess} disabled={reprocessing || !Object.values(reprocessState).some(Boolean)}
                className="w-full mt-2 py-3 rounded-xl font-bold text-sm transition-all
                  bg-amber-500 text-white hover:bg-amber-600 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                  flex items-center justify-center gap-2">
                {reprocessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {reprocessing ? 'Starting Jobs...' : 'Run Reprocessing'}
              </button>
              {reprocessStatus && (
                <p className={`text-xs font-medium text-center mt-2 ${reprocessStatus.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {reprocessStatus}
                </p>
              )}
            </div>

            {/* Recent Jobs */}
            <div className="border-t border-slate-100">
              <div className="px-5 py-3 bg-slate-50 flex justify-between items-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Background Jobs</p>
                <button onClick={fetchJobs} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide">Refresh</button>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {loadingJobs ? (
                  <div className="p-6 text-center"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : jobs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No recent jobs</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(job => (
                        <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-700 capitalize text-xs">{job.type}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
                              ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}
                              ${job.status === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' : ''}
                              ${job.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                              ${job.status === 'pending' ? 'bg-slate-100 text-slate-600' : ''}
                            `}>{job.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{job.processed}/{job.total || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
