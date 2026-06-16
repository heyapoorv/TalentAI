import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CandidateComparison() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');
  const appsParam = searchParams.get('apps');
  const applicationIds = appsParam ? appsParam.split(',') : [];

  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId || applicationIds.length < 2) {
      setError("Invalid comparison parameters.");
      setLoading(false);
      return;
    }

    const fetchComparison = async () => {
      try {
        setLoading(true);
        const res = await api.post(`/jobs/${jobId}/compare`, { application_ids: applicationIds });
        setComparison(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to generate comparison.");
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [jobId, appsParam]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-indigo-600 animate-pulse">compare_arrows</span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI is analyzing candidates...</h2>
          <p className="text-slate-500 font-medium mt-2">Evaluating technical skills, culture fit, and risk factors.</p>
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
          <span className="material-symbols-outlined text-4xl">error</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900">{error || "Something went wrong"}</h2>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800">
          Go Back
        </button>
      </div>
    );
  }

  // Extract candidate names from comparison table keys
  const candidateNames = comparison.comparison_table.length > 0 
    ? Object.keys(comparison.comparison_table[0]).filter(k => k !== 'category') 
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold text-xs uppercase tracking-widest mb-4 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Applicants
          </button>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Candidate Comparison</h1>
          <p className="text-slate-500 font-medium mt-2 leading-relaxed max-w-3xl">
            {comparison.hiring_recommendation}
          </p>
        </div>
        <div className="hidden lg:flex w-20 h-20 bg-indigo-50 rounded-2xl items-center justify-center text-indigo-600 shrink-0">
          <span className="material-symbols-outlined text-4xl">compare</span>
        </div>
      </div>

      {/* AI Awards Bento Box */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[100px] opacity-20 group-hover:scale-110 transition-transform">workspace_premium</span>
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1">Top Recommendation</p>
          <h3 className="text-2xl font-black tracking-tight mb-2">Best Overall</h3>
          <p className="text-xl font-bold bg-white/20 inline-block px-4 py-2 rounded-xl backdrop-blur-sm mt-4">
            {candidateNames.find(n => comparison.best_overall_id && n.includes(comparison.best_overall_id)) || "Candidate " + comparison.best_overall_id?.substring(0,6)}
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <span className="material-symbols-outlined">code</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Strongest Architecture</p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Best Technical</h3>
          <p className="text-lg font-bold text-slate-700 mt-2">
            {candidateNames.find(n => comparison.best_technical_id && n.includes(comparison.best_technical_id)) || "Candidate " + comparison.best_technical_id?.substring(0,6)}
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
            <span className="material-symbols-outlined">rocket_launch</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Immediate Impact</p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Fastest Ramp-Up</h3>
          <p className="text-lg font-bold text-slate-700 mt-2">
            {candidateNames.find(n => comparison.fastest_ramp_up_id && n.includes(comparison.fastest_ramp_up_id)) || "Candidate " + comparison.fastest_ramp_up_id?.substring(0,6)}
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mb-4">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Needs Scrutiny</p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Highest Risk</h3>
          <p className="text-lg font-bold text-slate-700 mt-2">
            {candidateNames.find(n => comparison.highest_risk_id && n.includes(comparison.highest_risk_id)) || "Candidate " + comparison.highest_risk_id?.substring(0,6)}
          </p>
        </div>
      </div>

      {/* Comparison Matrix */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Detailed Analysis Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-6 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-100 min-w-[200px]">Evaluation Category</th>
                {candidateNames.map((name, i) => (
                  <th key={i} className="p-6 bg-white text-sm font-black text-slate-900 tracking-tight border-b border-slate-100 min-w-[250px] align-top">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.comparison_table.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 border-b border-r border-slate-100 align-top">
                    <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest">
                      {row.category}
                    </span>
                  </td>
                  {candidateNames.map((name, j) => (
                    <td key={j} className="p-6 border-b border-slate-100 align-top text-slate-600 text-sm leading-relaxed font-medium">
                      {row[name] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
