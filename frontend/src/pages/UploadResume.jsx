import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const STEPS = [
  { id: 1, name: 'Upload Document',   icon: 'cloud_upload' },
  { id: 2, name: 'AI Text Extraction', icon: 'psychology'   },
  { id: 3, name: 'Vector Embedding',   icon: 'hub'          },
  { id: 4, name: 'Job Matching',       icon: 'target'       },
];

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX_SIZE_MB = 10;

export default function UploadResume() {
  const { user } = useContext(AuthContext);
  const navigate  = useNavigate();
  const timers    = useRef([]);

  const [file,    setFile]    = useState(null);
  const [fileErr, setFileErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast,   setToast]   = useState(null); // { type, text }
  const [steps,   setSteps]   = useState(STEPS.map(s => ({ ...s, status: 'pending' })));

  // Clear all pending timers on unmount to prevent memory leaks
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (user?.role === 'recruiter') navigate('/recruiter-dashboard');
  }, [user, navigate]);

  const showToast = (type, text) => {
    setToast({ type, text });
    const t = setTimeout(() => setToast(null), 4000);
    timers.current.push(t);
  };

  const setStepStatus = (id, status) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));

  const resetSteps = () => setSteps(STEPS.map(s => ({ ...s, status: 'pending' })));

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFileErr('');
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFileErr('Only PDF, DOCX, and TXT files are accepted.');
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileErr(`File size must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(selected);
    resetSteps();
  };

  const addTimer = (fn, delay) => {
    const t = setTimeout(fn, delay);
    timers.current.push(t);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    setStepStatus(1, 'loading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate visual progress for steps 1-2 while API runs
      addTimer(() => setStepStatus(1, 'complete'), 600);
      addTimer(() => setStepStatus(2, 'loading'),  800);

      const response = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // API succeeded — complete remaining simulated steps
      addTimer(() => setStepStatus(2, 'complete'), 200);
      addTimer(() => setStepStatus(3, 'loading'),  500);
      addTimer(() => setStepStatus(3, 'complete'), 1200);
      addTimer(() => setStepStatus(4, 'loading'),  1500);
      addTimer(() => {
        setStepStatus(4, 'complete');
        setUploading(false);
        showToast('success', response.data?.message || 'Resume uploaded! AI analysis is running in background.');
        // Navigate to applications after a short pause so user sees success
        addTimer(() => navigate('/applications'), 2000);
      }, 2200);

    } catch (error) {
      resetSteps();
      setStepStatus(1, 'error');
      setUploading(false);
      showToast('error', error.response?.data?.detail || 'Failed to upload resume. Please try again.');
    }
  };

  const stepIcon = (step) => {
    if (step.status === 'complete') return 'check';
    if (step.status === 'error')    return 'error';
    return step.icon;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] font-bold text-sm animate-in slide-in-from-right-10 duration-300 flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
          <span className="material-symbols-outlined text-[180px]">description</span>
        </div>
        <div className="relative z-10">
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
            <Link className="hover:text-primary transition-colors" to="/dashboard">Dashboard</Link>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary">Resume Analysis</span>
          </nav>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Resume Analysis</h1>
          <p className="text-slate-500 font-medium mt-2">Upload your resume to activate AI-driven extraction and semantic job matching.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Zone */}
        <section className="lg:col-span-8">
          <div
            className={`bg-white rounded-[2rem] border-2 border-dashed p-16 text-center shadow-sm transition-all ${file ? 'border-primary/30 bg-primary/5' : 'border-slate-200 hover:border-primary/30'}`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
          >
            <div className="flex flex-col items-center gap-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${file ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                <span className="material-symbols-outlined text-4xl">{file ? 'description' : 'upload_file'}</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">{file ? file.name : 'Drop your resume here'}</h3>
                {file
                  ? <p className="text-slate-400 text-sm font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split('/')[1]?.toUpperCase()}</p>
                  : <p className="text-slate-400 text-sm font-medium">PDF, DOCX, or TXT · Max {MAX_SIZE_MB}MB</p>
                }
              </div>
              {fileErr && <p className="text-rose-500 text-sm font-bold bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">{fileErr}</p>}
              <div className="flex gap-4">
                <label htmlFor="resume-upload" className="cursor-pointer px-8 py-4 bg-white border-2 border-primary text-primary rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/5 transition-all">
                  {file ? 'Change File' : 'Browse Files'}
                </label>
                <input type="file" id="resume-upload" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.txt" />
                {file && !uploading && (
                  <button onClick={handleUpload} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/10">
                    Analyze Resume
                  </button>
                )}
                {uploading && (
                  <button disabled className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 opacity-80 cursor-not-allowed">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Processing…
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* AI Pipeline Status */}
        <section className="lg:col-span-4">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-8">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <h4 className="text-lg font-black text-slate-900 tracking-tight">AI Pipeline</h4>
            </div>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.id} className="relative flex items-start gap-4">
                  {index !== steps.length - 1 && (
                    <div className={`absolute left-5 top-10 w-0.5 h-8 transition-colors duration-500 ${step.status === 'complete' ? 'bg-primary' : 'bg-slate-100'}`} />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                    step.status === 'complete' ? 'bg-primary text-white shadow-lg shadow-primary/20' :
                    step.status === 'loading'  ? 'border-2 border-primary border-t-transparent animate-spin bg-transparent text-transparent' :
                    step.status === 'error'    ? 'bg-rose-500 text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">{stepIcon(step)}</span>
                  </div>
                  <div className="pt-2">
                    <p className={`text-sm font-bold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>{step.name}</p>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">
                      {step.status === 'complete' ? '✓ Complete' : step.status === 'loading' ? 'In Progress…' : step.status === 'error' ? '✗ Failed' : 'Queued'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
