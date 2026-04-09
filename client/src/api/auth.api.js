import axios from './axiosInstance.js';

export const authAPI = {
  login: async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (name, email, password) => {
    const response = await axios.post('/api/auth/register', { name, email, password });
    return response.data;
  },

  getMe: async () => {
    const response = await axios.get('/api/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await axios.put('/api/auth/profile', data);
    return response.data;
  },

  resetBalance: async () => {
    const response = await axios.put('/api/auth/reset-balance');
    return response.data;
  },
};

export default authAPI;
