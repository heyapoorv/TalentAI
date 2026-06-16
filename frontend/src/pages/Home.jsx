import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';

const MagneticButton = ({ children, className, onClick }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={`relative inline-block ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

const FeatureCard = ({ icon, title, description, color, delay, colSpan }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, scale: 0.99 }}
      className={`group relative rounded-[2rem] p-8 md:p-10 border border-white/5 bg-white/[0.01] backdrop-blur-md overflow-hidden ${colSpan}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-8 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 shadow-xl shadow-black/20">
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
        <h3 className="text-2xl font-bold tracking-tight text-white mb-3">{title}</h3>
        <p className="text-slate-400 leading-relaxed font-medium mt-auto">{description}</p>
      </div>
    </motion.div>
  );
};

export default function Home() {
  const { scrollYProgress } = useScroll();
  const yBackground = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const yDashboard = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const scaleHero = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  return (
    <div className="bg-[#020617] min-h-screen text-slate-50 font-['Inter'] overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020617]">
        <motion.div style={{ y: yBackground }} className="absolute inset-0 w-full h-full">
          {/* Animated Orbs */}
          <motion.div 
            animate={{ scale: [1, 1.1, 1], x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/15 blur-[120px] mix-blend-screen opacity-70"
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], x: [0, -50, 0], y: [0, 50, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-600/10 blur-[120px] mix-blend-screen opacity-60"
          />
          <motion.div 
            animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
            className="absolute top-[30%] left-[50%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[120px] mix-blend-screen -translate-x-1/2 opacity-50"
          />
          
          {/* Animated Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-50"></div>
        </motion.div>
        
        {/* Noise overlay for rich texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.12] mix-blend-overlay z-10"></div>
      </div>

      {/* Sticky Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 w-full z-50 bg-[#020617]/40 backdrop-blur-2xl border-b border-white/[0.05] shadow-2xl shadow-black/20"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-500">
              <div className="w-full h-full bg-[#020617] rounded-[11px] flex items-center justify-center">
                <span className="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-tr from-indigo-400 to-cyan-300">psychology</span>
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">TalentAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#platform" className="hover:text-white transition-colors">Platform</a>
            <a href="#customers" className="hover:text-white transition-colors">Customers</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors hidden sm:block">Sign In</Link>
            <MagneticButton>
              <Link to="/register" className="px-5 py-2.5 rounded-full bg-white text-slate-900 text-[13px] font-bold hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105 inline-block">
                Start Free Trial
              </Link>
            </MagneticButton>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-48 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
        <motion.div style={{ opacity: opacityHero, scale: scaleHero }} className="max-w-4xl flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-[13px] font-semibold text-indigo-300 mb-10 backdrop-blur-xl shadow-2xl"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            Introducing TalentAI 2.0
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] mb-8"
          >
            The intelligent <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-300">
              hiring OS.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-2xl text-slate-400/90 max-w-2xl mb-12 leading-relaxed font-medium tracking-tight"
          >
            Scale your team at the speed of thought. Advanced neural matching, automated pipelines, and a gorgeous cinematic experience.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto z-20"
          >
            <MagneticButton>
              <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-slate-900 font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] group hover:scale-105 inline-flex">
                Start Hiring For Free
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </MagneticButton>
            <MagneticButton>
              <a href="#demo" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-xl group hover:scale-105 inline-flex">
                <span className="material-symbols-outlined text-lg text-slate-400 group-hover:text-white transition-colors">play_circle</span>
                Watch Demo
              </a>
            </MagneticButton>
          </motion.div>
        </motion.div>

        {/* Dashboard Parallax Preview */}
        <motion.div 
          style={{ y: yDashboard }}
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-24 w-full relative z-10"
        >
          {/* Decorative glows behind the dashboard */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="relative rounded-[2.5rem] p-2 md:p-3 bg-white/[0.02] border border-white/[0.05] backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent opacity-50 rounded-[2.5rem]"></div>
            
            <div className="relative rounded-[2rem] overflow-hidden bg-[#0a0f1d] border border-white/10 shadow-2xl flex flex-col h-[600px] md:h-[700px] w-full transform perspective-1000">
               {/* Mock Browser Topbar */}
               <div className="h-14 border-b border-white/5 flex items-center px-6 gap-4 bg-[#0a0f1d]/80 backdrop-blur-xl relative z-20">
                 <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-slate-700/50 hover:bg-rose-500/80 transition-colors cursor-pointer"></div>
                   <div className="w-3 h-3 rounded-full bg-slate-700/50 hover:bg-amber-500/80 transition-colors cursor-pointer"></div>
                   <div className="w-3 h-3 rounded-full bg-slate-700/50 hover:bg-emerald-500/80 transition-colors cursor-pointer"></div>
                 </div>
                 <div className="w-72 h-8 bg-white/5 rounded-lg border border-white/5 flex items-center px-3 gap-2 ml-4 mx-auto md:mx-4">
                   <span className="material-symbols-outlined text-[14px] text-slate-500">lock</span>
                   <span className="text-[11px] text-slate-500 font-medium">app.talentai.com</span>
                 </div>
               </div>
               
               {/* Mock Dashboard Content */}
               <div className="flex-1 flex p-6 gap-6 z-10 relative">
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none"></div>
                 
                 {/* Sidebar */}
                 <div className="w-56 flex-col gap-2 hidden lg:flex">
                   {[1,2,3,4,5,6].map((i) => (
                     <div key={i} className={`h-10 rounded-xl flex items-center px-4 gap-3 cursor-pointer transition-all ${i===1 ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5'}`}>
                       <div className={`w-5 h-5 rounded-md flex items-center justify-center ${i===1 ? 'text-indigo-400' : 'text-slate-500'}`}>
                         <span className="material-symbols-outlined text-[18px]">{i===1?'dashboard':i===2?'work':i===3?'group':i===4?'analytics':i===5?'settings':'help'}</span>
                       </div>
                       <div className={`h-2.5 rounded-full ${i===1?'w-20 bg-indigo-400':'w-24 bg-slate-600'}`}></div>
                     </div>
                   ))}
                 </div>
                 
                 {/* Main Content */}
                 <div className="flex-1 flex flex-col gap-6">
                   <div className="flex justify-between items-center mb-2">
                     <div>
                       <div className="h-6 w-48 bg-white/10 rounded-lg mb-2"></div>
                       <div className="h-3 w-32 bg-white/5 rounded-full"></div>
                     </div>
                     <div className="h-10 w-32 bg-white/10 rounded-xl"></div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        {color: 'indigo', val: '2,847', label: 'Total Candidates'},
                        {color: 'cyan', val: '98%', label: 'AI Match Accuracy'},
                        {color: 'purple', val: '45', label: 'Active Positions'}
                      ].map((stat, i) => (
                        <div key={i} className="h-36 rounded-3xl bg-white/[0.02] border border-white/5 p-6 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-colors">
                          <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${stat.color}-500/10 rounded-full blur-2xl group-hover:bg-${stat.color}-500/20 transition-all duration-500`}></div>
                          <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-${stat.color}-400 shadow-lg`}><span className="material-symbols-outlined text-[20px]">{i===0?'group':i===1?'memory':'work'}</span></div>
                          <div>
                            <div className="text-3xl font-black text-white mb-1 tracking-tight">{stat.val}</div>
                            <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
                          </div>
                        </div>
                      ))}
                   </div>
                   
                   <div className="flex-1 rounded-3xl bg-white/[0.02] border border-white/5 p-6 flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                       <div className="h-4 w-40 bg-white/10 rounded-full"></div>
                       <div className="flex gap-2">
                         <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
                         <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
                       </div>
                     </div>
                     <div className="space-y-4 flex-1">
                       {[1,2,3].map(i => (
                         <div key={i} className="h-20 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors flex items-center px-5 gap-5 cursor-pointer">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/10"></div>
                           <div className="flex-1">
                             <div className="h-3 w-32 bg-white/20 rounded-full mb-3"></div>
                             <div className="h-2 w-24 bg-white/10 rounded-full"></div>
                           </div>
                           <div className="hidden md:flex gap-2">
                             <div className="h-6 w-16 bg-white/5 rounded-full"></div>
                             <div className="h-6 w-20 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold">98% Match</div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Bento Grid Features Section */}
      <section className="relative z-10 py-32 md:py-48 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-slate-300 mb-6"
          >
            Capabilities
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black tracking-tighter mb-6"
          >
            Unfair advantages for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">modern teams.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-medium"
          >
            Everything you need to source, evaluate, and hire top talent in a single, seamlessly integrated platform.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
          <FeatureCard 
            colSpan="md:col-span-2"
            delay={0.1}
            icon="memory"
            title="Deep Neural Matching"
            description="Our advanced AI analyzes millions of data points to find candidates that perfectly align with your technical requirements, soft skills, and company culture."
            color="from-indigo-500/10 to-transparent"
          />
          <FeatureCard 
            colSpan="md:col-span-1"
            delay={0.2}
            icon="bolt"
            title="Lightning Fast"
            description="Built on a modern serverless edge architecture ensuring your hiring pipeline moves at the speed of light."
            color="from-cyan-500/10 to-transparent"
          />
          <FeatureCard 
            colSpan="md:col-span-1"
            delay={0.3}
            icon="insights"
            title="Real-time Insights"
            description="Actionable, beautiful analytics that help you optimize your hiring funnel instantly."
            color="from-purple-500/10 to-transparent"
          />
          <FeatureCard 
            colSpan="md:col-span-2"
            delay={0.4}
            icon="verified_user"
            title="Enterprise Security"
            description="Bank-grade encryption, granular role-based access control, and complete global compliance built right into the core of the platform."
            color="from-emerald-500/10 to-transparent"
          />
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 py-32 md:py-48 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] to-indigo-950/20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-indigo-500/20 blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-black mb-8 tracking-tighter"
          >
            Ready to build your <br/>dream team?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl text-slate-400 mb-12 font-medium"
          >
            Join thousands of forward-thinking companies.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <MagneticButton>
              <Link to="/register" className="inline-flex px-10 py-5 rounded-full bg-white text-slate-900 font-bold hover:bg-slate-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105 group items-center gap-3 text-lg">
                  Start Free Trial
                  <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </MagneticButton>
          </motion.div>
        </div>
      </section>
      
      {/* Premium Minimal Footer */}
      <footer className="border-t border-white/5 bg-[#020617] relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px]">
               <div className="w-full h-full bg-[#020617] rounded-[5px] flex items-center justify-center">
                 <span className="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-tr from-indigo-400 to-cyan-300 text-[14px]">psychology</span>
               </div>
            </div>
            <span className="font-bold text-slate-300 tracking-tight">TalentAI</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">© 2026 TalentAI, Inc. All rights reserved.</p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
