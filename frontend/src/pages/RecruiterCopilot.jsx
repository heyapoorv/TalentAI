import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Action definitions ────────────────────────────────────────────────────────
const ACTIONS = [
  {
    id: 'shortlist',
    label: 'Shortlist Top Candidates',
    icon: 'emoji_events',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    desc: 'Rank all applicants by AI match score and fit.',
    scope: 'job',
  },
  {
    id: 'compare',
    label: 'Compare Candidates',
    icon: 'compare',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.2)',
    desc: 'Side-by-side analysis of selected applicants.',
    scope: 'multi',
  },
  {
    id: 'recommendation',
    label: 'Hiring Recommendation',
    icon: 'psychology',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    desc: 'AI verdict: hire / hold / reject with reasoning.',
    scope: 'applicant',
  },
  {
    id: 'scorecard',
    label: 'Interview Scorecard',
    icon: 'fact_check',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.2)',
    desc: 'Generate structured interview questions for a candidate.',
    scope: 'applicant',
  },
  {
    id: 'insights',
    label: 'Skill Gap Analysis',
    icon: 'radar',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    desc: 'Detailed skill match breakdown and gap report.',
    scope: 'applicant',
  },
  {
    id: 'summary',
    label: 'Candidate Summary',
    icon: 'person_search',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    desc: 'Quick AI-generated profile snapshot from resume.',
    scope: 'applicant',
  },
];

