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
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="bg-white px-8 py-10 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group mb-6">
        <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
          <span className="material-symbols-outlined text-[180px]">send</span>
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
            <Link className="hover:text-primary transition-colors" to="/dashboard">Dashboard</Link>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary">Application Pipeline</span>
          </nav>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">My Applications</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Track your professional journey and monitor the status of your AI-matched applications in real-time.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
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
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide">Position Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide text-center">Match Score</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide text-right">Applied</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide text-right">Insights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {applications.map((app, i) => (
                  <tr key={app._id || app.id} className="hover:bg-slate-50/50 transition-all group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-white rounded-xl border border-slate-100 p-1 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm overflow-hidden">
                          <img src={`https://ui-avatars.com/api/?name=${app.job_role || app.job_id}&background=random&bold=true`} alt="Job" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-base leading-tight">{app.job_role || 'Professional Role'}</h3>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">Applied via TalentAI</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center justify-center w-11 h-11 rounded-xl font-bold text-base ${(app.match_score || 0) >= 70 ? 'bg-emerald-50 text-emerald-700' : (app.match_score || 0) >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
                        {Math.round(app.match_score)}%
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${app.status === 'Shortlisted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          app.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'Shortlisted' ? 'bg-emerald-500 animate-pulse' :
                            app.status === 'Rejected' ? 'bg-red-500' :
                              'bg-indigo-500 animate-pulse'
                          }`}></span>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right text-sm font-medium text-slate-500">
                      {new Date(app.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link to={`/insights/${app._id || app.id}`} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-100 hover:bg-primary hover:text-white hover:border-primary transition-all inline-flex items-center justify-center" title="View AI Insights">
                        <span className="material-symbols-outlined text-[18px]">insights</span>
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

