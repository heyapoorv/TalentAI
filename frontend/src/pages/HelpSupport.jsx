import React from 'react';

export default function HelpSupport() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 w-full">
      {/* Header Section */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="font-h1 text-h1 text-slate-900 mb-4">How can we help you?</h1>
        <p className="font-body-md text-slate-500 mb-8">Search our knowledge base or get in touch with our support team.</p>
        <div className="relative max-w-lg mx-auto">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base" placeholder="Search for articles, guides, and FAQs..." type="text"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Links / Categories */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="font-label-md text-slate-900 uppercase tracking-wider text-xs mb-4">Categories</h3>
          
          <button className="w-full flex items-center gap-3 p-3 text-left bg-primary-container text-primary rounded-lg font-label-md transition-colors">
            <span className="material-symbols-outlined text-xl">account_circle</span>
            Account Settings
          </button>
          
          <button className="w-full flex items-center gap-3 p-3 text-left text-slate-600 hover:bg-slate-50 rounded-lg font-label-md transition-colors">
            <span className="material-symbols-outlined text-xl">work</span>
            Job Applications
          </button>
          
          <button className="w-full flex items-center gap-3 p-3 text-left text-slate-600 hover:bg-slate-50 rounded-lg font-label-md transition-colors">
            <span className="material-symbols-outlined text-xl">psychology</span>
            AI Matching
          </button>
        </div>

        {/* FAQs */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="font-h2 text-slate-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 flex justify-between items-center group">
              <h4 className="font-label-md text-slate-900">How is my AI Match Score calculated?</h4>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">expand_more</span>
            </div>
            <div className="p-4 bg-slate-50 text-sm text-slate-600 leading-relaxed">
              Our AI analyzes over 50 data points from your resume and profile, comparing them against the core requirements, preferred skills, and industry benchmarks set by the recruiter. We look at direct keyword matches, semantic understanding of your experience, and tenure.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center group">
              <h4 className="font-label-md text-slate-900">Can I update my resume after applying?</h4>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center group">
              <h4 className="font-label-md text-slate-900">How do I change my account from Candidate to Recruiter?</h4>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="mt-12 bg-indigo-600 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-600/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 max-w-lg">
          <h2 className="font-h2 text-white mb-2">Still need help?</h2>
          <p className="text-indigo-100 text-sm leading-relaxed">Our support team is available Monday through Friday, 9am to 6pm EST. We typically respond within 2 hours.</p>
        </div>
        
        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-3 bg-white text-indigo-600 font-label-md rounded-lg shadow-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">chat</span>
            Live Chat
          </button>
          <button className="flex-1 md:flex-none px-6 py-3 bg-indigo-700 text-white border border-indigo-500 font-label-md rounded-lg hover:bg-indigo-800 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">mail</span>
            Email Us
          </button>
        </div>
      </div>

    </div>
  );
}
