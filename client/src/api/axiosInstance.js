import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
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

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    const status = error.response?.status;

    // Handle specific error cases
    if (status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
    } else if (status === 429) {
      // Throttle 429 toast — show at most once per 5s
      const now = Date.now();
      if (!window._last429Toast || now - window._last429Toast > 5000) {
        toast.error('Too many requests. Please slow down.');
        window._last429Toast = now;
      }
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (message && status !== 429) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
