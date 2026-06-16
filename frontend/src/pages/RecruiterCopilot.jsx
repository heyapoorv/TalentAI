import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

// ── Quick action templates ──────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Compare Top Candidates', icon: 'compare', prompt: 'Compare the top 5 candidates for this role across skills, experience, and culture fit.', color: '#6366f1', desc: 'Side-by-side analysis of the top applicant pool.' },
  { label: 'Generate Interview Plan', icon: 'assignment', prompt: 'Create a structured interview plan for the top candidate based on their specific resume gaps.', color: '#0ea5e9', desc: 'Targeted questions to uncover risks.' },
  { label: 'Hiring Recommendations', icon: 'psychology', prompt: 'Generate explicit hiring recommendations (Yes/No/Maybe) for the top 3 candidates and outline their risks.', color: '#10b981', desc: 'Data-driven verdicts on applicants.' },
  { label: 'Generate Scorecard', icon: 'fact_check', prompt: 'Generate an interview scorecard template for evaluating the top candidates.', color: '#f59e0b', desc: 'Custom rubric based on the JD.' },
  { label: 'Summarize Red Flags', icon: 'flag', prompt: 'Identify any potential red flags, flight risks, or major skill gaps across the entire applicant pool.', color: '#ef4444', desc: 'Risk assessment across the board.' },
  { label: 'Draft Outreach', icon: 'mail', prompt: 'Draft a professional outreach message to invite the top candidate for an interview, personalized to their background.', color: '#8b5cf6', desc: 'Personalized email templates.' },
];

