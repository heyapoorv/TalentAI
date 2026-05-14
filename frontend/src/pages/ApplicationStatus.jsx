import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';

export default function ApplicationStatus() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await api.get('/applications/my');
        setApplications(response.data);
      } catch (error) {
        console.error("Error fetching my applications:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-8 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
          <span className="material-symbols-outlined text-[180px]">send</span>
        </div>
        <div className="relative z-10 space-y-4">
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <Link className="hover:text-primary transition-colors" to="/dashboard">Dashboard</Link>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary">Application Pipeline</span>
          </nav>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">My Applications</h1>
          <p className="text-slate-500 font-medium max-w-lg">
            Track your professional journey and monitor the status of your AI-matched applications in real-time.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-6 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-6">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-50">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Position Info</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Match Score</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right">Submission Date</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {applications.map((app, i) => (
                  <tr key={app._id || app.id} className="hover:bg-slate-50/50 transition-all group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 p-1 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm overflow-hidden">
                          <img src={`https://ui-avatars.com/api/?name=${app.job_role || app.job_id}&background=random&bold=true`} alt="Job" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 group-hover:text-primary transition-colors text-lg tracking-tight leading-none">{app.job_role || "Professional Role"}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Ref ID: {app.job_id.substring(0, 8)}... AI Signature</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/5 text-primary font-black text-lg">
                        {Math.round(app.match_score)}%
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${
                        app.status === 'Shortlisted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/20' :
                        app.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/20' :
                        'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/20'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          app.status === 'Shortlisted' ? 'bg-emerald-500 animate-pulse' :
                          app.status === 'Rejected' ? 'bg-rose-500' :
                          'bg-indigo-500 animate-pulse'
                        }`}></span>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right font-bold text-slate-500 text-sm">
                      {new Date(app.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-10 py-8 text-right">
                      <Link to={`/insights/${app._id || app.id}`} className="p-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-100 hover:bg-primary hover:text-white hover:border-primary transition-all inline-flex items-center justify-center group/btn" title="View AI Insights">
                        <span className="material-symbols-outlined text-[20px] group-hover/btn:scale-110 transition-transform">insights</span>
                      </Link>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-5xl">inventory_2</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-slate-900 font-black text-xl tracking-tight">No application data detected.</p>
                          <p className="text-slate-400 text-sm font-medium">Your active applications will appear here once processed by the system.</p>
                        </div>
                        <Link to="/jobs" className="text-primary font-black text-xs uppercase tracking-widest bg-primary/5 px-8 py-4 rounded-2xl hover:bg-primary/10 transition-colors">Start Applying</Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

