import axios from './axiosInstance.js';

export const tradeAPI = {
  buyStock: async (symbol, quantity) => {
    const response = await axios.post('/api/trade/buy', { symbol, quantity });
    return response;
  },

  sellStock: async (symbol, quantity) => {
    const response = await axios.post('/api/trade/sell', { symbol, quantity });
    return response;
  },

  getTradeHistory: async (params = {}) => {
    const { page = 1, limit = 20, type } = params;
    const queryParams = new URLSearchParams();
    queryParams.append('page', page);
    queryParams.append('limit', limit);
    if (type) queryParams.append('type', type);
    
    const response = await axios.get(`/api/trade/history?${queryParams}`);
    return response;
  },
};

export default tradeAPI;
