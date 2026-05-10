import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000', // Standardized to localhost for consistency with frontend
});

// This automatically attaches your token to every request!
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;