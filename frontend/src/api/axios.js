import axios from 'axios';

// Reads from .env (VITE_API_BASE_URL) at build time — falls back to localhost for dev
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s — allow headroom for LLM calls
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach JWT + correlation ID ────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // Forward a client-generated request ID so logs correlate end-to-end
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: global error normalization ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;

      // Auto-logout on 401 (token expired / invalid)
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect only if not already on the login page
        if (!window.location.pathname.startsWith('/')) {
          window.location.href = '/';
        }
      }

      // Normalize 422 validation error arrays into a single string
      if (status === 422) {
        const detail = error.response.data?.detail;
        if (Array.isArray(detail)) {
          error.response.data.detail = detail
            .map((d) => `${d.loc?.slice(-1)[0] ?? 'field'}: ${d.msg}`)
            .join(', ');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