// ── Result renderer ───────────────────────────────────────────────────────────
const ResultPanel = ({ actionId, result, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${[80, 60, 70][i - 1]}%` }} />
        ))}
      </div>
    );
  }
  if (!result) return null;

  if (actionId === 'shortlist') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
            <tr>
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Candidate</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Fit</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.map((a, i) => (
              <tr key={a.application_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-bold text-slate-400">#{i + 1}</td>
                <td className="px-5 py-3">
                  <p className="font-semibold text-slate-800">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={`font-bold text-lg ${a.match_score >= 75 ? 'text-emerald-600' : a.match_score >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {a.match_score}%
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    a.fit_badge === 'Top Fit' ? 'bg-emerald-100 text-emerald-700' :
                    a.fit_badge === 'Good Fit' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{a.fit_badge}</span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500 capitalize">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (actionId === 'compare') {
    const candidates = result.candidates || [];
    return (
      <div className="p-6 space-y-4">
        {result.summary && <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">{result.summary}</p>}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${candidates.length}, 1fr)` }}>
          {candidates.map(c => (
            <div key={c.application_id || c.name} className="p-4 rounded-xl border border-slate-100 bg-white">
              <p className="font-bold text-slate-800 mb-2">{c.name}</p>
              <p className="text-2xl font-black text-indigo-600 mb-3">{Math.round(c.match_score || 0)}%</p>
              {c.strengths?.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Strengths</p>
                  <ul className="space-y-1">{c.strengths.slice(0, 3).map((s, i) => <li key={i} className="text-xs text-slate-600">• {s}</li>)}</ul>
                </div>
              )}
              {c.gaps?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Gaps</p>
                  <ul className="space-y-1">{c.gaps.slice(0, 3).map((g, i) => <li key={i} className="text-xs text-slate-600">• {g}</li>)}</ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (actionId === 'recommendation') {
    const verdict = result.verdict || result.decision || result.recommendation || 'N/A';
    const verdictColor = verdict?.toLowerCase().includes('hire') ? '#10b981' : verdict?.toLowerCase().includes('reject') ? '#ef4444' : '#f59e0b';
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: verdictColor + '30', background: verdictColor + '08' }}>
          <span className="material-symbols-outlined text-4xl" style={{ color: verdictColor }}>
            {verdict?.toLowerCase().includes('hire') ? 'thumb_up' : verdict?.toLowerCase().includes('reject') ? 'thumb_down' : 'thumbs_up_down'}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Verdict</p>
            <p className="text-2xl font-black capitalize" style={{ color: verdictColor }}>{verdict}</p>
          </div>
        </div>
        {result.reasoning && <p className="text-sm text-slate-600 leading-relaxed">{result.reasoning}</p>}
        {result.risks?.length > 0 && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Risks</p>
            <ul className="space-y-1">{result.risks.map((r, i) => <li key={i} className="text-sm text-amber-800">• {r}</li>)}</ul>
          </div>
        )}
      </div>
    );
  }

  if (actionId === 'scorecard') {
    const questions = result.questions || [];
    return (
      <div className="p-6 space-y-3">
        {result.overview && <p className="text-sm text-slate-600 mb-4 italic">{result.overview}</p>}
        {questions.map((q, i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{q.question}</p>
                {q.what_to_look_for && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{q.what_to_look_for}</p>}
                {q.category && <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-medium">{q.category}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (actionId === 'insights') {
    return (
      <div className="p-6 space-y-4">
        {result.match_score !== undefined && (
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle cx="40" cy="40" r="32" fill="none" stroke={result.match_score >= 75 ? '#10b981' : result.match_score >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="8"
                  strokeDasharray={`${(result.match_score / 100) * 201} 201`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900">{Math.round(result.match_score)}%</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Match Score</p>
              <p className="text-slate-600 text-sm mt-1">{result.job_role}</p>
            </div>
          </div>
        )}
        {result.missing_skills?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Skill Gaps</p>
            <div className="flex flex-wrap gap-2">{result.missing_skills.map((s, i) => <span key={i} className="px-2 py-1 text-xs rounded-full bg-red-50 text-red-600 border border-red-100">{s}</span>)}</div>
          </div>
        )}
        {result.strengths?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Strengths</p>
            <ul className="space-y-1">{result.strengths.slice(0, 4).map((s, i) => <li key={i} className="text-sm text-slate-600">• {s}</li>)}</ul>
          </div>
        )}
        {result.suggestions?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Suggestions</p>
            <ul className="space-y-1">{result.suggestions.slice(0, 4).map((s, i) => <li key={i} className="text-sm text-slate-600">• {s}</li>)}</ul>
          </div>
        )}
      </div>
    );
  }

  if (actionId === 'summary') {
    const parsed = result.parsed_data ? (typeof result.parsed_data === 'string' ? JSON.parse(result.parsed_data) : result.parsed_data) : {};
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {parsed.name && <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{parsed.name}</p></div>}
          {parsed.location && <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</p><p className="text-sm text-slate-700 mt-0.5">{parsed.location}</p></div>}
          {parsed.experience_years && <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Experience</p><p className="text-sm text-slate-700 mt-0.5">{parsed.experience_years} years</p></div>}
          {parsed.education && <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Education</p><p className="text-sm text-slate-700 mt-0.5">{parsed.education}</p></div>}
        </div>
        {parsed.skills?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skills</p>
            <div className="flex flex-wrap gap-2">{parsed.skills.slice(0, 12).map((s, i) => <span key={i} className="px-2 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{s}</span>)}</div>
          </div>
        )}
        {(parsed.raw_text_preview || result.resume_preview) && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 line-clamp-4">{parsed.raw_text_preview || result.resume_preview}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <pre className="text-xs text-slate-600 bg-slate-50 rounded-xl p-4 overflow-auto max-h-64">{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function RecruiterActionHub() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [activeAction, setActiveAction] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobsLoading, setJobsLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  // ── Load jobs ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/jobs');
        setJobs(res.data?.jobs || res.data || []);
      } catch {
        setJobs([]);
      } finally {
        setJobsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // ── Load applicants when job changes ─────────────────────────────────
  useEffect(() => {
    if (!selectedJobId) { setApplicants([]); setSelectedAppIds([]); return; }
    const fetchApplicants = async () => {
      setApplicantsLoading(true);
      setResult(null);
      setActiveAction(null);
      setSelectedAppIds([]);
      try {
        const res = await api.get(`/jobs/${selectedJobId}/applicants?sort_by=match_score`);
        setApplicants(Array.isArray(res.data) ? res.data : []);
      } catch {
        setApplicants([]);
      } finally {
        setApplicantsLoading(false);
      }
    };
    fetchApplicants();
  }, [selectedJobId]);

  const toggleApplicant = (appId) => {
    setSelectedAppIds(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  const selectedJob = jobs.find(j => (j._id || j.id) === selectedJobId);
  const primaryApplicant = applicants.find(a => a.application_id === selectedAppIds[0]);

  const canRunAction = (action) => {
    if (!selectedJobId) return false;
    if (action.scope === 'applicant') return selectedAppIds.length === 1;
    if (action.scope === 'multi') return selectedAppIds.length >= 2;
    if (action.scope === 'job') return true;
    return false;
  };

  const runAction = async (action) => {
    if (!canRunAction(action)) return;
    setActiveAction(action);
    setResult(null);
    setError('');
    setLoading(true);

    try {
      let res;
      if (action.id === 'shortlist') {
        res = await api.get(`/jobs/${selectedJobId}/applicants?sort_by=match_score`);
        setResult(Array.isArray(res.data) ? res.data : []);
      } else if (action.id === 'compare') {
        res = await api.post(`/jobs/${selectedJobId}/compare`, { application_ids: selectedAppIds });
        setResult(res.data);
      } else if (action.id === 'recommendation') {
        res = await api.get(`/applications/${selectedAppIds[0]}/recommendation`);
        setResult(res.data);
      } else if (action.id === 'scorecard') {
        res = await api.get(`/applications/${selectedAppIds[0]}/scorecard`);
        setResult(res.data);
      } else if (action.id === 'insights') {
        res = await api.get(`/applications/${selectedAppIds[0]}/insights`);
        setResult(res.data);
      } else if (action.id === 'summary') {
        const appData = applicants.find(a => a.application_id === selectedAppIds[0]);
        setResult(appData || {});
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Action Hub</h1>
        <p className="text-slate-500 mt-1">One-click AI workflows for faster, smarter hiring decisions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT PANEL: Context selectors ─────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Job selector */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">work</span>
              Active Job
            </label>
            {jobsLoading ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <select
                id="action-hub-job-select"
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:outline-none transition-all"
              >
                <option value="">Select a job...</option>
                {jobs.map(j => (
                  <option key={j._id || j.id} value={j._id || j.id}>{j.role} — {j.company}</option>
                ))}
              </select>
            )}
            {selectedJob && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium border border-indigo-100">{selectedJob.location || 'Remote'}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{applicants.length} applicants</span>
              </div>
            )}
          </div>

          {/* Applicant selector */}
          {selectedJobId && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">group</span>
                  Select Candidates
                </p>
                {selectedAppIds.length > 0 && (
                  <button onClick={() => setSelectedAppIds([])} className="text-xs text-slate-400 hover:text-red-500 transition-colors font-semibold">
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {applicantsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse bg-slate-50 border-b border-slate-100" />
                  ))
                ) : applicants.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">person_off</span>
                    <p className="text-xs font-semibold">No applicants yet</p>
                  </div>
                ) : (
                  applicants.map(a => {
                    const checked = selectedAppIds.includes(a.application_id);
                    return (
                      <button
                        key={a.application_id}
                        onClick={() => toggleApplicant(a.application_id)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all hover:bg-slate-50 ${checked ? 'bg-indigo-50' : ''}`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          {checked && <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                          <p className="text-xs text-slate-400 truncate">{a.email}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          a.match_score >= 75 ? 'bg-emerald-50 text-emerald-700' :
                          a.match_score >= 50 ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>{a.match_score}%</span>
                      </button>
                    );
                  })
                )}
              </div>
              {selectedAppIds.length > 0 && (
                <div className="px-5 py-3 bg-indigo-50 border-t border-indigo-100">
                  <p className="text-xs text-indigo-700 font-semibold">{selectedAppIds.length} candidate{selectedAppIds.length > 1 ? 's' : ''} selected</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Actions + Results ───────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Action Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">bolt</span>
              One-Click Actions
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ACTIONS.map(action => {
                const enabled = canRunAction(action);
                const active = activeAction?.id === action.id;
                return (
                  <button
                    key={action.id}
                    id={`action-${action.id}`}
                    onClick={() => runAction(action)}
                    disabled={!enabled || loading}
                    title={
                      !selectedJobId ? 'Select a job first' :
                      action.scope === 'applicant' && selectedAppIds.length !== 1 ? 'Select exactly 1 candidate' :
                      action.scope === 'multi' && selectedAppIds.length < 2 ? 'Select 2+ candidates' :
                      action.label
                    }
                    className={`p-4 rounded-xl border text-left transition-all duration-200 group ${
                      active ? 'ring-2 ring-offset-1' : ''
                    } ${enabled && !loading ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                    style={{
                      borderColor: active ? action.color : action.border,
                      background: active ? action.bg : 'white',
                      ringColor: action.color,
                    }}
                  >
                    <span className="material-symbols-outlined text-2xl block mb-2" style={{ color: action.color }}>{action.icon}</span>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{action.label}</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug hidden md:block">{action.desc}</p>
                  </button>
                );
              })}
            </div>

            {!selectedJobId && (
              <p className="text-xs text-slate-400 text-center mt-4 font-medium">
                <span className="material-symbols-outlined text-[13px] align-middle mr-1">info</span>
                Select a job to enable actions
              </p>
            )}
          </div>

          {/* Result panel */}
          {(activeAction || error) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeAction && (
                    <span className="material-symbols-outlined text-xl" style={{ color: activeAction.color }}>{activeAction.icon}</span>
                  )}
                  <h3 className="font-bold text-slate-800">{activeAction?.label || 'Result'}</h3>
                  {primaryApplicant && activeAction?.scope !== 'job' && (
                    <span className="text-xs text-slate-400">— {primaryApplicant.name}</span>
                  )}
                </div>
                {loading && (
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {error ? (
                <div className="p-6 flex items-center gap-3 text-red-600">
                  <span className="material-symbols-outlined">error</span>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              ) : (
                <ResultPanel actionId={activeAction?.id} result={result} loading={loading} />
              )}
            </div>
          )}

          {/* Hero empty state */}
          {!activeAction && !error && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                <span className="material-symbols-outlined text-3xl text-white">bolt</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Select a job and run an action</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Pick a job from the left panel, optionally select candidates, then click any action to get instant AI-powered insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
