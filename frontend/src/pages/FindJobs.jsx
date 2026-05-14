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
  if (score >= 75) return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Top Fit</span>;
  if (score >= 50) return <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Good Fit</span>;
  return null;
};

const JobCardSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex flex-col gap-6">
    <div className="flex justify-between items-start">
      <Skeleton className="w-14 h-14 rounded-2xl" />
      <Skeleton className="h-5 w-24 rounded-lg" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16 rounded-lg" />
      <Skeleton className="h-6 w-20 rounded-lg" />
      <Skeleton className="h-6 w-14 rounded-lg" />
    </div>
    <div className="pt-6 border-t border-slate-50 flex gap-3">
      <Skeleton className="h-12 flex-1 rounded-2xl" />
      <Skeleton className="h-12 w-12 rounded-2xl" />
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
  const [filterOpen, setFilterOpen] = useState(true);
  const [applying, setApplying] = useState(null);

  // Filter state
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
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce: text search fires after 400ms, other filters fire immediately
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchJobs(filters), 400);
    return () => clearTimeout(debounceTimer.current);
  }, [filters, fetchJobs]);

  // Fetch meta options and applied jobs once
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

  const activeFilterCount = [filters.job_type, filters.experience_level, filters.location, salaryPreset > 0].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] font-black text-sm animate-in slide-in-from-right-10 duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
            {toast.text}
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="bg-white p-10 md:p-16 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group mb-8">
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
          <span className="material-symbols-outlined text-[200px]">explore</span>
        </div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            {pagination.total} Active Requisitions
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
            Find your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">next role.</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">AI-powered semantic search across thousands of opportunities.</p>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-4 shadow-sm mb-10 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Main Search */}
          <div className="flex-1 w-full relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            <input
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none font-bold text-slate-700 placeholder:text-slate-400 transition-all"
              placeholder="Search by role, company, or skill…"
              value={filters.q}
              onChange={e => setFilter('q', e.target.value)}
            />
          </div>

          {/* Location Filter */}
          <div className="w-full lg:w-48 relative">
            <select
              className="w-full pl-4 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold text-slate-700 appearance-none cursor-pointer text-sm focus:border-primary/30"
              value={filters.location}
              onChange={e => setFilter('location', e.target.value)}
            >
              <option value="">Any Location</option>
              {meta.locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">location_on</span>
          </div>

          <button
            onClick={clearFilters}
            className="w-full lg:w-auto px-6 py-4 bg-rose-50 text-rose-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all"
          >
            Clear
          </button>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-50">
          {/* Job Type Dropdown */}
          <div className="relative">
            <select
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-600 appearance-none cursor-pointer text-xs"
              value={filters.job_type}
              onChange={e => setFilter('job_type', e.target.value)}
            >
              <option value="">All Job Types</option>
              {JOB_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px]">expand_more</span>
          </div>

          {/* Experience Dropdown */}
          <div className="relative">
            <select
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-600 appearance-none cursor-pointer text-xs"
              value={filters.experience_level}
              onChange={e => setFilter('experience_level', e.target.value)}
            >
              <option value="">All Experience Levels</option>
              {EXP_LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}-level</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px]">expand_more</span>
          </div>

          {/* Salary Preset Dropdown */}
          <div className="relative">
            <select
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-600 appearance-none cursor-pointer text-xs"
              value={salaryPreset}
              onChange={e => handleSalaryPreset(parseInt(e.target.value))}
            >
              <option value="0">Any Salary</option>
              {SALARY_PRESETS.slice(1).map((p, idx) => <option key={idx+1} value={idx+1}>{p.label}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px]">payments</span>
          </div>

          <div className="ml-auto relative">
            <select
              className="pl-4 pr-10 py-2.5 bg-slate-900 text-white border-none rounded-xl outline-none font-bold appearance-none cursor-pointer text-[10px] uppercase tracking-widest"
              value={filters.sort_by}
              onChange={e => setFilter('sort_by', e.target.value)}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none text-[16px]">sort</span>
          </div>
        </div>
      </div>

      <div className="w-full">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-32 text-center flex flex-col items-center gap-6 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
              <span className="material-symbols-outlined text-6xl text-slate-200">search_off</span>
              <div className="space-y-2">
                <p className="text-slate-900 font-black text-xl">No roles match your filters.</p>
                <p className="text-slate-400 text-sm font-medium">Try broadening your criteria or clearing filters.</p>
              </div>
              <button onClick={clearFilters} className="text-primary font-black text-xs uppercase tracking-widest bg-primary/5 px-6 py-3 rounded-xl hover:bg-primary/10 transition-colors">Clear Filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {jobs.map((job, i) => {
                  const jobId = job._id || job.id;
                  const hasApplied = appliedJobIds.includes(jobId);
                  const score = job.top_match_score || 0;
                  return (
                    <div key={jobId} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="flex justify-between items-start">
                        <div className="w-14 h-14 bg-white rounded-2xl p-2 flex items-center justify-center border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-500 overflow-hidden">
                          <img alt="Company" className="w-full h-full object-contain" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || job.role)}&background=random&bold=true`} />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <FitBadge score={score} />
                          {job.job_type && <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest capitalize">{job.job_type}</span>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight tracking-tight">{job.role}</h3>
                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">
                          {job.company || 'Global Tech'}
                          {job.location && <> · <span className="text-primary">{job.location}</span></>}
                        </p>
                        {job.experience_level && (
                          <span className="inline-block mt-1 text-[10px] text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-md capitalize">{job.experience_level}-level</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(job.skills) ? job.skills : []).slice(0, 3).map((skill, si) => (
                          <span key={si} className="px-3 py-1.5 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100">{skill.trim()}</span>
                        ))}
                      </div>

                      {(job.salary_min || job.salary_max) && (
                        <p className="text-sm font-black text-emerald-600 -mt-2">
                          {job.salary_currency} {job.salary_min ? job.salary_min.toLocaleString() : '?'} – {job.salary_max ? job.salary_max.toLocaleString() : '?'}
                          <span className="text-slate-400 font-medium text-xs ml-1">/yr</span>
                        </p>
                      )}

                      <div className="pt-4 border-t border-slate-50 mt-auto flex gap-3">
                        <button
                          onClick={() => !hasApplied && !applying && handleApply(jobId)}
                          disabled={hasApplied || applying === jobId}
                          className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${hasApplied ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-primary active:scale-95 shadow-lg shadow-slate-900/10'}`}
                        >
                          {applying === jobId ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Applying…</span> : hasApplied ? '✓ Applied' : 'Apply Now'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button disabled={pagination.page <= 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))} className="px-5 py-3 bg-white border border-slate-100 rounded-xl font-black text-xs text-slate-600 uppercase tracking-widest hover:border-primary hover:text-primary disabled:opacity-40 transition-all">← Prev</button>
                  <span className="text-sm font-black text-slate-500">Page {pagination.page} of {pagination.total_pages}</span>
                  <button disabled={pagination.page >= pagination.total_pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))} className="px-5 py-3 bg-white border border-slate-100 rounded-xl font-black text-xs text-slate-600 uppercase tracking-widest hover:border-primary hover:text-primary disabled:opacity-40 transition-all">Next →</button>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}
