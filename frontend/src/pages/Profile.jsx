import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    bio: '',
    portfolio_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        location: user.location || '',
        bio: user.bio || '',
        portfolio_url: user.portfolio_url || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.put('/auth/me', formData);
      setUser(response.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const userName = user?.name || user?.email?.split('@')[0] || "User";
  const userRole = user?.role || "candidate";

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMessage({ type: 'success', text: 'Photo updated! (Simulation)' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 w-full animate-in fade-in duration-700">
      <input 
        type="file" 
        id="photo-upload" 
        className="hidden" 
        accept="image/*" 
        onChange={handlePhotoChange} 
      />
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Profile Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your professional identity and preferences.</p>
        </div>
        <div className="flex items-center gap-4">
           {message && (
             <div className={`px-4 py-2 rounded-xl text-xs font-bold animate-in slide-in-from-right-4 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
               {message.text}
             </div>
           )}
           <button 
             onClick={handleSave}
             disabled={loading}
             className="bg-slate-900 hover:bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50"
           >
             {loading ? 'Saving...' : 'Save Changes'}
           </button>
        </div>
      </div>

      {/* Profile Picture */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex items-center gap-8 group">
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-slate-50 shadow-inner group-hover:rotate-3 transition-transform duration-500">
            <img src={`https://ui-avatars.com/api/?name=${userName}&background=random&size=200`} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <button 
            onClick={() => document.getElementById('photo-upload').click()}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary transition-all shadow-lg"
          >
            <span className="material-symbols-outlined text-lg">photo_camera</span>
          </button>
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">Profile Picture</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4 font-medium">Upload a professional photo to increase your visibility.</p>
          <div className="flex gap-4">
            <label 
              htmlFor="photo-upload"
              className="text-xs font-black uppercase tracking-widest text-primary hover:text-indigo-700 transition-colors cursor-pointer"
            >
              Change Photo
            </label>
            <button className="text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors">Delete</button>
          </div>
        </div>
      </div>

      {/* Personal Information Form */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Personal Information</h3>
          <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">{userRole} account</span>
        </div>
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-primary transition-colors">Full Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold text-slate-700" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email (Primary Identity)</label>
              <input 
                type="email" 
                defaultValue={user?.email || ""} 
                className="w-full px-6 py-4 bg-slate-100 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-400 cursor-not-allowed" 
                readOnly 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-primary transition-colors">Location</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">location_on</span>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="City, Country"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold text-slate-700" 
                />
              </div>
            </div>
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-primary transition-colors">Portfolio / LinkedIn</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                <input 
                  type="url" 
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData({...formData, portfolio_url: e.target.value})}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold text-slate-700" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-primary transition-colors">Professional Bio</label>
            <textarea 
              rows="4"
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              placeholder="Tell us about your professional background and goals..."
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-medium text-slate-700 resize-none" 
            />
          </div>
        </div>
      </div>

      {/* Resume Section (Candidate Only) */}
      {userRole === 'candidate' && (
        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50">
            <h3 className="text-xl font-black text-slate-900">Career Documents</h3>
          </div>
          <div className="p-8">
            <Link to="/upload-resume" className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary transition-all group">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">description</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Your Master Resume</p>
                    <p className="text-xs text-slate-500 font-medium">Used for AI matching across all job applications.</p>
                  </div>
               </div>
               <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
