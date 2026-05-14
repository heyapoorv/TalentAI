import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isRecruiter = user?.role === 'recruiter';
  const portalName = isRecruiter ? "Recruiter Portal" : "Candidate Portal";
  const userName = user?.name || user?.email?.split('@')[0] || "User";
  const userRole = isRecruiter ? "Recruiter" : "Candidate";

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  const recruiterLinks = [
    { name: 'Dashboard', icon: 'dashboard', path: '/recruiter-dashboard' },
    { name: 'Jobs', icon: 'work', path: '/recruiter-jobs' },
    { name: 'Applicants', icon: 'group', path: '/applicants' },
    { name: 'Post Job', icon: 'add_box', path: '/jobs/new' },
  ];

  const candidateLinks = [
    { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { name: 'Resume', icon: 'description', path: '/upload-resume' },
    { name: 'Jobs', icon: 'work', path: '/jobs' },
    { name: 'Applications', icon: 'send', path: '/applications' },
  ];

  const links = isRecruiter ? recruiterLinks : candidateLinks;

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        const formatted = res.data.map(n => ({
          id: n._id || n.id,
          title: n.title,
          text: n.message,
          icon: n.type === 'success' ? 'verified' : (n.type === 'warning' ? 'warning' : 'info'),
          time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          is_read: n.is_read
        }));
        setNotifications(formatted);
      } catch (e) {
        console.error("Notifications fetch failed", e);
      }
    };
    
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const clearNotifications = async () => {
    // In a real app, you'd mark all as read in DB
    setNotifications([]);
    setShowNotifications(false);
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error("Could not mark as read", e);
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col md:flex-row font-['Inter']">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200 sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">psychology</span>
          </div>
          <span className="font-bold text-slate-900">TalentAI</span>
        </div>
        <button onClick={toggleSidebar} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
          <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed left-0 top-0 h-screen w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col p-4 z-[60]
        transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="hidden md:flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">TalentAI</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
              {isRecruiter ? "Employer Portal" : "Candidate Portal"}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${location.pathname === link.path
                  ? 'bg-primary/5 text-primary'
                  : 'text-slate-500 hover:text-primary hover:bg-slate-50'
                }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${location.pathname === link.path ? 'FILL' : ''}`}>{link.icon}</span>
              <span>{link.name}</span>
            </Link>
          ))}
          <Link
            to="/profile"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${location.pathname === '/profile' ? 'bg-primary/5 text-primary' : 'text-slate-500 hover:text-primary hover:bg-slate-50'}`}
          >
            <span className={`material-symbols-outlined text-[22px] ${location.pathname === '/profile' ? 'FILL' : ''}`}>person</span>
            <span>Profile</span>
          </Link>
        </nav>

        <div className="mt-auto pt-6 space-y-2">
          {isRecruiter && (
            <Link to="/jobs/new" className="flex items-center justify-center gap-2 w-full bg-primary text-white py-3.5 rounded-xl font-bold mb-4 hover:bg-primary-container transition-all active:scale-95 shadow-lg shadow-primary/25">
              <span className="material-symbols-outlined text-sm">add</span> Post Job
            </Link>
          )}
          <Link to="/help" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-primary transition-colors font-medium">
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
            <span>Support</span>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-600 transition-colors font-medium">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Top Navigation Bar (Desktop) */}
        <header className="hidden md:flex sticky top-0 w-full justify-between items-center px-8 h-20 bg-white/80 backdrop-blur-md z-40 border-b border-slate-100">
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 w-96 group focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/20 transition-all">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-sm text-slate-600 w-full placeholder-slate-400 focus:outline-none" placeholder="Search candidates, jobs, or skills..." type="text" />
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-primary rounded-xl transition-all relative"
              >
                <span className="material-symbols-outlined text-[24px]">notifications</span>
                {notifications.some(n => !n.is_read) && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white ring-2 ring-rose-500/10"></span>}
              </button>

              {showNotifications && (
                <div className="absolute top-14 right-0 w-80 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Notifications</h4>
                    <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest">{notifications.filter(n => !n.is_read).length} New</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-16 text-center text-sm text-slate-400 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl opacity-20">notifications_off</span>
                        </div>
                        <p className="font-bold text-[10px] uppercase tracking-[0.2em]">All caught up</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => markAsRead(n.id)}
                          className={`p-5 border-b border-slate-50 hover:bg-slate-50/80 transition-all cursor-pointer group relative ${!n.is_read ? 'bg-primary/5' : ''}`}
                        >
                          {!n.is_read && <div className="absolute top-6 right-6 w-1.5 h-1.5 bg-primary rounded-full"></div>}
                          <div className="flex gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm ${!n.is_read ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-primary group-hover:text-white'}`}>
                              <span className="material-symbols-outlined text-[20px]">{n.icon || 'notifications'}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-black text-xs text-slate-900 mb-1 group-hover:text-primary transition-colors">{n.title}</p>
                              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{n.text}</p>
                              <p className="text-[9px] text-slate-400 font-black mt-2 uppercase tracking-widest">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-4 bg-white border-t border-slate-50 text-center">
                      <button
                        onClick={clearNotifications}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="h-10 w-[1px] bg-slate-200/60 mx-1"></div>

              <Link to="/profile" className="flex items-center gap-3 cursor-pointer group p-1 pr-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                <img alt="User avatar" className="w-10 h-10 rounded-xl border-2 border-white shadow-md shadow-slate-200/50" src={`https://ui-avatars.com/api/?name=${userName}&background=4f46e5&color=fff&bold=true`} />
                <div className="hidden lg:block">
                  <p className="text-xs font-black text-slate-900 capitalize tracking-tight">{userName}</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{userRole}</p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
