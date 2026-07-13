import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const EXP_LEVELS = ['entry', 'mid', 'senior', 'lead'];
const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'best_match', label: 'Best Match' },
];

const SALARY_PRESETS = [
  { label: 'Any', min: null, max: null },
  { label: '< $50k', min: null, max: 50000 },
  { label: '$50k – $100k', min: 50000, max: 100000 },
  { label: '$100k – $150k', min: 100000, max: 150000 },
  { label: '> $150k', min: 150000, max: null },
];

const FitBadge = ({ score }) => {
  if (score >= 75) return (
    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
      Top Fit
    </span>
  );
  if (score >= 50) return (
    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">
      Good Fit
    </span>
  );
  return null;
};

const JobCardSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col gap-5">
    <div className="flex justify-between items-start">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <Skeleton className="h-5 w-20 rounded-lg" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16 rounded-lg" />
      <Skeleton className="h-6 w-20 rounded-lg" />
    </div>
    <div className="pt-4 border-t border-slate-50">
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  </div>
);

export default function FindJobs() {
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ locations: [], job_types: [], experience_levels: [] });
  const [pagination, setPagination] = useState({ total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [applying, setApplying] = useState(null);

  const [filters, setFilters] = useState({
    q: '',
    job_type: '',
    experience_level: '',
    location: '',
    salary_min: null,
    salary_max: null,
    sort_by: 'latest',
    page: 1,
  });
  const [salaryPreset, setSalaryPreset] = useState(0);

  const debounceTimer = useRef(null);

  const fetchJobs = useCallback(async (currentFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.q) params.set('q', currentFilters.q);
      if (currentFilters.job_type) params.set('job_type', currentFilters.job_type);
      if (currentFilters.experience_level) params.set('experience_level', currentFilters.experience_level);
      if (currentFilters.location) params.set('location', currentFilters.location);
      if (currentFilters.salary_min != null) params.set('salary_min', currentFilters.salary_min);
      if (currentFilters.salary_max != null) params.set('salary_max', currentFilters.salary_max);
      params.set('sort_by', currentFilters.sort_by);
      params.set('page', currentFilters.page);
      params.set('page_size', 9);

      const res = await api.get(`/jobs?${params.toString()}`);
      setJobs(res.data.jobs || []);
      setPagination({
        total: res.data.total,
        page: res.data.page,
        total_pages: res.data.total_pages,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchJobs(filters), 400);
    return () => clearTimeout(debounceTimer.current);
  }, [filters, fetchJobs]);

  useEffect(() => {
    api.get('/jobs/meta').then(r => setMeta(r.data)).catch(() => {});
    api.get('/applications/my').then(r => setAppliedJobIds(r.data.map(a => a.job_id))).catch(() => {});
  }, []);

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value, page: 1 }));

  const handleSalaryPreset = (idx) => {
    setSalaryPreset(idx);
    const p = SALARY_PRESETS[idx];
    setFilters(prev => ({ ...prev, salary_min: p.min, salary_max: p.max, page: 1 }));
  };

  const clearFilters = () => {
    setSalaryPreset(0);
    setFilters({ q: '', job_type: '', experience_level: '', location: '', salary_min: null, salary_max: null, sort_by: 'latest', page: 1 });
  };

  const handleApply = async (jobId) => {
    setApplying(jobId);
    try {
      await api.post('/applications', { job_id: jobId });
      setAppliedJobIds(prev => [...prev, jobId]);
      setToast({ type: 'success', text: 'Application submitted!' });
    } catch (error) {
      setToast({ type: 'error', text: error.response?.data?.detail || 'Application failed.' });
    } finally {
      setApplying(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-16 animate-in fade-in duration-500">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 right-6 px-5 py-3.5 rounded-xl shadow-xl z-[100] font-semibold text-sm animate-in slide-in-from-right-10 duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
            {toast.text}
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="bg-white px-8 py-10 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group mb-6">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000 pointer-events-none">
          <span className="material-symbols-outlined text-[160px]">explore</span>
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 text-primary rounded-full text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            {pagination.total} Active Positions
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Find your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">next role.</span>
          </h1>
          <p className="text-slate-500 text-base font-medium leading-relaxed">AI-powered semantic matching across open opportunities.</p>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Main Search */}
          <div className="flex-1 relative group">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
            <input
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none font-medium text-slate-700 placeholder:text-slate-400 text-sm transition-all"
              placeholder="Search by role, company, or skill…"
              value={filters.q}
              onChange={e => setFilter('q', e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="relative w-full lg:w-44">
            <select
              className="w-full pl-3.5 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 appearance-none cursor-pointer text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              value={filters.location}
              onChange={e => setFilter('location', e.target.value)}
            >
              <option value="">Any Location</option>
              {meta.locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">location_on</span>
          </div>

          <button
            onClick={clearFilters}
            className="w-full lg:w-auto px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-red-50 hover:text-red-600 transition-all"
          >
            Clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1 border-t border-slate-50">
          {/* Job Type */}
          <select
            className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-600 appearance-none cursor-pointer text-sm hover:border-slate-300 focus:border-primary/40 focus:ring-1 focus:ring-primary/10"
            value={filters.job_type}
            onChange={e => setFilter('job_type', e.target.value)}
          >
            <option value="">Job Type</option>
            {JOB_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>

          {/* Experience */}
          <select
            className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-600 appearance-none cursor-pointer text-sm hover:border-slate-300 focus:border-primary/40"
            value={filters.experience_level}
            onChange={e => setFilter('experience_level', e.target.value)}
          >
            <option value="">Experience</option>
            {EXP_LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}-level</option>)}
          </select>

          {/* Salary */}
          <select
            className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-600 appearance-none cursor-pointer text-sm hover:border-slate-300 focus:border-primary/40"
            value={salaryPreset}
            onChange={e => handleSalaryPreset(parseInt(e.target.value))}
          >
            <option value="0">Salary Range</option>
            {SALARY_PRESETS.slice(1).map((p, idx) => <option key={idx + 1} value={idx + 1}>{p.label}</option>)}
          </select>

          <div className="ml-auto">
            <select
              className="pl-3 pr-8 py-2 bg-slate-900 text-white border-none rounded-lg outline-none font-semibold appearance-none cursor-pointer text-sm"
              value={filters.sort_by}
              onChange={e => setFilter('sort_by', e.target.value)}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center gap-5 bg-white rounded-2xl border border-slate-100">
            <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
            <div className="space-y-1.5">
              <p className="text-slate-800 font-bold text-lg">No roles match your filters.</p>
              <p className="text-slate-400 text-sm">Try broadening your criteria or clearing filters.</p>
            </div>
            <button onClick={clearFilters} className="text-primary font-semibold text-sm bg-primary/5 px-5 py-2.5 rounded-xl hover:bg-primary/10 transition-colors">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {jobs.map((job, i) => {
                const jobId = job._id || job.id;
                const hasApplied = appliedJobIds.includes(jobId);
                const score = job.top_match_score || 0;
                return (
                  <div
                    key={jobId}
                    className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-11 h-11 bg-white rounded-xl p-1.5 flex items-center justify-center border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                        <img
                          alt={job.company}
                          className="w-full h-full object-contain"
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || job.role)}&background=random&bold=true`}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <FitBadge score={score} />
                        {job.job_type && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium capitalize">
                            {job.job_type}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                        {job.role}
                      </h3>
                      <p className="text-slate-500 text-sm font-medium">
                        {job.company || 'Global Tech'}
                        {job.location && <> · <span className="text-primary font-medium">{job.location}</span></>}
                      </p>
                      {job.experience_level && (
                        <span className="inline-block mt-1 text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md capitalize">
                          {job.experience_level}-level
                        </span>
                      )}
                    </div>

                    {(Array.isArray(job.skills) && job.skills.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 4).map((skill, si) => (
                          <span key={si} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-100">
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {(job.salary_min || job.salary_max) && (
                      <p className="text-sm font-bold text-emerald-600">
                        {job.salary_currency} {job.salary_min ? job.salary_min.toLocaleString() : '?'} – {job.salary_max ? job.salary_max.toLocaleString() : '?'}
                        <span className="text-slate-400 font-normal text-xs ml-1">/yr</span>
                      </p>
                    )}

                    <div className="pt-3 border-t border-slate-50 mt-auto">
                      <button
                        id={`apply-btn-${jobId}`}
                        onClick={() => !hasApplied && !applying && handleApply(jobId)}
                        disabled={hasApplied || applying === jobId}
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                          hasApplied
                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-primary active:scale-95 shadow-sm'
                        }`}
                      >
                        {applying === jobId ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Applying…
                          </span>
                        ) : hasApplied ? '✓ Applied' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-sm text-slate-600 hover:border-primary hover:text-primary disabled:opacity-40 transition-all"
                >
                  ← Prev
                </button>
                <span className="text-sm font-medium text-slate-500">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-sm text-slate-600 hover:border-primary hover:text-primary disabled:opacity-40 transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
