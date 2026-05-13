import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fullName = `${firstName} ${lastName}`.trim();
    const result = await register(fullName, email, password, role);

    if (result.success) {
      if (result.role === 'recruiter') {
        navigate('/recruiter-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message || 'Registration failed');
    }

    setLoading(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-6 font-['Inter']">
      <main className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/60 border border-slate-100">
        {/* Left Side: Register Form */}
        <div className="p-10 md:p-16 flex flex-col justify-center overflow-y-auto max-h-[90vh]">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">TalentAI</h1>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Account</h2>
            <p className="text-slate-500 font-medium mt-2">Join TalentAI to streamline your hiring or job search.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold">
              {error}
            </div>
          )}

          <div className="mb-8 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Select Role</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRole('candidate')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${role === 'candidate' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}
              >
                <span className="material-symbols-outlined">person</span>
                Candidate
              </button>
              <button
                onClick={() => setRole('recruiter')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${role === 'recruiter' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}
              >
                <span className="material-symbols-outlined">business_center</span>
                Recruiter
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">First Name</label>
                <input
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-slate-600 text-sm"
                  placeholder="Alex" type="text"
                  value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Last Name</label>
                <input
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-slate-600 text-sm"
                  placeholder="Smith" type="text"
                  value={lastName} onChange={(e) => setLastName(e.target.value)} required
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Email Address</label>
              <input
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-slate-600 text-sm"
                placeholder="name@example.com" type="email"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Password</label>
              <input
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-slate-600 text-sm"
                placeholder="••••••••" type="password"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50 mt-4"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Already Synced? <Link to="/" className="text-primary hover:text-indigo-700 transition-colors">Sign In</Link>
          </p>
        </div>

        {/* Right Side: Visualization */}
        <div className="hidden md:flex flex-col relative bg-slate-900 overflow-hidden items-center justify-center p-16">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000')" }}></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary rounded-full blur-[120px] opacity-20"></div>

          <div className="relative z-10 text-center space-y-8">
            <div className="inline-flex p-4 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl">
              <div className="w-64 h-64 bg-slate-800 rounded-[2rem] flex items-center justify-center">
                <span className="material-symbols-outlined text-[100px] text-primary animate-pulse">architecture</span>
              </div>
            </div>
            <div className="max-w-xs mx-auto space-y-4">
              <h2 className="text-3xl font-black text-white tracking-tight">Accelerate your Career Trajectory.</h2>
              <p className="text-slate-400 font-medium leading-relaxed">
                Connect your unique skills with the world's most high-impact opportunities.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
