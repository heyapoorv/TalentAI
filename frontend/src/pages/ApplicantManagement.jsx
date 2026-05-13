import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ApplicantManagement() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await api.get('/jobs');
        setJobs(response.data);
      } catch (error) {
        console.error("Error fetching jobs for selection:", error);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/jobs/${jobId}/candidates`);
        setCandidates(response.data);
      } catch (error) {
        console.error("Error fetching candidates:", error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchCandidates();
    } else {
      setLoading(false);
    }
  }, [jobId]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await api.put(`/applications/${appId}/status`, { status: newStatus });
      setCandidates(candidates.map(c => c.application_id === appId ? { ...c, status: newStatus } : c));
      setToastMessage({ type: 'success', text: `Candidate ${newStatus} successfully.` });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error("Error updating status:", error);
      setToastMessage({ type: 'error', text: 'Protocol failed. Status update rejected.' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleJobSelect = (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
      navigate(`/applicants?jobId=${selectedId}`);
    } else {
      navigate('/applicants');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-8 animate-in fade-in duration-700 pb-20">
      {/* Toast System */}
      {toastMessage && (
        <div className={`fixed top-24 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] font-black text-sm animate-in slide-in-from-right-10 duration-300 ${toastMessage.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
           <div className="flex items-center gap-3">
             <span className="material-symbols-outlined">{toastMessage.type === 'success' ? 'check_circle' : 'error'}</span>
             {toastMessage.text}
           </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none">
          <span className="material-symbols-outlined text-[180px]">group_add</span>
        </div>
        <div className="relative z-10 space-y-4">
           <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
             <Link className="hover:text-primary transition-colors" to="/recruiter-dashboard">Dashboard</Link>
             <span className="material-symbols-outlined text-[12px]">chevron_right</span>
             <span className="text-primary">Talent Management</span>
           </nav>
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Applicant Management</h1>
           <p className="text-slate-500 font-medium max-w-lg">
             Review semantic match scores and manage the interview pipeline for your active requisitions.
           </p>
        </div>

        <div className="relative z-10 w-full lg:w-80">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Switch Position</label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">filter_list</span>
            <select 
              value={jobId || ""} 
              onChange={handleJobSelect}
              className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-50 rounded-2xl outline-none appearance-none cursor-pointer font-bold text-slate-700 focus:bg-white focus:border-primary/20 transition-all shadow-sm"
            >
              <option value="">Select a Role...</option>
              {jobs.map(job => (
                <option key={job._id || job.id} value={job._id || job.id}>{job.role}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        {!jobId ? (
          <div className="py-40 text-center flex flex-col items-center gap-6">
            <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl">person_search</span>
            </div>
            <div className="space-y-2">
              <p className="text-slate-900 font-black text-xl">Select a role to view applicants.</p>
              <p className="text-slate-400 text-sm font-medium">Your current talent pool will appear here after selection.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] ml-2">Assembling Talent Pool</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-50">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Candidate Profile</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">AI Match</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Current Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {candidates.map((app, i) => (
                  <tr key={app.application_id} className="hover:bg-slate-50/50 transition-all group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 p-1 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm overflow-hidden">
                           <img alt="User" className="w-full h-full object-cover" src={`https://ui-avatars.com/api/?name=${app.name || app.user_id}&background=random&bold=true`} />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 group-hover:text-primary transition-colors text-lg tracking-tight leading-none">{app.name || "Candidate Name"}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{app.user_id.substring(0,8)}... Signature</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                       <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/5 text-primary font-black text-lg">
                         {Math.round(app.match_score)}%
                       </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                       <div className="relative inline-block w-full max-w-[140px]">
                        <select 
                          value={app.status || "Applied"}
                          onChange={(e) => handleStatusChange(app.application_id, e.target.value)}
                          className={`w-full text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border outline-none cursor-pointer appearance-none shadow-sm transition-all hover:shadow-md ${
                            app.status === 'Shortlisted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            app.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                            'bg-indigo-50 text-indigo-600 border-indigo-100'
                          }`}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">expand_more</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex items-center justify-end gap-3">
                         <Link to={`/insights/${app.application_id}`} className="px-6 py-3 bg-white text-slate-600 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary hover:border-primary/20 hover:shadow-md transition-all">
                           View AI Insights
                         </Link>
                       </div>
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No applications received yet.</td>
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
