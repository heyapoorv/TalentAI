import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function PostJob() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: '',
    company: '',
    description: '',
    skills: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async () => {
    if (!formData.role || !formData.description) {
      setToast({ type: 'error', text: 'Incomplete data signature detected.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/jobs', formData);
      setToast({ type: 'success', text: 'Position broadcasted to network!' });
      setTimeout(() => {
        setToast(null);
        navigate('/recruiter-dashboard');
      }, 2000);
    } catch (error) {
      console.error("Error posting job:", error);
      setToast({ type: 'error', text: 'Broadcast failure. Check protocols.' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!formData.skills.includes(skillInput.trim())) {
        setFormData({
          ...formData,
          skills: [...formData.skills, skillInput.trim()]
        });
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] font-bold text-sm animate-in slide-in-from-right-10 duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
           <div className="flex items-center gap-3">
             <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
             {toast.text}
           </div>
        </div>
      )}

      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-16 opacity-[0.03] group-hover:rotate-45 transition-transform duration-1000">
           <span className="material-symbols-outlined text-[180px]">add_circle</span>
         </div>
         <div className="relative z-10">
            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
              <Link className="hover:text-primary transition-colors" to="/recruiter-dashboard">Dashboard</Link>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="text-primary">Post New Job</span>
            </nav>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Create Job Posting</h1>
            <p className="text-slate-500 font-medium mt-2">Enter the details and requirements for the new position.</p>
         </div>
         <div className="flex gap-4 relative z-10">
            <button 
              onClick={() => navigate(-1)}
              className="px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
              {submitting ? "Publishing..." : "Publish Job"}
            </button>
         </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Configuration Form */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-sm space-y-8">
            <div className="space-y-6">
              <div className="group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Job Title</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-lg font-bold text-slate-900 placeholder:text-slate-300" 
                  placeholder="e.g. Senior Software Engineer" 
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                />
              </div>

              <div className="group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Company Name</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-lg font-bold text-slate-900 placeholder:text-slate-300" 
                  placeholder="e.g. Global Tech Solutions" 
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                />
              </div>
              
              <div className="group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Job Description</label>
                <textarea 
                  className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none text-slate-700 font-medium leading-relaxed resize-none transition-all placeholder:text-slate-300" 
                  placeholder="Describe the role, responsibilities, and team..." 
                  rows="10"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-sm">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Required Skills</h3>
               <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-full">AI Match Active</span>
             </div>
             
             <div className="flex flex-wrap gap-3 p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 min-h-[100px] items-start">
                {formData.skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold animate-in zoom-in-50 duration-300 shadow-lg shadow-slate-900/10">
                    {skill} 
                    <span onClick={() => removeSkill(skill)} className="material-symbols-outlined text-[16px] cursor-pointer hover:text-rose-400 transition-colors">close</span>
                  </div>
                ))}
                <input 
                  className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 outline-none flex-1 min-w-[200px] py-2" 
                  placeholder="Type a skill and hit Enter..." 
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={addSkill}
                />
             </div>
             <p className="text-[10px] text-slate-400 font-medium mt-4 ml-1 italic">
               Skills added here will be used for high-fidelity vector matching against candidate resumes.
             </p>
          </div>
        </div>
        
        {/* System Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 text-white opacity-[0.05] group-hover:scale-125 transition-transform duration-1000">
              <span className="material-symbols-outlined text-9xl">auto_awesome</span>
            </div>
            <div className="relative z-10 space-y-6">
              <h3 className="text-2xl font-black tracking-tight leading-none">Automated Intelligence</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                Once published, our AI agents will instantly begin scanning the database for candidates matching this specific signature.
              </p>
              <div className="space-y-4 pt-4">
                 {[
                   { label: 'Semantic Matching', icon: 'hub' },
                   { label: 'Vector Clustering', icon: 'scatter_plot' },
                   { label: 'Role Embedding', icon: 'architecture' },
                 ].map((item, i) => (
                   <div key={i} className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-300">
                     <span className="material-symbols-outlined text-primary">{item.icon}</span>
                     {item.label}
                   </div>
                 ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm">
             <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4 leading-none">Posting Guidelines</h3>
             <ul className="space-y-6">
               {[
                 { title: 'Be Specific', text: 'Detailed descriptions lead to 40% higher match accuracy.' },
                 { title: 'Tag Key Tech', text: 'Explicitly mention the core stack in the requirements.' },
                 { title: 'Cultural Fit', text: 'Briefly mention the team structure and work model.' },
               ].map((tip, i) => (
                 <li key={i} className="space-y-1">
                   <p className="text-sm font-black text-slate-900 tracking-tight">{tip.title}</p>
                   <p className="text-xs text-slate-500 font-medium leading-relaxed">{tip.text}</p>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
