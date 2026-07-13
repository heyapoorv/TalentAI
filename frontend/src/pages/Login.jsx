import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (result.role === 'recruiter') {
        navigate('/recruiter-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-['Inter'] relative overflow-hidden">
      {/* Background decorations - Animated */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none animate-fade-in">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[140px] animate-float"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-primary/20 blur-[140px] animate-float-delayed"></div>
      </div>

      <main className="relative w-full max-w-5xl grid md:grid-cols-2 bg-white/60 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden shadow-[0_30px_80px_-15px_rgba(0,0,0,0.15)] border border-white/80 opacity-0 animate-fade-in-up">
        
        {/* Left Side: Login Form */}
        <div className="p-10 md:p-14 flex flex-col justify-center">
          <div className="mb-10 opacity-0 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.2s_forwards]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
                <span className="material-symbols-outlined text-xl">psychology</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">TalentAI</h1>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome back</h2>
            <p className="text-slate-500 text-sm font-medium">Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50/80 backdrop-blur-sm border border-rose-100/50 text-rose-600 rounded-2xl text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
              {error}
            </div>
          )}

          <form className="space-y-5 opacity-0 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.4s_forwards]" onSubmit={handleLogin}>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 group-focus-within:text-primary transition-colors ml-1">Email</label>
              <input
                className="w-full px-5 py-3.5 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 group-focus-within:text-primary transition-colors ml-1">Password</label>
              <input
                className="w-full px-5 py-3.5 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center justify-between px-1 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input className="w-4 h-4 rounded-md border-slate-300 text-primary focus:ring-primary/20 transition-all shadow-sm" type="checkbox" />
                <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">Remember me</span>
              </label>
              <Link to="/help" className="text-sm font-semibold text-primary hover:text-indigo-700 transition-colors">Forgot password?</Link>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-6 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.98] shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-10 text-center text-sm font-semibold text-slate-500 opacity-0 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.6s_forwards]">
            Don't have an account? <Link className="text-primary hover:text-indigo-700 transition-colors ml-1 font-bold" to="/register">Sign up</Link>
          </p>
        </div>

        {/* Right Side: Visualization */}
        <div className="hidden md:flex flex-col relative bg-slate-900 overflow-hidden items-center justify-center p-14">
          <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000')", backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary rounded-full blur-[100px] opacity-30 animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-500 rounded-full blur-[80px] opacity-40 animate-float"></div>

          <div className="relative z-10 text-center space-y-10 opacity-0 animate-[fadeIn_1s_ease-out_0.8s_forwards]">
            <div className="inline-flex p-5 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl hover:bg-white/10 transition-colors duration-500 cursor-default">
              <div className="w-48 h-48 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-inner border border-white/10">
                <span className="material-symbols-outlined text-7xl text-white/90 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] animate-float">workspaces</span>
              </div>
            </div>
            <div className="max-w-[280px] mx-auto space-y-4">
              <h2 className="text-3xl font-black text-white tracking-tight leading-tight">The smart way to hire.</h2>
              <p className="text-slate-300 font-medium text-sm leading-relaxed">
                Experience AI-driven matching that connects top talent with the world's best opportunities.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
