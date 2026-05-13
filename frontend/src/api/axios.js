import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration/unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Handle token refresh logic or auto-logout here
      // localStorage.removeItem('token');
      // window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);

export default api;
