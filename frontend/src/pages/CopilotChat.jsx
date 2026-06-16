import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

// ── Session type config ──────────────────────────────────────────────────────
const SESSION_TYPES = [
  {
    key: 'resume_only',
    label: 'Resume Review',
    icon: 'description',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    bg: 'rgba(99,102,241,0.08)',
    desc: 'Ask anything about your resume — skills, gaps, improvements',
    starters: [
      'What are my strongest technical skills?',
      'How can I improve my resume?',
      'What roles am I best suited for?',
    ],
  },
  {
    key: 'job_match',
    label: 'Job Match',
    icon: 'compare_arrows',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    bg: 'rgba(14,165,233,0.08)',
    desc: 'Compare your profile against a specific job opening',
    starters: [
      'How well do I match this job?',
      'What skills am I missing for this role?',
      'Is my experience level sufficient?',
    ],
  },
  {
    key: 'interview_prep',
    label: 'Interview Prep',
    icon: 'record_voice_over',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    bg: 'rgba(245,158,11,0.08)',
    desc: 'Get targeted interview questions and answer strategies',
    starters: [
      'Generate interview questions for this role',
      'How should I answer "Tell me about yourself"?',
      'What technical topics should I review?',
    ],
  },
  {
    key: 'career_advice',
    label: 'Career Advice',
    icon: 'trending_up',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #0ea5e9)',
    bg: 'rgba(16,185,129,0.08)',
    desc: 'Get strategic career guidance based on your background',
    starters: [
      'What career paths suit my background?',
      'How do I transition to a senior role?',
      'What skills should I learn next?',
    ],
  },
];

// ── Typing indicator component ───────────────────────────────────────────────
const TypingIndicator = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 18px', background: 'rgba(99,102,241,0.06)', borderRadius: '18px 18px 18px 4px', width: 'fit-content', border: '1px solid rgba(99,102,241,0.15)' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