const TypingIndicator = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 18px', background: 'rgba(99,102,241,0.06)', borderRadius: '18px 18px 18px 4px', width: 'fit-content', border: '1px solid rgba(99,102,241,0.15)' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
      {!isUser && (
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'white' }}>support_agent</span>
        </div>
      )}
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '8px' }}>
        <div style={{
          padding: '13px 17px', borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'white',
          color: isUser ? 'white' : '#1e293b', fontSize: '14px', lineHeight: '1.7',
          boxShadow: isUser ? '0 4px 16px rgba(99,102,241,0.25)' : '0 2px 12px rgba(0,0,0,0.06)',
          border: isUser ? 'none' : '1px solid rgba(226,232,240,0.8)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {!isUser && msg.suggestions?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {msg.suggestions.map((s, i) => (
              <button key={i} onClick={() => { const ev = new CustomEvent('rec-suggestion-click', { detail: s }); document.dispatchEvent(ev); }}
                style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '12px', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', background: 'rgba(99,102,241,0.06)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.color = '#6366f1'; }}
              >{s}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function RecruiterCopilot() {
  const { user } = useContext(AuthContext);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [jobStats, setJobStats] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load data ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [jobsRes, sessRes] = await Promise.all([
        api.get('/jobs'),
        api.get('/copilot/sessions'),
      ]);
      // /jobs returns { jobs: [], total, page, ... }
      const allJobs = jobsRes.data?.jobs || jobsRes.data || [];
      setJobs(allJobs);
      setSessions(sessRes.data || []);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const handler = e => { setInput(e.detail); inputRef.current?.focus(); };
    document.addEventListener('rec-suggestion-click', handler);
    return () => document.removeEventListener('rec-suggestion-click', handler);
  }, []);

  // Load job stats when job selected
  useEffect(() => {
    if (!selectedJobId) { setJobStats(null); return; }
    const fetchStats = async () => {
      try {
        const res = await api.get(`/jobs/${selectedJobId}/applicants`);
        const apps = Array.isArray(res.data) ? res.data : (res.data?.applicants || []);
        setJobStats({
          total: apps.length,
          avgScore: apps.length ? Math.round(apps.reduce((s, a) => s + (a.match_score || 0), 0) / apps.length) : 0,
          top: apps.length ? Math.max(...apps.map(a => a.match_score || 0)) : 0,
        });
      } catch { setJobStats(null); }
    };
    fetchStats();
  }, [selectedJobId]);

  // ── Session actions ───────────────────────────────────────────────────
  const startSession = async () => {
    if (!selectedJobId || creatingSession) return;
    setCreatingSession(true);
    try {
      const job = jobs.find(j => (j._id || j.id) === selectedJobId);
      const res = await api.post('/copilot/sessions', {
        session_type: 'recruiter_review',
        job_id: selectedJobId,
        name: `Review: ${job?.role || 'Job'}`,
      });
      const sess = res.data;
      setSessions(prev => [sess, ...prev]);
      setActiveSession(sess);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create session', err);
    } finally {
      setCreatingSession(false);
    }
  };

  const selectSession = async (sess) => {
    setActiveSession(sess);
    if (sess.job_id) setSelectedJobId(sess.job_id);
    try {
      const res = await api.get(`/copilot/sessions/${sess._id || sess.id}/messages`);
      setMessages(res.data || []);
    } catch { setMessages([]); }
  };

  const deleteSession = async (e, sessId) => {
    e.stopPropagation();
    try {
      await api.delete(`/copilot/sessions/${sessId}`);
      setSessions(prev => prev.filter(s => (s._id || s.id) !== sessId));
      if ((activeSession?._id || activeSession?.id) === sessId) { setActiveSession(null); setMessages([]); }
    } catch { }
  };

  // ── Send message ──────────────────────────────────────────────────────
  const sendMessage = async (msgText) => {
    const question = (msgText || input).trim();
    if (!question || !activeSession || sending) return;
    setInput('');
    setSending(true);

    const sessionId = activeSession._id || activeSession.id;
    const tempMsg = { _id: `t_${Date.now()}`, session_id: sessionId, role: 'user', content: question, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setIsTyping(true);

    try {
      const res = await api.post(`/copilot/sessions/${sessionId}/messages`, { message: question });
      setMessages(prev => [...prev, res.data]);
      setSessions(prev => prev.map(s => (s._id || s.id) === sessionId ? { ...s, updated_at: new Date().toISOString(), message_count: (s.message_count || 0) + 2 } : s));
    } catch {
      setMessages(prev => [...prev, { _id: `e_${Date.now()}`, session_id: sessionId, role: 'assistant', content: 'Sorry, something went wrong. Please try again.', created_at: new Date().toISOString() }]);
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const recruiterSessions = sessions.filter(s => s.session_type === 'recruiter_review');
  const selectedJob = jobs.find(j => (j._id || j.id) === selectedJobId);

  return (
    <>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .rec-session-item:hover .rec-del-btn { opacity: 1 !important; }
        .qa-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1) !important; }
      `}</style>

      <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(226,232,240,0.8)' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside style={{ width: '300px', flexShrink: 0, background: 'white', borderRight: '1px solid rgba(226,232,240,0.6)', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'white' }}>support_agent</span>
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Recruiter Copilot</h2>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontWeight: 600 }}>AI-powered hiring assistant</p>
              </div>
            </div>

            {/* Job selector */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Job</label>
              <select
                id="recruiter-job-select"
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', color: '#1e293b', background: 'white', outline: 'none' }}
              >
                <option value="">Select a job...</option>
                {jobs.map(j => (
                  <option key={j._id || j.id} value={j._id || j.id}>{j.role} — {j.company}</option>
                ))}
              </select>
            </div>

            {/* Job stats bar */}
            {jobStats && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: 'Applicants', value: jobStats.total, icon: 'group' },
                  { label: 'Avg Score', value: `${jobStats.avgScore}%`, icon: 'analytics' },
                  { label: 'Top Score', value: `${Math.round(jobStats.top)}%`, icon: 'emoji_events' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '8px', borderRadius: '8px', background: '#f8fafc', textAlign: 'center' }}>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#6366f1', margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: 600 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              id="recruiter-start-session-btn"
              onClick={startSession}
              disabled={!selectedJobId || creatingSession}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                background: selectedJobId ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f1f5f9',
                color: selectedJobId ? 'white' : '#94a3b8', fontSize: '13px', fontWeight: 700, cursor: selectedJobId ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {creatingSession ? 'Starting...' : '+ Start New Review Session'}
            </button>
          </div>

          {/* Session list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px' }}>Past Sessions</p>
            {sessionsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: '52px', borderRadius: '10px', background: '#f1f5f9', margin: '4px 0', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))
            ) : recruiterSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', opacity: 0.4 }}>folder_open</span>
                <p style={{ fontSize: '12px', fontWeight: 600 }}>No sessions yet</p>
              </div>
            ) : (
              recruiterSessions.map(sess => {
                const sessId = sess._id || sess.id;
                const isActive = (activeSession?._id || activeSession?.id) === sessId;
                return (
                  <div key={sessId} className="rec-session-item" onClick={() => selectSession(sess)}
                    style={{ padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px', background: isActive ? 'rgba(99,102,241,0.07)' : 'transparent', border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent', transition: 'all 0.15s', position: 'relative' }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: 700, color: isActive ? '#6366f1' : '#334155', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '20px' }}>{sess.name}</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontWeight: 500 }}>{sess.message_count || 0} messages</p>
                    <button className="rec-del-btn" onClick={e => deleteSession(e, sessId)}
                      style={{ position: 'absolute', top: '10px', right: '8px', opacity: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', transition: 'opacity 0.15s' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── MAIN AREA ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', minWidth: 0 }}>

          {activeSession ? (
            <>
              {/* Header */}
              <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{activeSession.name}</h3>
                  {selectedJob && <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: 600 }}>{selectedJob.company} • {selectedJob.location || 'Remote'}</p>}
                </div>
                {jobStats && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>
                      {jobStats.total} Applicants
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}>
                      Top: {Math.round(jobStats.top)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Action Hub */}
              <div style={{ padding: '24px', background: 'white', borderBottom: '1px solid rgba(226,232,240,0.4)', flexShrink: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>One-Click Workflows</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {QUICK_ACTIONS.map(qa => (
                    <button
                      key={qa.label}
                      className="qa-btn"
                      onClick={() => sendMessage(qa.prompt)}
                      disabled={sending}
                      style={{
                        padding: '16px', borderRadius: '16px', border: `1px solid ${qa.color}25`,
                        background: `${qa.color}08`, color: qa.color, textAlign: 'left',
                        cursor: sending ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{qa.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 800 }}>{qa.label}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, lineHeight: 1.4 }}>{qa.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                {messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'white' }}>support_agent</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Recruiter Copilot Ready</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '380px', lineHeight: 1.6 }}>
                      I have analyzed all applicants for this job. Click a quick action above or ask me anything about your candidates.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => <MessageBubble key={msg._id} msg={msg} />)}
                    {isTyping && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'white' }}>support_agent</span>
                        </div>
                        <TypingIndicator />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Removed - Action Driven Only */}
            </>
          ) : (
            /* Hero state */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '22px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 12px 32px rgba(99,102,241,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'white' }}>support_agent</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '10px' }}>Recruiter AI Copilot</h1>
              <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '440px', lineHeight: 1.7, marginBottom: '32px' }}>
                Select a job from the sidebar and start a review session. I'll analyze all applicants and help you make faster, smarter hiring decisions.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '560px' }}>
                {QUICK_ACTIONS.slice(0, 3).map(qa => (
                  <div key={qa.label} style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1.5px solid #f1f5f9', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: qa.color, display: 'block', marginBottom: '8px' }}>{qa.icon}</span>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#334155', margin: 0 }}>{qa.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
