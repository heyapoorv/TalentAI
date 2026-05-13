import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function FindJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          api.get('/jobs'),
          api.get('/applications/my').catch(() => ({ data: [] }))
        ]);
        setJobs(jobsRes.data);
        setFilteredJobs(jobsRes.data);
        setAppliedJobIds(appsRes.data.map(app => app.job_id));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApply = async (jobId) => {
    try {
      await api.post('/applications', { job_id: jobId });
      setAppliedJobIds([...appliedJobIds, jobId]);
      setToast({ type: 'success', text: 'Application sent successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error applying:", error);
      setToast({ type: 'error', text: error.response?.data?.detail || "Application failed." });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const applyFilters = () => {
    const query = searchQuery.toLowerCase();
    setFilteredJobs(jobs.filter(job =>
      job.role.toLowerCase().includes(query) ||
      (job.skills && job.skills.some(skill => skill.toLowerCase().includes(query))) ||
      job.description.toLowerCase().includes(query) ||
      (job.company && job.company.toLowerCase().includes(query))
    ));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 relative animate-in fade-in duration-700">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] font-black text-sm animate-in slide-in-from-right-10 duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
            {toast.text}
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white p-10 md:p-20 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
          <span className="material-symbols-outlined text-[200px]">explore</span>
        </div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            {jobs.length} Active Requisitions
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">
            Explore your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Future.</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl font-medium leading-relaxed">
            Leverage AI-driven semantic search to find roles that perfectly align with your professional background and career goals.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <section className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-6 space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Job Title or Keywords</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
              <input
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-50 rounded-2xl focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-700"
                placeholder="Search by role, company, or skills..."
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value === '') setFilteredJobs(jobs);
                }}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Work Arrangement</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">location_on</span>
              <select className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-50 rounded-2xl outline-none appearance-none cursor-pointer font-bold text-slate-700 focus:bg-white transition-all">
                <option>All Locations</option>
                <option>Remote (Global)</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="lg:col-span-2">
            <button onClick={applyFilters} className="w-full bg-slate-900 text-white py-4 px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-3">
              Filter
            </button>
          </div>
        </div>
      </section>

      {/* Intelligent Job Feed */}
      {loading ? (
        <div className="py-32 flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Scanning Opportunities...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredJobs.map((job, i) => {
            const jobId = job._id || job.id;
            const hasApplied = appliedJobIds.includes(jobId);
            return (
              <div key={jobId} className="bg-white border border-slate-100 rounded-[2.5rem] p-10 flex flex-col gap-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group animate-in fade-in slide-in-from-bottom-6" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 bg-white rounded-2xl p-3 flex items-center justify-center border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-500">
                    <img alt="Company" className="w-full h-full object-contain" src={`https://ui-avatars.com/api/?name=${job.company || job.role}&background=random&bold=true`} />
                  </div>
                  <div className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black tracking-widest uppercase">AI Recommended</div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight tracking-tight">{job.role}</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{job.company || "Global Tech Solutions"} • Remote</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(job.skills) ? job.skills : (typeof job.skills === 'string' ? job.skills.split(',') : [])).slice(0, 3).map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100">{skill.trim()}</span>
                  ))}
                </div>

                <div className="pt-8 border-t border-slate-50 mt-auto flex gap-4">
                  <button
                    onClick={() => !hasApplied && handleApply(jobId)}
                    disabled={hasApplied}
                    className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${hasApplied ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-primary active:scale-95 shadow-slate-900/10'}`}
                  >
                    {hasApplied ? "Applied" : "Apply Now"}
                  </button>
                  <button className="p-4 bg-white text-slate-400 rounded-2xl border border-slate-100 hover:text-primary hover:border-primary/20 hover:shadow-md transition-all">
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </div>
            );
          })}
          {filteredJobs.length === 0 && (
            <div className="col-span-full py-32 text-center flex flex-col items-center gap-6 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
              <span className="material-symbols-outlined text-6xl text-slate-200">search_off</span>
              <div className="space-y-2">
                <p className="text-slate-900 font-black text-xl">No roles match your search.</p>
                <p className="text-slate-400 text-sm font-medium">Try broadening your keywords or clearing filters.</p>
              </div>
              <button onClick={() => { setSearchQuery(""); setFilteredJobs(jobs) }} className="text-primary font-black text-xs uppercase tracking-widest hover:underline">Clear Search</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
