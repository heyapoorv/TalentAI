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
      } catch {
        // handled by empty state
      } finally {
        setLoading(false);
      }
    };
    fetchInsight();
  }, [id]);

  const handleReanalyze = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/applications/${id}/insights?recalculate=true`);
      setInsight(response.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary text-xl">psychology</span>
        </div>
        <div className="text-center">
          <p className="text-slate-800 font-bold text-sm">Analyzing match...</p>
          <p className="text-slate-400 text-sm mt-1">Comparing your profile with role requirements</p>
        </div>
      </div>
    );
  }

  if (!insight || (insight.match_score === 0 && !insight.strengths?.length)) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-10 text-center bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-6">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">analytics</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Analysis Not Ready</h2>
          <p className="text-slate-500 text-sm leading-relaxed">The AI is still processing your profile or encountered an issue during analysis.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReanalyze}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Run Analysis
          </button>
          <Link
            to={isRecruiter ? '/recruiter-dashboard' : '/dashboard'}
            className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const transformPerspective = (text) => {
    if (!isRecruiter) return text;
    return text
      .replace(/\bYour\b/g, "Candidate's")
      .replace(/\byour\b/g, "candidate's")
      .replace(/\bYou\b/g, 'Candidate')
      .replace(/\byou\b/g, 'candidate');
  };

  const score = Math.round(insight.match_score || 0);
  const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500';
  const scoreBg = score >= 70 ? 'bg-emerald-50 border-emerald-100' : score >= 50 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <nav className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-2">
            <Link className="hover:text-primary transition-colors" to={isRecruiter ? '/recruiter-dashboard' : '/dashboard'}>
              Dashboard
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-slate-600 font-semibold">Match Intelligence</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {insight.job_role || 'Position Analysis'}
          </h1>
          {insight.status && (
            <p className="text-sm text-slate-500 mt-1">Status: <span className="font-semibold text-slate-700">{insight.status}</span></p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">download</span>
            Export
          </button>
          <div className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 ${
            insight.status === 'Shortlisted' ? 'bg-emerald-500 text-white' :
            insight.status === 'Rejected' ? 'bg-red-500 text-white' :
            'bg-primary text-white'
          }`}>
            <span className="material-symbols-outlined text-[16px]">
              {insight.status === 'Shortlisted' ? 'stars' : insight.status === 'Rejected' ? 'cancel' : 'pending'}
            </span>
            {insight.status || 'In Review'}
          </div>
        </div>
      </div>

      {/* Top Row: Score + Strengths */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match Score */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <div className="relative w-40 h-40 flex items-center justify-center mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="transparent" r="42" stroke="#F8FAFC" strokeWidth="8" />
              <circle
                cx="50" cy="50" fill="transparent" r="42" stroke="url(#grad)" strokeWidth="8"
                strokeDasharray="263.89"
                strokeDashoffset={263.89 - (263.89 * score) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-900">{score}%</span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5">Match Score</span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border font-semibold text-sm ${scoreBg} ${scoreColor}`}>
            <span className="material-symbols-outlined text-[16px]">{score >= 70 ? 'auto_awesome' : 'bolt'}</span>
            {score >= 70 ? 'Highly Qualified' : score >= 50 ? 'Good Potential' : 'Developing Match'}
          </span>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed max-w-[200px]">
            {isRecruiter
              ? 'Semantic overlap between candidate experience and role requirements.'
              : 'Your background alignment with the technical requirements for this role.'}
          </p>
        </div>

        {/* Strengths */}
        <div className="lg:col-span-2 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Key Strengths</h3>
              <p className="text-xs text-slate-500">What makes you stand out</p>
            </div>
          </div>
          <div className="space-y-3">
            {(insight.strengths?.length > 0 ? insight.strengths : ['Technical Proficiency', 'Problem Solving', 'Experience Depth']).map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                <span className="material-symbols-outlined text-emerald-500 text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">{transformPerspective(s)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row: Gaps + Missing Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Gaps */}
        <div className="lg:col-span-2 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Critical Gaps</h3>
              <p className="text-xs text-slate-500">Areas identified by AI analysis</p>
            </div>
          </div>
          <div className="space-y-3">
            {(insight.weaknesses?.length > 0 ? insight.weaknesses : ['Limited domain-specific experience', 'Certain advanced tools not demonstrated']).map((w, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5 flex-shrink-0">report</span>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">{transformPerspective(w)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Skills */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">build</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Skill Gaps</h3>
              <p className="text-xs text-slate-500">Required skills to develop</p>
            </div>
          </div>
          {insight.missing_skills?.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-4">
              {insight.missing_skills.map((skill, i) => (
                <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg font-medium text-xs border border-red-100">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
              <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
              <span className="text-sm font-medium text-emerald-700">All core requirements met!</span>
            </div>
          )}
          {insight.suggestions?.[0] && (
            <div className="mt-auto p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1.5">Top Recommendation</p>
              <p className="text-xs text-slate-700 leading-relaxed">"{insight.suggestions[0]}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Optimization Roadmap */}
      {insight.suggestions?.length > 1 && (
        <div className="bg-slate-900 p-7 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Optimization Roadmap</h3>
                <p className="text-xs text-primary mt-0.5 font-medium">AI-generated profile enhancements</p>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">auto_fix_high</span>
              </div>
            </div>
            <ul className="space-y-4">
              {insight.suggestions.slice(1).map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-primary text-[13px]">done_all</span>
                  </div>
                  <span className="text-sm text-slate-300 leading-relaxed">{transformPerspective(s)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Match Breakdown */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-slate-900">Semantic Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">Category-level match scoring</p>
          </div>
          <div className="flex gap-5 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span> Alignment</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block"></span> Gap</span>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { label: 'Technical Core', value: insight.match_breakdown?.skills || 0, icon: 'database', color: 'bg-primary' },
            { label: 'Domain Context', value: insight.match_breakdown?.experience || 0, icon: 'history_edu', color: 'bg-indigo-500' },
            { label: 'Academic Fit', value: insight.match_breakdown?.education || 0, icon: 'school', color: 'bg-slate-900' },
          ].map((stat, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">{stat.icon}</span>
                  <span className="text-sm font-semibold text-slate-600">{stat.label}</span>
                </div>
                <span className="font-black text-base text-slate-900">{stat.value}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${stat.color} rounded-full transition-all duration-[1.5s] ease-out`}
                  style={{ width: `${stat.value}%`, transitionDelay: `${i * 200}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interview Readiness */}
      {insight.interview_tips?.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-xl">chat_bubble</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Interview Readiness</h3>
              <p className="text-xs text-indigo-500 mt-0.5">Topics to master before your interview</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {insight.interview_tips.map((tip, i) => (
              <div key={i} className="p-4 bg-white/80 rounded-xl border border-white shadow-sm hover:shadow-md transition-all">
                <span className="material-symbols-outlined text-primary mb-2 block text-xl">question_answer</span>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">"{transformPerspective(tip)}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
