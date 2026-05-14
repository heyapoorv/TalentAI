import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const EXP_LEVELS = ['entry', 'mid', 'senior', 'lead'];
const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'];

export default function PostJob() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: '',
    company: '',
    description: '',
    skills: [],
    location: '',
    job_type: '',
    experience_level: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'USD',
  });
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!formData.role || !formData.description) {
      showToast('error', 'Job title and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        location: formData.location || null,
        job_type: formData.job_type || null,
        experience_level: formData.experience_level || null,
      };
      await api.post('/jobs', payload);
      showToast('success', 'Position broadcasted to network!');
      setTimeout(() => navigate('/recruiter-dashboard'), 2000);
    } catch (error) {
      console.error('Error posting job:', error);
      showToast('error', error.response?.data?.detail || 'Broadcast failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!formData.skills.includes(skillInput.trim())) {
        handleChange('skills', [...formData.skills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => handleChange('skills', formData.skills.filter(s => s !== skill));

  const SelectField = ({ label, field, options, icon }) => (
    <div className="group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">{label}</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">{icon}</span>
        <select
          className="w-full pl-11 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
        >
          <option value="">Any</option>
          {options.map(o => (
            <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] font-bold text-sm animate-in slide-in-from-right-10 duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
            {toast.text}
          </div>
        </div>
      )}

      {/* Header */}
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
          <p className="text-slate-500 font-medium mt-2">Fill in all details to maximize AI match accuracy.</p>
        </div>
        <div className="flex gap-4 relative z-10">
          <button onClick={() => navigate(-1)} className="px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-95">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50 flex items-center gap-2">
            {submitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Publishing...</> : 'Publish Job'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Main Form */}
        <div className="lg:col-span-8 space-y-8">
          {/* Core Info */}
          <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">article</span> Role Details
            </h2>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Job Title *</label>
              <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-lg font-bold text-slate-900 placeholder:text-slate-300" placeholder="e.g. Senior Software Engineer" type="text" value={formData.role} onChange={(e) => handleChange('role', e.target.value)} />
            </div>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Company Name</label>
              <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300" placeholder="e.g. Global Tech Solutions" type="text" value={formData.company} onChange={(e) => handleChange('company', e.target.value)} />
            </div>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Job Description *</label>
              <textarea className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none text-slate-700 font-medium leading-relaxed resize-none transition-all placeholder:text-slate-300" placeholder="Describe the role, responsibilities, and team..." rows="8" value={formData.description} onChange={(e) => handleChange('description', e.target.value)}></textarea>
            </div>
          </div>

          {/* Job Classification */}
          <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">tune</span> Classification & Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField label="Job Type" field="job_type" options={JOB_TYPES} icon="work" />
              <SelectField label="Experience Level" field="experience_level" options={EXP_LEVELS} icon="military_tech" />
            </div>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Location</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">location_on</span>
                <input className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300" placeholder='e.g. "Remote", "New York", "Hybrid - London"' type="text" value={formData.location} onChange={(e) => handleChange('location', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Salary */}
          <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">payments</span> Compensation Range
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full ml-auto">Optional</span>
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Currency</label>
                <select className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 appearance-none cursor-pointer" value={formData.salary_currency} onChange={(e) => handleChange('salary_currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Min Salary</label>
                <input className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-slate-900 placeholder:text-slate-300" placeholder="50,000" type="number" value={formData.salary_min} onChange={(e) => handleChange('salary_min', e.target.value)} />
              </div>
              <div className="group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block group-focus-within:text-primary transition-colors">Max Salary</label>
                <input className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-slate-900 placeholder:text-slate-300" placeholder="120,000" type="number" value={formData.salary_max} onChange={(e) => handleChange('salary_max', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">hub</span> Required Skills
              </h2>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-full">AI Match Active</span>
            </div>
            <div className="flex flex-wrap gap-3 p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 min-h-[80px] items-start">
              {formData.skills.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold animate-in zoom-in-50 duration-300 shadow-lg shadow-slate-900/10">
                  {skill}
                  <span onClick={() => removeSkill(skill)} className="material-symbols-outlined text-[16px] cursor-pointer hover:text-rose-400 transition-colors">close</span>
                </div>
              ))}
              <input className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 outline-none flex-1 min-w-[180px] py-2 placeholder:text-slate-400" placeholder="Type a skill and press Enter..." type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={addSkill} />
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-3 ml-1 italic">Skills are vectorised and matched against candidate resumes using semantic embeddings.</p>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group sticky top-24">
            <div className="absolute top-0 right-0 p-10 text-white opacity-[0.05] group-hover:scale-125 transition-transform duration-1000">
              <span className="material-symbols-outlined text-9xl">auto_awesome</span>
            </div>
            <div className="relative z-10 space-y-6">
              <h3 className="text-2xl font-black tracking-tight leading-none">AI Intelligence</h3>
              <p className="text-slate-400 font-medium leading-relaxed text-sm">Our AI agents will instantly scan the database for candidates matching this specific signature once published.</p>
              <div className="space-y-4 pt-2">
                {[
                  { label: 'Semantic Matching', icon: 'hub', desc: 'Vector embeddings for deep skill alignment' },
                  { label: 'Experience Scoring', icon: 'military_tech', desc: 'Seniority-level validation' },
                  { label: 'Role Embedding', icon: 'architecture', desc: 'Domain context awareness' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4">Posting Guidelines</h3>
            <ul className="space-y-4">
              {[
                { title: 'Be Specific', text: 'Detailed descriptions increase match accuracy by ~40%.' },
                { title: 'Tag Key Tech', text: 'Explicitly list your core tech stack in skills.' },
                { title: 'Add Salary Range', text: 'Jobs with salary data get 3x more applicants.' },
              ].map((tip, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-black text-slate-900 tracking-tight">{tip.title}</p>
                    <p className="text-xs text-slate-500 font-medium">{tip.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
