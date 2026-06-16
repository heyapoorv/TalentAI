import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ResumeOptimizer() {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleOptimize = async () => {
    if (!jobDescription.trim()) {
      setError("Please paste a job description first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/resume/optimize', { job_description: jobDescription });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to optimize resume. Do you have a resume uploaded?");
    } finally {
      setLoading(false);
    }
  };

  const ScoreCircle = ({ score, label }) => {
    const color = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500';
    const bg = score >= 80 ? 'bg-emerald-50' : score >= 60 ? 'bg-amber-50' : 'bg-rose-50';
    return (
      <div className={`${bg} rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
        <p className={`text-3xl font-black ${color} tracking-tighter`}>{score}</p>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{label}</p>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-[0.02] group-hover:rotate-12 transition-transform duration-1000">
          <span className="material-symbols-outlined text-[200px]">auto_fix_high</span>
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Resume Optimizer</h1>
          <p className="text-slate-500 font-medium mt-4 leading-relaxed">
            Paste a target job description below. Our AI will deeply analyze your current resume against the job requirements and generate a tailored optimization roadmap, rewriting your summary and bullet points to maximize your ATS score.
          </p>
        </div>
      </div>

      {/* Input Section */}
      {!result && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Target Job Description</label>
            {error && <span className="text-xs font-bold text-rose-500">{error}</span>}
          </div>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            className="w-full h-64 p-6 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-sm text-slate-700 font-medium"
            disabled={loading}
          />
          <div className="flex justify-end">
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-sm">sync</span> Analyzing...</>
              ) : (
                <><span className="material-symbols-outlined text-sm">auto_fix</span> Optimize My Resume</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8">
          
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Optimization Report</h2>
            <button onClick={() => setResult(null)} className="text-xs font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors">Test Another Job</button>
          </div>

          {/* Scores Bento */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="col-span-2 md:col-span-2 bg-slate-900 text-white rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
              <span className="material-symbols-outlined absolute -left-4 -bottom-4 text-[120px] opacity-10">fact_check</span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Overall ATS Score</p>
              <p className={`text-6xl font-black tracking-tighter relative z-10 ${result.ats_score >= 80 ? 'text-emerald-400' : result.ats_score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                {result.ats_score}
              </p>
            </div>
            <ScoreCircle score={result.scoring_breakdown.skills_relevance} label="Skills Match" />
            <ScoreCircle score={result.scoring_breakdown.experience_quality} label="Experience" />
            <ScoreCircle score={result.scoring_breakdown.keyword_coverage} label="Keywords" />
            <ScoreCircle score={result.scoring_breakdown.formatting_signals} label="Formatting" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Keywords */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><span className="material-symbols-outlined">key</span></div>
                <h3 className="text-lg font-black text-slate-900">Keyword Analysis</h3>
              </div>
              
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Missing Critical Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-100">{kw}</span>
                  ))}
                  {result.missing_keywords.length === 0 && <span className="text-sm text-slate-500 italic">None missing!</span>}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Important Keywords Detected</p>
                <div className="flex flex-wrap gap-2">
                  {result.important_keywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">{kw}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Roadmap */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center"><span className="material-symbols-outlined">route</span></div>
                <h3 className="text-lg font-black text-slate-900">Improvement Roadmap</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-900 mb-2">Quick Wins</p>
                  <ul className="list-disc list-inside text-sm text-slate-600 font-medium space-y-1">
                    {result.quick_wins.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-900 mb-2">High Impact Additions</p>
                  <ul className="list-disc list-inside text-sm text-slate-600 font-medium space-y-1">
                    {result.high_impact_skill_additions.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Rewrites */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">edit_note</span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Summary Rewriter</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="p-6 space-y-3 bg-slate-50/30">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Summary</p>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{result.original_summary}</p>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">General Improvement</p>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">{result.improved_summary}</p>
              </div>
              <div className="p-6 space-y-3 bg-indigo-50/30">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Job-Tailored Summary</p>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">{result.job_specific_summary}</p>
              </div>
            </div>
          </div>

          {/* Bullet Enhancements */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">bolt</span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Impact Bullet Transformer</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {result.bullet_enhancements.map((b, i) => (
                <div key={i} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 space-y-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded">Before</span>
                    <p className="text-sm text-slate-500 font-medium">{b.original}</p>
                  </div>
                  <div className="hidden md:flex items-center text-slate-300">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded">After</span>
                    <p className="text-sm text-slate-800 font-bold">{b.improved}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
