import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function InterviewScorecard() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    const fetchScorecard = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/applications/${applicationId}/scorecard`);
        setScorecard(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to generate interview scorecard.");
      } finally {
        setLoading(false);
      }
    };
    fetchScorecard();
  }, [applicationId]);

  const handleScoreChange = (index, value) => {
    setScores(prev => ({
      ...prev,
      [index]: parseInt(value, 10) || 0
    }));
  };

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxPossible = scorecard ? scorecard.criteria.reduce((a, b) => a + b.max_score, 0) : 0;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-emerald-600 animate-pulse">fact_check</span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Generating Scorecard...</h2>
          <p className="text-slate-500 font-medium mt-2">Customizing questions based on candidate's specific gaps.</p>
        </div>
      </div>
    );
  }

  if (error || !scorecard) {
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold text-xs uppercase tracking-widest mb-4 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back
          </button>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">AI Interview Scorecard</h1>
          <p className="text-slate-500 font-medium mt-2 leading-relaxed max-w-2xl">
            {scorecard.overall_guidance}
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-center justify-center w-32 h-32 bg-slate-50 rounded-3xl border border-slate-100">
          <span className="text-4xl font-black text-slate-900 tracking-tighter">{totalScore}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">out of {maxPossible}</span>
        </div>
      </div>

      {/* Criteria List */}
      <div className="space-y-6">
        {scorecard.criteria.map((c, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm relative group overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <span className="inline-block px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                  {c.category}
                </span>
                
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">{c.question}</h3>
                  <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Look For</p>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{c.expected_answer}</p>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-32 shrink-0">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Score (0-{c.max_score})</label>
                <input 
                  type="number" 
                  min="0" 
                  max={c.max_score}
                  value={scores[i] === undefined ? '' : scores[i]}
                  onChange={(e) => handleScoreChange(i, e.target.value)}
                  className="w-full text-center text-2xl font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="-"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-6 z-50">
        <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
          <span className="material-symbols-outlined text-3xl text-emerald-400">check_circle</span>
          <div>
            <p className="font-black text-lg leading-none">{totalScore} / {maxPossible}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Score</p>
          </div>
        </div>
        <button 
          onClick={async () => {
            try {
              await api.post(`/applications/${applicationId}/scorecard`, {
                scores,
                notes: "Submitted via Scorecard UI",
                total_score: totalScore,
                max_possible: maxPossible
              });
              alert('Scorecard saved to database successfully!');
              navigate(-1);
            } catch (err) {
              alert('Failed to save scorecard.');
            }
          }}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95"
        >
          Submit Scorecard
        </button>
      </div>

    </div>
  );
}
