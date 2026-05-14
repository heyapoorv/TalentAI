import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';

export default function CandidateDashboard() {
  const [applications, setApplications] = useState([]);
  const [profileHealth, setProfileHealth] = useState({ score: 0, status: '...', suggestions: '...' });
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [appsRes, healthRes, jobsRes] = await Promise.all([
          api.get('/applications/my'),
          api.get('/profile-health'),
          api.get('/jobs')
        ]);

        setApplications(appsRes.data);
        setProfileHealth(healthRes.data);

        // Simple recommendation: Top 2 jobs (in real app, we'd use a match endpoint)
        setRecommendedJobs((jobsRes.data.jobs || []).slice(0, 2));
      } catch (error) {
        console.error("Error fetching candidate dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const avgMatch = applications.length > 0
    ? Math.round(applications.reduce((acc, curr) => acc + (curr.match_score || 0), 0) / applications.length)
    : 0;

  const stats = [
    { label: 'Active Applications', value: applications.length, icon: 'send', color: 'indigo' },
    { label: 'Profile Health', value: `${profileHealth.score}%`, icon: 'bolt', color: 'amber' },
    { label: 'Avg Match Score', value: `${avgMatch}%`, icon: 'insights', color: 'blue' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Personalized Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 p-20 opacity-10 group-hover:scale-110 transition-transform duration-1000">
          <span className="material-symbols-outlined text-[240px]">rocket_launch</span>
        </div>
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-black uppercase tracking-widest text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Live Dashboard
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Career Hub.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed">
            Track your applications, manage your resume, and discover new opportunities matched specifically to your skills.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link to="/jobs" className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-container transition-all active:scale-95 shadow-xl shadow-primary/30">
              Explore Jobs
            </Link>
            <Link to="/upload-resume" className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95">
              Optimize Resume
            </Link>
          </div>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <Skeleton className="w-14 h-14 rounded-2xl mb-6" />
              <Skeleton className="h-10 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))
        ) : (
          stats.map((stat, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
              <div className={`w-14 h-14 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                <span className="material-symbols-outlined text-3xl font-bold">{stat.icon}</span>
              </div>
              <div>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">{stat.label}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Activity and Status Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Application Timeline */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Applications</h2>
            <Link to="/applications" className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
              History <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden p-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl">
                    <div className="flex items-center gap-6">
                      <Skeleton className="w-14 h-14 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="w-10 h-10 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">work_outline</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">No active applications</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">Start your journey by exploring personalized job matches that fit your profile.</p>
                </div>
                <Link to="/jobs" className="text-primary font-black text-xs uppercase tracking-widest bg-primary/5 px-6 py-3 rounded-xl hover:bg-primary/10 transition-colors">Find Matches Now</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.slice(0, 5).map((app, i) => (
                  <div key={app._id || app.id} className="group flex items-center justify-between p-6 bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black shadow-sm group-hover:scale-110 transition-transform">
                        {Math.round(app.match_score)}%
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Application for {app.job_role || 'Position'}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Status: <span className={`${app.status === 'Shortlisted' ? 'text-emerald-500' : 'text-primary'} font-bold`}>{app.status}</span> • Applied {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link to={`/insights/${app._id || app.id}`} className="p-3 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                      <span className="material-symbols-outlined">insights</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Profile Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-primary to-indigo-600 p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <h3 className="text-xl font-black tracking-tight mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-300">auto_awesome</span>
              AI Profile Health
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/60">
                  <span>Vector Density</span>
                  <span>{profileHealth.score}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${profileHealth.score}%` }}></div>
                </div>
              </div>
              <p className="text-xs text-indigo-100 font-medium leading-relaxed italic">
                "{profileHealth.suggestions}"
              </p>
              <Link to="/upload-resume" className="flex items-center justify-center gap-2 w-full bg-white text-primary py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95">
                Optimize Now
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Top Matches</h3>
            <div className="space-y-8">
              {recommendedJobs.length > 0 ? (
                recommendedJobs.map((job, i) => (
                  <div key={i} className="flex items-center justify-between group cursor-pointer animate-in fade-in" style={{ animationDelay: `${i * 200}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-xl">work</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{job.role}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">High Relevance</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Finding jobs for you...</p>
              )}
              <Link to="/jobs" className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary hover:bg-slate-50/50 transition-all">
                Browse Discovery Feed
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
