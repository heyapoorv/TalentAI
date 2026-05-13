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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Assembling AI Intelligence...</p>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="p-20 text-center text-slate-500 font-bold bg-white rounded-[2.5rem] border border-outline m-8">
        <span className="material-symbols-outlined text-6xl mb-4 text-slate-200">error</span>
        <p>Failed to load insights. Please try again later.</p>
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
    <div className="flex-1 p-8 min-h-screen w-full print:p-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
          body { background: white !important; }
        }
      `}</style>
      
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-10 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="animate-in slide-in-from-left-10 duration-700">
            <nav className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">
              <Link className="hover:text-primary transition-colors" to={isRecruiter ? "/recruiter-dashboard" : "/dashboard"}>Dashboard</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary">Match Intelligence</span>
            </nav>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{insight.job_role || "Position Analysis"}</h1>
            <p className="text-body-lg text-slate-600 mt-1 font-medium">
              {isRecruiter ? `Evaluating Candidate match for the ${insight.job_role} role.` : `Your personalized roadmap for the ${insight.job_role} position.`}
            </p>
          </div>
          <div className="flex gap-4 animate-in slide-in-from-right-10 duration-700">
            <button 
              onClick={handleDownloadReport}
              className="px-6 py-3 bg-white border border-outline text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:shadow-md transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              Download Report
            </button>
            <div className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all cursor-default ${
              insight.status === 'Shortlisted' ? 'bg-emerald-500 text-white shadow-emerald-200' :
              insight.status === 'Rejected' ? 'bg-rose-500 text-white shadow-rose-200' :
              'bg-primary text-white shadow-indigo-200'
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {insight.status === 'Shortlisted' ? 'verified' : 
                 insight.status === 'Rejected' ? 'cancel' : 'check_circle'}
              </span>
              {isRecruiter ? `Candidate: ${insight.status}` : `Status: ${insight.status}`}
            </div>
          </div>

        </div>
      </div>
      
      {/* Bento Grid Layout */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 print-full">
        {/* Match Score Card */}
        <div className="lg:col-span-4 bg-white border border-outline p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group animate-in zoom-in duration-700">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
          <div className="relative w-48 h-48 flex items-center justify-center mb-8">
            <svg className="w-full h-full -rotate-90 transform group-hover:scale-105 transition-transform duration-1000">
              <circle cx="50" cy="50" fill="transparent" r="44" stroke="#F1F5F9" strokeWidth="6"></circle>
              <circle 
                cx="50" cy="50" fill="transparent" r="44" stroke="#4F46E5" strokeWidth="6"
                strokeDasharray="276.46" 
                strokeDashoffset={276.46 - (276.46 * (insight.match_score || 0)) / 100} 
                strokeLinecap="round" 
                className="transition-all duration-1000 ease-out"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-primary tracking-tighter">{Math.round(insight.match_score)}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Semantic Match</span>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 ${insight.match_score > 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} rounded-full font-black text-[10px] uppercase tracking-widest mb-6`}>
            <span className="material-symbols-outlined text-[16px]">{insight.match_score > 70 ? 'auto_awesome' : 'bolt'}</span>
            {insight.match_score > 70 ? 'Strong Alignment' : 'Moderate Alignment'}
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[260px]">
            {isRecruiter 
              ? "Candidate matches core requirements with high semantic density." 
              : "You rank in the top percentile of applicants based on your current technical stack."}
          </p>
        </div>
        
        {/* Strengths Section */}
        <div className="lg:col-span-8 bg-white border border-outline p-10 rounded-[2.5rem] shadow-sm animate-in fade-in slide-in-from-right-10 duration-700">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Match Justification</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(insight.strengths && insight.strengths.length > 0 ? insight.strengths : ["Core skill alignment", "Industry relevance", "Experience depth"]).map((strength, i) => (
              <div key={i} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-primary/20 hover:shadow-md transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="mt-1.5 w-2 h-2 bg-primary rounded-full shrink-0 group-hover:scale-150 transition-transform"></div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1 tracking-tight">{strength}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">AI analysis confirms high proficiency in this domain relative to the job requirements.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Missing Skills Card */}
        <div className="lg:col-span-6 bg-white border border-outline p-10 rounded-[2.5rem] shadow-sm animate-in slide-in-from-bottom-10 duration-700">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Requirement Gaps</h3>
          <div className="flex flex-wrap gap-3 mb-10">
            {insight.missing_skills?.length > 0 ? insight.missing_skills.map((skill, i) => (
              <span key={i} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border border-rose-100/50">
                <span className="material-symbols-outlined text-[16px]">close</span>
                {skill}
              </span>
            )) : (
              <span className="text-slate-400 text-xs font-medium italic">No critical gaps identified.</span>
            )}
          </div>
          <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
              <span className="material-symbols-outlined text-[60px] text-primary">lightbulb</span>
            </div>
            <div className="flex gap-4 relative z-10">
              <span className="material-symbols-outlined text-primary font-bold">tips_and_updates</span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                "{insight.suggestions?.[0] || "Consider highlighting related projects to bridge identified skill gaps."}"
              </p>
            </div>
          </div>
        </div>
        
        {/* AI Recommendations */}
        <div className="lg:col-span-6 bg-slate-900 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group animate-in slide-in-from-bottom-10 duration-700 transition-all hover:shadow-2xl">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
            <span className="material-symbols-outlined text-[100px] text-white">psychology</span>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white tracking-tight">AI Optimization Roadmap</h3>
              <span className="material-symbols-outlined text-primary animate-pulse">auto_fix_high</span>
            </div>
            <ul className="space-y-5">
              {(insight.suggestions && insight.suggestions.length > 0 ? insight.suggestions : ["Refine profile keywords", "Quantify achievements"]).map((suggestion, i) => (
                <li key={i} className="flex items-start gap-4 group/item">
                  <span className="material-symbols-outlined text-primary text-[20px] group-hover/item:scale-110 transition-transform">check_circle</span>
                  <span className="text-xs text-slate-300 font-medium leading-relaxed">{transformPerspective(suggestion)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Match Breakdown Section */}
        <div className="lg:col-span-12 bg-white border border-outline rounded-[2.5rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-10 duration-700">
          <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Match Breakdown</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Granular Semantic Evaluation</p>
            </div>
            <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 text-slate-500"><div className="w-2.5 h-2.5 rounded-full bg-primary"></div> Alignment</div>
              <div className="flex items-center gap-2 text-slate-500"><div className="w-2.5 h-2.5 rounded-full bg-slate-100"></div> Variance</div>
            </div>
          </div>
          <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { label: 'Technical Skills', value: insight.match_breakdown?.skills || 0, icon: 'code' },
              { label: 'Domain Experience', value: insight.match_breakdown?.experience || 0, icon: 'history_edu' },
              { label: 'Education & Certs', value: insight.match_breakdown?.education || 0, icon: 'school' }
            ].map((stat, i) => (
              <div key={i} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-lg">{stat.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                  </div>
                  <span className="font-black text-slate-900">{stat.value}%</span>
                </div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${stat.value}%`, transitionDelay: `${i * 200}ms` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interview Tips Section */}
        <div className="lg:col-span-12 bg-indigo-50 border border-indigo-100 p-10 rounded-[2.5rem] shadow-sm animate-in slide-in-from-bottom-10 duration-700">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">forum</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Interview Preparation</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(insight.interview_tips && insight.interview_tips.length > 0 ? insight.interview_tips : ["Discuss system design", "Highlight team leadership"]).map((tip, i) => (
                <div key={i} className="p-6 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all">
                   <p className="text-xs text-slate-700 font-medium leading-relaxed italic">"{transformPerspective(tip)}"</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}


