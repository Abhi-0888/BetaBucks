import axios from './axiosInstance.js';

export const authAPI = {
  login: async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    return response;
  },

  register: async (name, email, password) => {
    const response = await axios.post('/api/auth/register', { name, email, password });
    return response;
  },

  getMe: async () => {
    const response = await axios.get('/api/auth/me');
    return response;
  },

  updateProfile: async (data) => {
    const response = await axios.put('/api/auth/profile', data);
    return response;
  },

  resetBalance: async () => {
    const response = await axios.put('/api/auth/reset-balance');
    return response;
  },
};

export default authAPI;
