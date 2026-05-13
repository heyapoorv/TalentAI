import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function JobsList() {
  const { user } = useContext(AuthContext);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/jobs');
      const myJobs = response.data.filter(job => 
        job.recruiter_id === user?.id || job.recruiter_id === user?._id
      );
      setJobs(myJobs);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Failed to load jobs. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await api.put(`/jobs/${id}/status`);
      setJobs(jobs.map(j => (j._id || j.id) === id ? { ...j, status: res.data.status } : j));
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleRemoveJob = async (id) => {
    if (window.confirm("Archiving this job will remove it from discovery. Continue?")) {
      try {
        await api.delete(`/jobs/${id}`);
        setJobs(jobs.filter(job => (job._id || job.id) !== id));
      } catch (error) {
        console.error("Error deleting job:", error);
        alert("Failed to delete job.");
      }
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || job.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 w-full animate-in fade-in duration-700 pb-20">
      {/* Header & Advanced Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none">
            <span className="material-symbols-outlined text-[180px]">work_history</span>
         </div>
         <div className="relative z-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Recruitment Pipeline</h1>
            <p className="text-slate-500 font-medium mt-2">Manage your active requisitions and real-time candidate flow.</p>
            <div className="flex flex-wrap gap-4 mt-8">
               <div className="flex items-center gap-6 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Roles</span>
                    <span className="text-xl font-black text-slate-900">{jobs.filter(j => j.status === 'Active').length}</span>
                  </div>
                  <div className="w-[1px] h-8 bg-slate-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Applicants</span>
                    <span className="text-xl font-black text-slate-900">{jobs.reduce((acc, j) => acc + (j.applicant_count || 0), 0)}</span>
                  </div>
               </div>
            </div>
         </div>
         
         <div className="flex flex-col md:flex-row items-center gap-4 relative z-10 w-full xl:w-auto">
            <div className="relative group flex-1 md:flex-none">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-primary transition-colors">search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by role..."
                className="pl-12 pr-6 py-4 bg-slate-50 border border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold text-slate-700 w-full md:w-64"
              />
            </div>
            <Link to="/jobs/new" className="w-full md:w-auto bg-slate-900 hover:bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 transition-all active:scale-95">
              <span className="material-symbols-outlined">add</span>
              Post Role
            </Link>
         </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] ml-2">Syncing Pipeline</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center gap-6">
             <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
               <span className="material-symbols-outlined text-5xl">folder_off</span>
             </div>
             <div className="space-y-2">
               <p className="text-slate-900 font-black text-xl">No requisitions found.</p>
               <p className="text-slate-400 text-sm font-medium">Try clearing filters or post a new opportunity.</p>
             </div>
             <button onClick={() => {setSearchQuery(""); setFilterStatus("all")}} className="text-primary font-black text-xs uppercase tracking-widest hover:underline">Reset Filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-50">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Position & Company</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Applicants</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Top Match</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredJobs.map((job, i) => (
                  <tr key={job._id || job.id} className="hover:bg-slate-50/50 transition-all group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:border-primary/20 group-hover:shadow-lg transition-all duration-500">
                          <span className="material-symbols-outlined text-2xl">work</span>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 group-hover:text-primary transition-colors text-lg tracking-tight leading-none">{job.role}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{job.company || "Global Tech"}</p>
                          <div className="flex items-center gap-2 mt-3">
                             {job.skills?.slice(0, 3).map((s, idx) => (
                               <span key={idx} className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">{s}</span>
                             ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-xl font-black text-slate-900">{job.applicant_count || 0}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidates</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                       <div className="relative inline-flex items-center justify-center">
                         <span className={`text-lg font-black ${job.applicant_count > 0 ? 'text-primary' : 'text-slate-300'}`}>
                           {job.applicant_count > 0 ? `${Math.round(job.top_match_score || 0)}%` : '--%'}
                         </span>
                         {job.top_match_score >= 90 && (
                            <span className="absolute -top-1 -right-4 material-symbols-outlined text-amber-400 text-sm animate-bounce">star</span>
                         )}
                       </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                       <button 
                        onClick={() => handleToggleStatus(job._id || job.id)}
                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] transition-all border ${
                          job.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                        }`}
                       >
                         {job.status || "Active"}
                       </button>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/applicants?jobId=${job._id || job.id}`} className="p-4 bg-white text-slate-400 hover:text-primary border border-slate-100 rounded-2xl transition-all shadow-sm hover:shadow-md group/btn" title="Review Candidates">
                          <span className="material-symbols-outlined text-xl group-hover/btn:scale-110 transition-transform">group</span>
                        </Link>
                        <button onClick={() => handleRemoveJob(job._id || job.id)} className="p-4 bg-white text-slate-400 hover:text-rose-500 border border-slate-100 rounded-2xl transition-all shadow-sm hover:shadow-md group/btn" title="Archive Role">
                          <span className="material-symbols-outlined text-xl group-hover/btn:scale-110 transition-transform">archive</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
