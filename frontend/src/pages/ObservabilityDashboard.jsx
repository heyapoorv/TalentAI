import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function ObservabilityDashboard() {
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' or 'versioning'
  
  // Data
  const [metrics, setMetrics] = useState(null);
  const [versions, setVersions] = useState(null);
  const [jobs, setJobs] = useState([]);
  
  // State
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    fetchMetrics();
    fetchVersions();
    fetchJobs();
    
    // Refresh metrics periodically
    const interval = setInterval(() => {
      fetchJobs();
    }, 10000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const res = await api.get(`/admin/metrics/summary?hours=${timeRange}`);
      setMetrics(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchVersions = async () => {
    try {
      setLoadingVersions(true);
      const res = await api.get('/admin/versions');
      setVersions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.get('/admin/jobs');
      setJobs(res.data);
      setLoadingJobs(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateVersion = async (component, currentVersion) => {
    const newVersion = prompt(`Enter new version for ${component} (current: ${currentVersion}):`, currentVersion);
    if (!newVersion || newVersion === currentVersion) return;
    
    try {
      await api.put(`/admin/versions/${component}`, { new_version: newVersion });
      fetchVersions();
      alert(`Version updated to ${newVersion}`);
    } catch (err) {
      alert(`Error updating version: ${err.message}`);
    }
  };

  const handleReprocess = async (type) => {
    if (!confirm(`Are you sure you want to trigger a full background reprocess for ${type}? This may take a while.`)) return;
    
    try {
      await api.post(`/admin/reprocess-${type}`, { all: true, item_ids: [] });
      fetchJobs();
    } catch (err) {
      alert(`Error starting job: ${err.message}`);
    }
  };

  // Sparkline chart component using pure CSS flexbox
  const SparklineChart = ({ data, dataKey, colorClass = "bg-primary" }) => {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-sm text-slate-400">No data</div>;
    
    const maxVal = Math.max(...data.map(d => d[dataKey]), 1); // Avoid div by zero
    
    return (
      <div className="h-full w-full flex items-end gap-1 px-1">
        {data.map((d, i) => {
          const heightPct = Math.max((d[dataKey] / maxVal) * 100, 2);
          return (
            <div 
              key={i} 
              className={`flex-1 rounded-t-sm ${colorClass} opacity-80 hover:opacity-100 transition-opacity relative group`}
              style={{ height: `${heightPct}%` }}
            >
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap">
                {new Date(d.ts).toLocaleString([], {hour: '2-digit', minute:'2-digit'})}
                <br/>
                {dataKey}: {d[dataKey]}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Observability</h1>
          <p className="text-slate-500 mt-1">Platform metrics, AI versions, and background jobs.</p>
        </div>
        
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'metrics' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Metrics Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('versioning')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'versioning' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            AI Version Control
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* METRICS TAB */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-800">Platform Telemetry</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Time Range:</span>
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={1}>Last 1 Hour</option>
                <option value={6}>Last 6 Hours</option>
                <option value={24}>Last 24 Hours</option>
                <option value={168}>Last 7 Days</option>
              </select>
              <button 
                onClick={fetchMetrics} 
                className="p-1.5 text-slate-400 hover:text-primary transition-colors bg-slate-50 hover:bg-primary/10 rounded-lg border border-slate-200"
                title="Refresh Metrics"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>
          </div>

          {loadingMetrics ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !metrics ? (
            <div className="text-center py-12 text-slate-500">Failed to load metrics</div>
          ) : (
            <>
              {/* Top Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* API Stats */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total API Requests</p>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.requests.total.toLocaleString()}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <span className="material-symbols-outlined">api</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mt-4">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Error Rate</span>
                      <span className={`font-semibold ${metrics.requests.error_rate > 5 ? 'text-red-500' : 'text-slate-700'}`}>
                        {metrics.requests.error_rate}%
                      </span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">P95 Latency</span>
                      <span className="font-semibold text-slate-700">{metrics.requests.p95_latency_ms}ms</span>
                    </div>
                  </div>
                </div>

                {/* Gemini Stats */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Gemini Inferences</p>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.gemini.total_calls.toLocaleString()}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                      <span className="material-symbols-outlined">auto_awesome</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mt-4">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Tokens Used</span>
                      <span className="font-semibold text-slate-700">{(metrics.gemini.total_tokens / 1000).toFixed(1)}k</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Avg Latency</span>
                      <span className="font-semibold text-slate-700">{metrics.gemini.avg_latency_ms}ms</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Est. Spend</span>
                      <span className="font-semibold text-green-600">${metrics.gemini.estimated_spend.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* RAG Cache Stats */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">RAG Cache Hit Rate</p>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.cache.hit_rate}%</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <span className="material-symbols-outlined">memory</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mt-4">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Hits</span>
                      <span className="font-semibold text-emerald-600">{metrics.cache.hits}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Misses</span>
                      <span className="font-semibold text-slate-700">{metrics.cache.misses}</span>
                    </div>
                  </div>
                </div>

                {/* Users Stats */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Active Users</p>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.active_users}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <span className="material-symbols-outlined">group</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mt-4">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Error Events</span>
                      <span className={`font-semibold ${metrics.errors.total > 0 ? 'text-red-500' : 'text-slate-700'}`}>
                        {metrics.errors.total}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-6">Traffic Volume</h3>
                  <div className="flex-1 h-48 border-b border-slate-100 pb-2">
                    <SparklineChart data={metrics.timeseries} dataKey="requests" colorClass="bg-blue-400" />
                  </div>
                  <div className="mt-2 text-xs text-slate-400 text-center uppercase tracking-wider">Time Distribution</div>
                </div>
                
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-6">Error Volume</h3>
                  <div className="flex-1 h-48 border-b border-slate-100 pb-2">
                    <SparklineChart data={metrics.timeseries} dataKey="errors" colorClass="bg-red-400" />
                  </div>
                  <div className="mt-2 text-xs text-slate-400 text-center uppercase tracking-wider">Time Distribution</div>
                </div>
              </div>

              {/* Lists Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Top Endpoints</h3>
                  </div>
                  <div className="p-0 max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-5 py-3">Path</th>
                          <th className="px-5 py-3">Hits</th>
                          <th className="px-5 py-3">Avg Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.top_endpoints.map((ep, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="px-5 py-3 font-mono text-xs text-slate-600 truncate max-w-[200px]" title={ep.path}>{ep.path}</td>
                            <td className="px-5 py-3 font-semibold text-slate-700">{ep.count}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${ep.avg_latency_ms > 1000 ? 'bg-red-100 text-red-700' : (ep.avg_latency_ms > 500 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}`}>
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
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                    <h3 className="font-bold text-red-900">Recent Errors</h3>
                  </div>
                  <div className="p-0 max-h-[300px] overflow-y-auto">
                    {metrics.recent_errors.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">No errors recorded in this time range</div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {metrics.recent_errors.map((err, i) => (
                          <li key={i} className="p-4 hover:bg-slate-50">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-bold text-red-600">{err.error_type}</span>
                              <span className="text-xs text-slate-400">{new Date(err.ts).toLocaleString()}</span>
                            </div>
                            <p className="text-sm font-mono text-slate-700 break-words mb-1">{err.path}</p>
                            <p className="text-xs text-slate-500 break-words">{err.message}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* VERSIONING TAB */}
      {activeTab === 'versioning' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Versions List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800">Active AI Versions</h3>
                  <p className="text-xs text-slate-500 mt-1">Registry for pipelines and generation logic.</p>
                </div>
                {versions && (
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Last Updated</p>
                    <p className="text-sm font-medium text-slate-700">{versions.updated_at ? new Date(versions.updated_at).toLocaleString() : 'N/A'}</p>
                  </div>
                )}
              </div>
              
              <div className="p-5 flex-1">
                {loadingVersions ? (
                  <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : !versions ? (
                  <div className="text-center text-slate-500">Failed to load versions</div>
                ) : (
                  <div className="space-y-4">
                    {['parser_version', 'embedding_version', 'analysis_version', 'copilot_version', 'model_version'].map((key) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined">{key.includes('model') ? 'memory' : 'account_tree'}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">{key.replace('_', ' ').toUpperCase()}</p>
                            <p className="text-lg font-mono text-primary mt-0.5">{versions[key]}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUpdateVersion(key, versions[key])}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          BUMP
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reprocessing Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-amber-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-amber-900">Bulk Reprocessing</h3>
                  <p className="text-xs text-amber-700/70 mt-1">Trigger background jobs to update stale data.</p>
                </div>
                <span className="material-symbols-outlined text-amber-500 text-3xl">build_circle</span>
              </div>
              
              <div className="p-5 space-y-4">
                {[
                  { id: 'resumes', name: 'Reprocess All Resumes', desc: 'Re-runs PDF parsing and entity extraction.' },
                  { id: 'applications', name: 'Recalculate Applications', desc: 'Re-runs Gemini matching engine against jobs.' },
                  { id: 'embeddings', name: 'Rebuild Embeddings', desc: 'Regenerates ChromaDB vectors for RAG.' },
                ].map((task) => (
                  <div key={task.id} className="p-4 rounded-xl border border-amber-100 bg-white flex items-center justify-between group hover:border-amber-300 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800">{task.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{task.desc}</p>
                    </div>
                    <button 
                      onClick={() => handleReprocess(task.id)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-amber-600 bg-amber-50 group-hover:bg-amber-500 group-hover:text-white transition-colors"
                      title="Run Full Job"
                    >
                      <span className="material-symbols-outlined">play_arrow</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Jobs List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Recent Background Jobs</h3>
              <button 
                onClick={fetchJobs} 
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                REFRESH
              </button>
            </div>
            <div className="p-0 max-h-[400px] overflow-y-auto">
              {loadingJobs ? (
                <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : jobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No recent jobs</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Progress</th>
                      <th className="px-5 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-semibold text-slate-700 capitalize">{job.type}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                            ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}
                            ${job.status === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' : ''}
                            ${job.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                            ${job.status === 'pending' ? 'bg-slate-100 text-slate-700' : ''}
                          `}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 w-1/3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${job.status === 'failed' ? 'bg-red-500' : 'bg-primary'}`} 
                                style={{ width: `${job.total ? (job.processed / job.total) * 100 : 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-mono text-slate-500 min-w-[50px]">{job.processed} / {job.total || 0}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {job.started_at ? new Date(job.started_at).toLocaleTimeString() : 'Waiting...'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
