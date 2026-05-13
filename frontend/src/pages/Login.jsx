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
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-6 font-['Inter']">
      <main className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/60 border border-slate-100">
        {/* Left Side: Login Form */}
        <div className="p-10 md:p-16 flex flex-col justify-center">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">TalentAI</h1>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sign In</h2>
            <p className="text-slate-500 font-medium mt-2">Enter your credentials to access your account.</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold animate-in shake duration-500">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Email Address</label>
              <input
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-slate-600 placeholder:text-slate-300"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Password</label>
              <input
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-slate-600 placeholder:text-slate-300"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input className="w-4 h-4 rounded-lg border-slate-200 text-primary focus:ring-primary/20" type="checkbox" />
                <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Remember me</span>
              </label>
              <Link to="/help" className="text-xs font-bold text-primary hover:text-indigo-700 transition-colors">Forgot password?</Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            New Node? <Link className="text-primary hover:text-indigo-700 transition-colors" to="/register">Register Identity</Link>
          </p>
        </div>

        {/* Right Side: Visualization */}
        <div className="hidden md:flex flex-col relative bg-slate-900 overflow-hidden items-center justify-center p-16">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000')" }}></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary rounded-full blur-[120px] opacity-20"></div>

          <div className="relative z-10 text-center space-y-8">
            <div className="inline-flex p-4 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl">
              <div className="w-64 h-64 bg-slate-800 rounded-[2rem] flex items-center justify-center">
                <span className="material-symbols-outlined text-[100px] text-primary animate-pulse">scatter_plot</span>
              </div>
            </div>
            <div className="max-w-xs mx-auto space-y-4">
              <h2 className="text-3xl font-black text-white tracking-tight">The Neural Network for Global Talent.</h2>
              <p className="text-slate-400 font-medium leading-relaxed">
                Connect with the world's most sophisticated AI-driven hiring ecosystem.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