// ── Message bubble component ─────────────────────────────────────────────────
const MessageBubble = ({ msg, sessionType }) => {
  const typeConfig = SESSION_TYPES.find(t => t.key === sessionType) || SESSION_TYPES[0];
  const isUser = msg.role === 'user';

  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
          background: typeConfig.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${typeConfig.color}30`,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'white' }}>smart_toy</span>
        </div>
      )}

      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '8px' }}>
        {/* Bubble */}
        <div style={{
          padding: '13px 17px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'white',
          color: isUser ? 'white' : '#1e293b',
          fontSize: '14px', lineHeight: '1.65',
          boxShadow: isUser
            ? '0 4px 16px rgba(99,102,241,0.25)'
            : '0 2px 12px rgba(0,0,0,0.06)',
          border: isUser ? 'none' : '1px solid rgba(226,232,240,0.8)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>

        {/* Timestamp */}
        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Suggestion chips */}
        {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                data-suggestion={s}
                onClick={() => {
                  const event = new CustomEvent('suggestion-click', { detail: s });
                  document.dispatchEvent(event);
                }}
                style={{
                  padding: '7px 14px', borderRadius: '999px', fontSize: '12px',
                  border: `1px solid ${typeConfig.color}40`, color: typeConfig.color,
                  background: typeConfig.bg, cursor: 'pointer', fontWeight: 600,
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = typeConfig.color;
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = typeConfig.bg;
                  e.currentTarget.style.color = typeConfig.color;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── New session modal ────────────────────────────────────────────────────────
const NewSessionModal = ({ jobs, onClose, onCreate, loading }) => {
  const [selectedType, setSelectedType] = useState('resume_only');
  const [selectedJob, setSelectedJob] = useState('');

  const needsJob = ['job_match', 'interview_prep'].includes(selectedType);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '480px', maxWidth: '90vw', boxShadow: '0 24px 80px rgba(0,0,0,0.16)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>New AI Chat</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Choose what you'd like to explore</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Session type grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {SESSION_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              style={{
                padding: '16px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                border: selectedType === t.key ? `2px solid ${t.color}` : '2px solid #f1f5f9',
                background: selectedType === t.key ? t.bg : 'white',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: selectedType === t.key ? t.gradient : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: selectedType === t.key ? 'white' : '#94a3b8' }}>{t.icon}</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: selectedType === t.key ? t.color : '#334155', marginBottom: '3px' }}>{t.label}</div>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Job selector (for job_match / interview_prep) */}
        {needsJob && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Job <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedJob}
              onChange={e => setSelectedJob(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', background: 'white', outline: 'none' }}
            >
              <option value="">Choose a job...</option>
              {jobs.map(j => (
                <option key={j._id || j.id} value={j._id || j.id}>{j.role} — {j.company}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={() => onCreate(selectedType, needsJob ? selectedJob : null)}
          disabled={loading || (needsJob && !selectedJob)}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            opacity: (loading || (needsJob && !selectedJob)) ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Creating...' : 'Start Chat'}
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════

export default function CopilotChat() {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const typeConfig = activeSession
    ? SESSION_TYPES.find(t => t.key === activeSession.session_type) || SESSION_TYPES[0]
    : SESSION_TYPES[0];

  // ── Load sessions ──────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await api.get('/copilot/sessions');
      setSessions(res.data || []);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // ── Load jobs for modal ────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data?.jobs || res.data || []);
    } catch (err) {
      console.error('Failed to load jobs', err);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadJobs();
  }, [loadSessions, loadJobs]);

  // ── Scroll to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Suggestion chip click listener ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      setInput(e.detail);
      inputRef.current?.focus();
    };
    document.addEventListener('suggestion-click', handler);
    return () => document.removeEventListener('suggestion-click', handler);
  }, []);

  // ── Select session and load messages ──────────────────────────────────
  const selectSession = async (sess) => {
    setActiveSession(sess);
    setMessagesLoading(true);
    try {
      const res = await api.get(`/copilot/sessions/${sess._id || sess.id}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Failed to load messages', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  // ── Create new session ─────────────────────────────────────────────────
  const createSession = async (sessionType, jobId) => {
    setModalLoading(true);
    try {
      const res = await api.post('/copilot/sessions', {
        session_type: sessionType,
        job_id: jobId || undefined,
      });
      const newSession = res.data;
      setSessions(prev => [newSession, ...prev]);
      setShowModal(false);
      setMessages([]);
      setActiveSession(newSession);
    } catch (err) {
      console.error('Failed to create session', err);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Delete session ─────────────────────────────────────────────────────
  const deleteSession = async (e, sessId) => {
    e.stopPropagation();
    try {
      await api.delete(`/copilot/sessions/${sessId}`);
      setSessions(prev => prev.filter(s => (s._id || s.id) !== sessId));
      if ((activeSession?._id || activeSession?.id) === sessId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  // ── Send message ───────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || !activeSession || sending) return;

    const question = input.trim();
    setInput('');
    setSending(true);

    const sessionId = activeSession._id || activeSession.id;

    // Optimistically add user message
    const tempUserMsg = {
      _id: `temp_${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      const res = await api.post(`/copilot/sessions/${sessionId}/messages`, { message: question });
      const aiMsg = res.data;
      setMessages(prev => [...prev, aiMsg]);

      // Update session updated_at + message_count in sidebar
      setSessions(prev =>
        prev.map(s =>
          (s._id || s.id) === sessionId
            ? { ...s, updated_at: new Date().toISOString(), message_count: (s.message_count || 0) + 2 }
            : s
        )
      );
    } catch (err) {
      console.error('Failed to send message', err);
      const errMsg = {
        _id: `err_${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Please try again.',
        suggestions: [],
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStarter = (q) => {
    setInput(q);
    inputRef.current?.focus();
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .session-item:hover .del-btn { opacity: 1 !important; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 8px 24px rgba(99,102,241,0.4) !important; }
        .send-btn:active:not(:disabled) { transform: scale(0.97); }
        .copilot-input:focus { outline: none; border-color: rgba(99,102,241,0.4) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important; }
      `}</style>

      <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(226,232,240,0.8)' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside style={{ width: '280px', flexShrink: 0, background: 'white', borderRight: '1px solid rgba(226,232,240,0.6)', display: 'flex', flexDirection: 'column', padding: '20px 12px' }}>
          {/* Header */}
          <div style={{ padding: '4px 8px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>smart_toy</span>
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>AI Copilot</h2>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontWeight: 600 }}>Your career assistant</p>
              </div>
            </div>
            <button
              id="new-copilot-chat-btn"
              onClick={() => setShowModal(true)}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                boxShadow: '0 4px 12px rgba(99,102,241,0.25)', transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              New Chat
            </button>
          </div>

          {/* Session list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sessionsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: '56px', borderRadius: '10px', background: '#f1f5f9', margin: '2px 4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', opacity: 0.4 }}>chat_bubble_outline</span>
                <p style={{ fontSize: '12px', fontWeight: 600 }}>No chats yet</p>
                <p style={{ fontSize: '11px', marginTop: '4px' }}>Start a new chat above</p>
              </div>
            ) : (
              sessions.map(sess => {
                const tc = SESSION_TYPES.find(t => t.key === sess.session_type) || SESSION_TYPES[0];
                const sessId = sess._id || sess.id;
                const isActive = (activeSession?._id || activeSession?.id) === sessId;
                return (
                  <div
                    key={sessId}
                    className="session-item"
                    onClick={() => selectSession(sess)}
                    style={{
                      padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                      background: isActive ? tc.bg : 'transparent',
                      border: isActive ? `1px solid ${tc.color}20` : '1px solid transparent',
                      transition: 'all 0.15s', position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: isActive ? tc.gradient : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: isActive ? 'white' : '#94a3b8' }}>{tc.icon}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: isActive ? tc.color : '#334155', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sess.name}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontWeight: 500 }}>{sess.message_count || 0} messages</p>
                      </div>
                    </div>
                    {/* Delete button */}
                    <button
                      className="del-btn"
                      onClick={e => deleteSession(e, sessId)}
                      style={{ position: 'absolute', top: '8px', right: '8px', opacity: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', transition: 'opacity 0.15s', borderRadius: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── CHAT AREA ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', minWidth: 0 }}>

          {activeSession ? (
            <>
              {/* Chat header */}
              <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: typeConfig.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${typeConfig.color}30` }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>{typeConfig.icon}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{activeSession.name}</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: 600 }}>{typeConfig.label} • {activeSession.message_count || 0} messages</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  {activeSession.resume_id && (
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>
                      📄 Resume
                    </span>
                  )}
                  {activeSession.job_id && (
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.15)' }}>
                      💼 Job
                    </span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                {messagesLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ height: '60px', borderRadius: '14px', background: 'rgba(226,232,240,0.6)', animation: 'pulse 1.5s ease-in-out infinite', width: i % 2 === 0 ? '60%' : '80%', alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start' }} />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  /* Empty state — starter prompts */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '20px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: typeConfig.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: `0 8px 24px ${typeConfig.color}30` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'white' }}>{typeConfig.icon}</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>{typeConfig.label}</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px', maxWidth: '380px', lineHeight: 1.6 }}>{typeConfig.desc}. Try one of these to get started:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '420px' }}>
                      {typeConfig.starters.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleStarter(s)}
                          style={{
                            padding: '14px 20px', borderRadius: '12px', textAlign: 'left',
                            border: `1.5px solid ${typeConfig.color}20`, background: 'white',
                            color: '#334155', fontSize: '14px', cursor: 'pointer', fontWeight: 500,
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = typeConfig.color; e.currentTarget.style.background = typeConfig.bg; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = `${typeConfig.color}20`; e.currentTarget.style.background = 'white'; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: typeConfig.color, flexShrink: 0 }}>arrow_forward</span>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => (
                      <MessageBubble key={msg._id} msg={msg} sessionType={activeSession.session_type} />
                    ))}
                    {isTyping && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: typeConfig.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'white' }}>smart_toy</span>
                        </div>
                        <TypingIndicator />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input area */}
              <div style={{ padding: '16px 24px', background: 'white', borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    id="copilot-input"
                    className="copilot-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask about your ${activeSession.session_type === 'resume_only' ? 'resume' : activeSession.session_type === 'job_match' ? 'job fit' : activeSession.session_type === 'interview_prep' ? 'interview prep' : 'career'}...`}
                    rows={1}
                    style={{
                      flex: 1, padding: '13px 16px', borderRadius: '12px', resize: 'none',
                      border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b',
                      lineHeight: '1.5', maxHeight: '120px', overflow: 'auto',
                      fontFamily: 'inherit', background: '#f8fafc', transition: 'all 0.2s',
                    }}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <button
                    id="copilot-send-btn"
                    className="send-btn"
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    style={{
                      width: '46px', height: '46px', borderRadius: '12px', border: 'none',
                      background: input.trim() && !sending ? typeConfig.gradient : '#e2e8f0',
                      color: input.trim() && !sending ? 'white' : '#94a3b8',
                      cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: 'all 0.2s', boxShadow: input.trim() && !sending ? `0 4px 12px ${typeConfig.color}30` : 'none',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '8px 0 0', textAlign: 'center', fontWeight: 500 }}>
                  Press Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (

            /* ── NO SESSION SELECTED — Hero / Onboarding ─────────────── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '22px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 12px 32px rgba(99,102,241,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'white' }}>smart_toy</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '10px', letterSpacing: '-0.02em' }}>AI Career Copilot</h1>
              <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '440px', lineHeight: 1.7, marginBottom: '36px' }}>
                Your personal AI career advisor. Ask about your resume, analyze job fit, prepare for interviews, or plan your next career move.
              </p>

              {/* Feature cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 220px)', gap: '12px', marginBottom: '32px' }}>
                {SESSION_TYPES.map(t => (
                  <div
                    key={t.key}
                    onClick={() => setShowModal(true)}
                    style={{
                      padding: '18px', borderRadius: '14px', background: 'white',
                      border: '1.5px solid #f1f5f9', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${t.color}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: t.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>{t.icon}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{t.label}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{t.desc}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: '14px 32px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.3)', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.3)'; }}
              >
                Start Your First Chat →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <NewSessionModal
          jobs={jobs}
          onClose={() => setShowModal(false)}
          onCreate={createSession}
          loading={modalLoading}
        />
      )}
    </>
  );
}
