import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function CandidateAiInsight() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);

  const isRecruiter = user?.role === 'recruiter';

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const response = await api.get(`/applications/${id}/insights`);
        setInsight(response.data);
      } catch (error) {
        console.error("Error fetching insights:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInsight();
  }, [id]);

  const handleDownloadReport = () => {
    window.print();
  };

  const handleReanalyze = async () => {
    setLoading(true);
    try {
      // We'll call the same endpoint but maybe add a query param or just rely on the fact that we clear cache if we want
      // For now, let's just re-fetch and assume the backend fix handles the 0.0 case better now
      const response = await api.get(`/applications/${id}/insights?recalculate=true`);
      setInsight(response.data);
    } catch (error) {
      console.error("Error re-analyzing:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6 animate-in fade-in duration-1000">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse text-2xl">psychology</span>
        </div>
        <div className="text-center space-y-2">
          <p className="text-slate-900 font-black text-sm uppercase tracking-[0.2em]">Match Intelligence</p>
          <p className="text-slate-400 font-medium text-xs">Synchronizing profile nodes with role requirements...</p>
        </div>
      </div>
    );
  }

  if (!insight || (insight.match_score === 0 && !insight.strengths?.length)) {
    return (
      <div className="max-w-4xl mx-auto p-12 md:p-20 text-center bg-white rounded-[3rem] border border-slate-100 m-8 shadow-2xl shadow-slate-200/50 flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-5xl">analytics</span>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Not Ready</h2>
          <p className="text-slate-500 font-medium max-w-sm mx-auto">The AI is still processing your profile or encountered an issue during extraction.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleReanalyze} className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            Run AI Analysis
          </button>
          <Link to={isRecruiter ? "/recruiter-dashboard" : "/dashboard"} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Go Back</Link>
        </div>
      </div>
    );
  }

  // Perspective helper
  const transformPerspective = (text) => {
    if (!isRecruiter) return text;
    return text
      .replace(/\bYour\b/g, 'Candidate\'s')
      .replace(/\byour\b/g, 'candidate\'s')
      .replace(/\bYou\b/g, 'Candidate')
      .replace(/\byou\b/g, 'candidate');
  };

  return (
    <div className="flex-1 p-6 md:p-10 min-h-screen w-full print:p-0 bg-slate-50/30">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
          body { background: white !important; }
        }
      `}</style>
      
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-12 no-print">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="animate-in slide-in-from-left-10 duration-700">
            <nav className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">
              <Link className="hover:text-primary transition-colors" to={isRecruiter ? "/recruiter-dashboard" : "/dashboard"}>Dashboard</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary/60">Match Intelligence</span>
            </nav>
            <div className="flex items-center gap-4">
               <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{insight.job_role || "Position Analysis"}</h1>
               <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>
               <p className="text-lg text-slate-500 font-bold hidden md:block">{insight.status}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 animate-in slide-in-from-right-10 duration-700">
            <button 
              onClick={handleDownloadReport}
              className="px-6 py-4 bg-white border border-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 hover:shadow-xl hover:shadow-slate-200/50 transition-all flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">cloud_download</span>
              Export Report
            </button>
            <div className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 transition-all cursor-default ${
              insight.status === 'Shortlisted' ? 'bg-emerald-500 text-white shadow-emerald-200' :
              insight.status === 'Rejected' ? 'bg-rose-500 text-white shadow-rose-200' :
              'bg-primary text-white shadow-indigo-200'
            }`}>
              <span className="material-symbols-outlined text-[20px]">
                {insight.status === 'Shortlisted' ? 'stars' : 
                 insight.status === 'Rejected' ? 'dangerous' : 'token'}
              </span>
              {isRecruiter ? `Candidate: ${insight.status}` : `Status: ${insight.status}`}
            </div>
          </div>

        </div>
      </div>
      
      {/* Bento Grid Layout */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 print-full">
        {/* Match Score Card */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-10 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group animate-in zoom-in duration-700">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-600"></div>
          <div className="relative w-56 h-56 flex items-center justify-center mb-8">
            <svg className="w-full h-full -rotate-90 transform group-hover:scale-110 transition-transform duration-1000">
              <circle cx="50" cy="50" fill="transparent" r="44" stroke="#F8FAFC" strokeWidth="8"></circle>
              <circle 
                cx="50" cy="50" fill="transparent" r="44" stroke="url(#gradient)" strokeWidth="8"
                strokeDasharray="276.46" 
                strokeDashoffset={276.46 - (276.46 * (insight.match_score || 0)) / 100} 
                strokeLinecap="round" 
                className="transition-all duration-1000 ease-out"
              ></circle>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-black text-slate-900 tracking-tighter">{Math.round(insight.match_score)}%</span>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Global Match</span>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 px-5 py-2 ${insight.match_score > 70 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'} rounded-full font-black text-[10px] uppercase tracking-widest mb-6`}>
            <span className="material-symbols-outlined text-[18px]">{insight.match_score > 70 ? 'auto_awesome' : 'bolt'}</span>
            {insight.match_score > 70 ? 'Highly Qualified' : 'Candidate Potential'}
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[280px]">
            {isRecruiter 
              ? "This score represents the semantic overlap between candidate experience and role prerequisites." 
              : "Your background shows significant alignment with the technical requirements for this role."}
          </p>
        </div>
        
        {/* Strengths Section */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm animate-in fade-in slide-in-from-right-10 duration-700">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Key Strengths</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Why you stand out</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(insight.strengths && insight.strengths.length > 0 ? insight.strengths : ["Technical Proficiency", "Problem Solving", "Experience Depth"]).map((strength, i) => (
              <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:border-primary/20 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 group">
                <div className="flex items-start gap-4">
                  <div className="mt-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0 group-hover:scale-150 transition-transform shadow-lg shadow-emerald-200"></div>
                  <div>
                    <h4 className="font-black text-slate-900 mb-2 tracking-tight text-base">{strength}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">Profile data validates strong competency in this domain relative to standard benchmarks.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Missing Skills Card */}
        <div className="lg:col-span-6 bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm animate-in slide-in-from-bottom-10 duration-700 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
             <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-2xl">error_med</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Gaps & Risk Areas</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Areas for improvement</p>
              </div>
          </div>
          <div className="flex flex-wrap gap-3 mb-10">
            {insight.missing_skills?.length > 0 ? insight.missing_skills.map((skill, i) => (
              <span key={i} className="px-5 py-2.5 bg-rose-50/50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border border-rose-100">
                <span className="material-symbols-outlined text-[18px]">block</span>
                {skill}
              </span>
            )) : (
              <div className="flex items-center gap-3 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 w-full">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <span className="text-sm font-bold text-emerald-700">All core technical requirements are met.</span>
              </div>
            )}
          </div>
          <div className="mt-auto p-6 bg-indigo-50 border border-indigo-100 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-transform duration-700">
              <span className="material-symbols-outlined text-[80px] text-primary">lightbulb_circle</span>
            </div>
            <div className="flex gap-4 relative z-10">
              <span className="material-symbols-outlined text-primary font-black">tips_and_updates</span>
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">AI Recommendation</p>
                <p className="text-xs text-slate-700 font-bold leading-relaxed italic">
                  "{insight.suggestions?.[0] || "Consider highlighting related projects to bridge identified skill gaps."}"
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Roadmap */}
        <div className="lg:col-span-6 bg-slate-900 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group animate-in slide-in-from-bottom-10 duration-700 hover:scale-[1.01] transition-all">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-all duration-1000"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Optimization Roadmap</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Smart Profile Enhancements</p>
              </div>
              <div className="w-14 h-14 bg-white/10 text-primary rounded-2xl flex items-center justify-center border border-white/5 backdrop-blur-xl">
                <span className="material-symbols-outlined text-2xl animate-pulse">auto_fix_high</span>
              </div>
            </div>
            <ul className="space-y-6">
              {(insight.suggestions && insight.suggestions.length > 2 ? insight.suggestions.slice(1) : ["Quantify your impact using metrics", "Add relevant certifications to your education", "Highlight specialized domain tools"]).map((suggestion, i) => (
                <li key={i} className="flex items-start gap-4 group/item">
                  <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-primary/40 transition-colors">
                    <span className="material-symbols-outlined text-primary text-[16px]">done_all</span>
                  </div>
                  <span className="text-sm text-slate-300 font-medium leading-relaxed group-hover/item:text-white transition-colors">{transformPerspective(suggestion)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Match Breakdown Section */}
        <div className="lg:col-span-12 bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-10 duration-700">
          <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Semantic Breakdown</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Granular Category Scoring</p>
            </div>
            <div className="flex gap-8 text-[11px] font-black uppercase tracking-[0.15em]">
              <div className="flex items-center gap-2.5 text-slate-600"><div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/20"></div> Alignment</div>
              <div className="flex items-center gap-2.5 text-slate-300"><div className="w-3 h-3 rounded-full bg-slate-100"></div> Gap</div>
            </div>
          </div>
          <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              { label: 'Technical Core', value: insight.match_breakdown?.skills || 0, icon: 'database', color: 'bg-primary' },
              { label: 'Domain Context', value: insight.match_breakdown?.experience || 0, icon: 'history_edu', color: 'bg-indigo-500' },
              { label: 'Academic Fit', value: insight.match_breakdown?.education || 0, icon: 'school', color: 'bg-slate-900' }
            ].map((stat, i) => (
              <div key={i} className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">{stat.icon}</span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                  </div>
                  <span className="font-black text-xl text-slate-900">{stat.value}%</span>
                </div>
                <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                  <div 
                    className={`h-full ${stat.color} rounded-full transition-all duration-[1.5s] ease-out shadow-sm`} 
                    style={{ width: `${stat.value}%`, transitionDelay: `${i * 300}ms` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preparation Card */}
        <div className="lg:col-span-12 bg-indigo-50 border border-indigo-100 p-10 rounded-[3rem] shadow-sm animate-in slide-in-from-bottom-10 duration-700 relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
           <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-200">
                <span className="material-symbols-outlined text-2xl">chat_bubble</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Interview Readiness</h3>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Questions & Topics to Master</p>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(insight.interview_tips && insight.interview_tips.length > 0 ? insight.interview_tips : ["System scalability strategies", "Complex state management patterns", "Team collaboration & Mentorship"]).map((tip, i) => (
                <div key={i} className="p-8 bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                   <span className="material-symbols-outlined text-primary mb-4 block">question_answer</span>
                   <p className="text-sm text-slate-700 font-bold leading-relaxed italic">"{transformPerspective(tip)}"</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}


