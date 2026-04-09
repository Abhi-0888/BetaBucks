import axios from './axiosInstance.js';

export const analyticsAPI = {
  getPnLChart: async (days = 30) => {
    const response = await axios.get(`/api/analytics/pnl?days=${days}`);
    return response.data;
  },

  getTradeStats: async () => {
    const response = await axios.get('/api/analytics/trades');
    return response.data;
  },

  getSectorPerformance: async () => {
    const response = await axios.get('/api/analytics/sectors');
    return response.data;
  },
};

export default analyticsAPI;
