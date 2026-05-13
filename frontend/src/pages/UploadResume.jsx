import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function UploadResume() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([
    { id: 1, name: 'Upload Document', status: 'pending', icon: 'cloud_upload' },
    { id: 2, name: 'AI Text Extraction', status: 'pending', icon: 'psychology' },
    { id: 3, name: 'Vector Embedding', status: 'pending', icon: 'hub' },
    { id: 4, name: 'Job Matching', status: 'pending', icon: 'target' }
  ]);

  useEffect(() => {
    if (user && user.role === 'recruiter') {
      navigate('/recruiter-dashboard');
    }
  }, [user, navigate]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    // Reset steps when a new file is selected
    setSteps(steps.map(s => ({ ...s, status: 'pending' })));
    setCurrentStep(0);
  };

  const updateStepStatus = (id, status) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setCurrentStep(1);
    updateStepStatus(1, 'loading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate steps for better UX since the backend is fast but we want to show the process
      setTimeout(() => updateStepStatus(1, 'complete'), 800);
      setTimeout(() => {
        setCurrentStep(2);
        updateStepStatus(2, 'loading');
      }, 1000);

      const response = await api.post('/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // After API success, complete the remaining simulated steps
      setTimeout(() => updateStepStatus(2, 'complete'), 1500);
      setTimeout(() => {
        setCurrentStep(3);
        updateStepStatus(3, 'loading');
      }, 1800);

      setTimeout(() => updateStepStatus(3, 'complete'), 2500);
      setTimeout(() => {
        setCurrentStep(4);
        updateStepStatus(4, 'loading');
      }, 2800);

      setTimeout(() => {
        updateStepStatus(4, 'complete');
        setUploading(false);
        alert("Resume analyzed and matches found!");
      }, 3500);

      console.log("Upload response:", response.data);
    } catch (error) {
      console.error("Upload error:", error);
      updateStepStatus(currentStep, 'error');
      alert(error.response?.data?.detail || "Failed to upload resume.");
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-margin w-full">
      <div className="max-w-6xl mx-auto">
        <header className="mb-lg">
          <h1 className="font-h1 text-slate-900 mb-base">Resume Analysis</h1>
          <p className="font-body-md text-slate-500">Upload your resume to trigger AI-driven extraction and matching.</p>
        </header>

        <div className="grid grid-cols-12 gap-gutter">
          <section className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-100 p-xl text-center hover:border-primary transition-all shadow-sm">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-md">
                  <span className="material-symbols-outlined text-primary text-4xl">upload_file</span>
                </div>
                <h3 className="font-h2 mb-xs text-slate-900">
                  {file ? file.name : "Drop your resume here"}
                </h3>
                <p className="text-body-md text-slate-500 mb-xl">PDF, DOCX, or TXT (Max 10MB)</p>

                <input
                  type="file"
                  id="resume-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                />

                <div className="flex gap-4">
                  <label
                    htmlFor="resume-upload"
                    className="cursor-pointer bg-white border-2 border-primary text-primary px-lg py-sm rounded-xl font-label-md hover:bg-primary/5 transition-all"
                  >
                    Browse Files
                  </label>

                  {file && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="bg-primary text-white px-lg py-sm rounded-xl font-label-md hover:bg-primary-hover active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {uploading ? "Analyzing..." : "Analyze Resume"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* AI Processing Status */}
          <section className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
            <div className="bg-white rounded-2xl border border-slate-200 p-lg shadow-sm">
              <div className="flex items-center gap-2 mb-lg">
                <span className="material-symbols-outlined text-primary">psychology</span>
                <h4 className="font-h3 text-slate-900">AI Pipeline</h4>
              </div>

              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={step.id} className="relative flex items-start gap-4">
                    {index !== steps.length - 1 && (
                      <div className={`absolute left-5 top-10 w-0.5 h-8 ${step.status === 'complete' ? 'bg-primary' : 'bg-slate-100'}`}></div>
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${step.status === 'complete' ? 'bg-primary text-white' :
                        step.status === 'loading' ? 'bg-indigo-50 text-primary border-2 border-primary border-t-transparent animate-spin' :
                          'bg-slate-50 text-slate-400'
                      }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {step.status === 'complete' ? 'check' : step.icon}
                      </span>
                    </div>
                    <div className="pt-2">
                      <p className={`text-sm font-bold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>{step.name}</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">
                        {step.status === 'complete' ? 'Success' : step.status === 'loading' ? 'In Progress' : 'Queued'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
