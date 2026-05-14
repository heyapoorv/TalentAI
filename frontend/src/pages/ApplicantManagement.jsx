import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';

const STATUS_OPTIONS = ['Applied', 'Shortlisted', 'Interviewing', 'Offered', 'Rejected'];

const FIT_CONFIG = {
  'Top Fit':  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500', icon: 'verified' },
  'Good Fit': { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',   dot: 'bg-amber-400',  icon: 'thumb_up' },
  'Low Fit':  { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-100',   dot: 'bg-slate-300',  icon: 'remove' },
};

const STATUS_CONFIG = {
  Applied:     { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-100'  },
  Shortlisted: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  Interviewing:{ bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100'    },
  Offered:     { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100'  },
  Rejected:    { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-100'    },
};

// ── Skeleton card that matches the actual layout ─────────────────────────────
const ApplicantSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-7 w-20 rounded-xl" />
    </div>
    <div className="flex items-center gap-3">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
      <Skeleton className="h-8 w-28 rounded-xl" />
      <Skeleton className="h-8 w-28 rounded-xl" />
    </div>
  </div>
);

// ── Resume Preview Modal ──────────────────────────────────────────────────────
const ResumeModal = ({ candidate, onClose }) => {
  if (!candidate) return null;
  const fit = FIT_CONFIG[candidate.fit_badge] || FIT_CONFIG['Low Fit'];
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl">
              {candidate.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{candidate.name}</h3>
              <p className="text-slate-500 text-sm font-medium">{candidate.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scores */}
        <div className="px-8 py-6 grid grid-cols-3 gap-4 border-b border-slate-100">
          <div className="text-center">
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{candidate.match_score}%</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">AI Match Score</p>
          </div>
          <div className={`text-center px-3 py-3 rounded-2xl ${fit.bg} ${fit.border} border`}>
            <span className={`material-symbols-outlined text-2xl ${fit.text}`}>{fit.icon}</span>
            <p className={`text-xs font-black uppercase tracking-widest mt-1 ${fit.text}`}>{candidate.fit_badge}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-900">{candidate.applied_at ? new Date(candidate.applied_at).toLocaleDateString() : '—'}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Applied</p>
          </div>
        </div>

        {/* Skills */}
        {candidate.resume_skills?.length > 0 && (
          <div className="px-8 py-5 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Skills Detected</p>
            <div className="flex flex-wrap gap-2">
              {candidate.resume_skills.map((s, i) => (
                <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Resume Preview */}
        <div className="px-8 py-5 flex-1 overflow-y-auto">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resume Preview</p>
          {candidate.resume_preview ? (
            <p className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100">{candidate.resume_preview}…</p>
          ) : (
            <p className="text-slate-400 text-sm italic">No resume preview available.</p>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-100 bg-white flex items-center gap-3">
          <Link
            to={`/insights/${candidate.application_id}`}
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all group/btn"
          >
            <span className="material-symbols-outlined group-hover/btn:scale-125 transition-transform">insights</span>
            AI Insights
          </Link>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ApplicantManagement() {
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get('jobId');

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(preselectedJobId || '');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [sortBy, setSortBy] = useState('match_score');
  const [previewCandidate, setPreviewCandidate] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 3000); };

  // Load recruiter's jobs
  useEffect(() => {
    api.get('/jobs?page_size=100').then(r => {
      setJobs(r.data.jobs || []);
      if (!preselectedJobId && r.data.jobs?.length > 0) {
        setSelectedJobId(r.data.jobs[0]._id || r.data.jobs[0].id);
      }
    }).catch(() => {}).finally(() => setLoadingJobs(false));
  }, [preselectedJobId]);

  // Load applicants when job or sort changes
  const fetchApplicants = useCallback(async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const res = await api.get(`/jobs/${selectedJobId}/applicants?sort_by=${sortBy}`);
      setApplicants(res.data);
    } catch (err) {
      console.error('Error fetching applicants:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, sortBy]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  const handleStatusChange = async (applicationId, newStatus) => {
    setUpdatingStatus(applicationId);
    try {
      await api.put(`/applications/${applicationId}/status`, { status: newStatus });
      setApplicants(prev => prev.map(a => a.application_id === applicationId ? { ...a, status: newStatus } : a));
      showToast('success', `Status updated to ${newStatus}`);
    } catch {
      showToast('error', 'Failed to update status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const selectedJob = jobs.find(j => (j._id || j.id) === selectedJobId);
  const topFit    = applicants.filter(a => a.fit_badge === 'Top Fit').length;
  const goodFit   = applicants.filter(a => a.fit_badge === 'Good Fit').length;
  const shortlisted = applicants.filter(a => a.status === 'Shortlisted').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] font-black text-sm animate-in slide-in-from-right-10 duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
            {toast.text}
          </div>
        </div>
      )}

      <ResumeModal candidate={previewCandidate} onClose={() => setPreviewCandidate(null)} />

      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-[0.02] group-hover:rotate-12 transition-transform duration-1000">
          <span className="material-symbols-outlined text-[200px]">group</span>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-6 justify-between">
          <div>
            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
              <Link className="hover:text-primary transition-colors" to="/recruiter-dashboard">Dashboard</Link>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="text-primary">Applicant Pipeline</span>
            </nav>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Applicant Pipeline</h1>
            <p className="text-slate-500 font-medium mt-2">AI-ranked candidates sorted by semantic match score.</p>
          </div>
          <Link to="/jobs/new" className="flex items-center gap-2 bg-slate-900 text-white px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/10">
            <span className="material-symbols-outlined text-sm">add</span> Post New Job
          </Link>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Job selector */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">work</span>
          {loadingJobs ? (
            <Skeleton className="h-14 w-full rounded-2xl" />
          ) : (
            <select
              className="w-full pl-11 pr-10 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold text-slate-700 appearance-none cursor-pointer focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all"
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
            >
              <option value="">— Select a job —</option>
              {jobs.map(j => (
                <option key={j._id || j.id} value={j._id || j.id}>
                  {j.role} {j.company ? `· ${j.company}` : ''} ({j.applicant_count || 0} applicants)
                </option>
              ))}
            </select>
          )}
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
        </div>

        {/* Sort */}
        <div className="relative w-full md:w-64">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">sort</span>
          <select
            className="w-full pl-11 pr-10 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold text-slate-700 appearance-none cursor-pointer focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="match_score">Sort: AI Match Score</option>
            <option value="recency">Sort: Most Recent</option>
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && applicants.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Applicants', value: applicants.length, color: 'text-slate-900', bg: 'bg-white' },
            { label: 'Top Fit',          value: topFit,            color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Good Fit',         value: goodFit,           color: 'text-amber-600',   bg: 'bg-amber-50'   },
            { label: 'Shortlisted',      value: shortlisted,       color: 'text-primary',     bg: 'bg-primary/5'  },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border border-slate-100 rounded-2xl p-5 shadow-sm animate-in fade-in`} style={{ animationDelay: `${i * 60}ms` }}>
              <p className={`text-3xl font-black tracking-tighter ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Applicant list */}
      {!selectedJobId ? (
        <div className="py-32 text-center flex flex-col items-center gap-4 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
          <span className="material-symbols-outlined text-6xl text-slate-200">inbox</span>
          <p className="text-slate-400 font-bold text-sm">Select a job above to view its applicant pipeline.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <ApplicantSkeleton key={i} />)}
        </div>
      ) : applicants.length === 0 ? (
        <div className="py-32 text-center flex flex-col items-center gap-4 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
          <span className="material-symbols-outlined text-6xl text-slate-200">person_search</span>
          <div>
            <p className="text-slate-900 font-black text-lg">No applicants yet</p>
            <p className="text-slate-400 font-medium text-sm mt-1">Share the job link to attract candidates.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {applicants.map((candidate, i) => {
            const fit = FIT_CONFIG[candidate.fit_badge] || FIT_CONFIG['Low Fit'];
            const st  = STATUS_CONFIG[candidate.status] || STATUS_CONFIG['Applied'];
            return (
              <div
                key={candidate.application_id}
                className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center text-primary font-black text-lg shrink-0">
                      {candidate.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 tracking-tight truncate">{candidate.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{candidate.email}</p>
                    </div>
                  </div>
                  {/* Fit badge */}
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0 ${fit.bg} ${fit.text} ${fit.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${fit.dot}`}></span>
                    {candidate.fit_badge}
                  </span>
                </div>

                {/* Score bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>AI Match</span>
                    <span className={fit.text}>{candidate.match_score}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${candidate.match_score >= 75 ? 'bg-emerald-500' : candidate.match_score >= 50 ? 'bg-amber-400' : 'bg-slate-300'}`}
                      style={{ width: `${candidate.match_score}%` }}
                    />
                  </div>
                </div>

                {/* Skills */}
                {candidate.resume_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.resume_skills.slice(0, 4).map((s, si) => (
                      <span key={si} className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100">{s}</span>
                    ))}
                    {candidate.resume_skills.length > 4 && (
                      <span className="px-2 py-1 bg-slate-50 text-slate-400 text-[9px] font-bold rounded-lg border border-slate-100">+{candidate.resume_skills.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Status + actions */}
                <div className="pt-3 border-t border-slate-50 flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      disabled={updatingStatus === candidate.application_id}
                      value={candidate.status}
                      onChange={e => handleStatusChange(candidate.application_id, e.target.value)}
                      className={`w-full pl-3 pr-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border outline-none cursor-pointer appearance-none transition-all ${st.bg} ${st.text} ${st.border}`}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {updatingStatus === candidate.application_id
                      ? <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                      : <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none">expand_more</span>
                    }
                  </div>
                  <button
                    onClick={() => setPreviewCandidate(candidate)}
                    className="p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-100 hover:bg-primary hover:text-white hover:border-primary transition-all"
                    title="Preview Resume"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_search</span>
                  </button>
                  <Link
                    to={`/insights/${candidate.application_id}`}
                    className="p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-100 hover:bg-primary hover:text-white hover:border-primary transition-all"
                    title="View AI Insights"
                  >
                    <span className="material-symbols-outlined text-[18px]">insights</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
