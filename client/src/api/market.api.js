import axios from './axiosInstance.js';

export const marketAPI = {
  getStocks: async (params = {}) => {
    const { page = 1, limit = 20, sector, search, sortBy, order } = params;
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (sector) queryParams.append('sector', sector);
    if (search) queryParams.append('search', search);
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (order) queryParams.append('order', order);
    
    const response = await axios.get(`/api/market/stocks?${queryParams}`);
    return response.data;
  },

  getStockDetail: async (symbol) => {
    const response = await axios.get(`/api/market/stocks/${symbol}`);
    return response.data;
  },

  getStockHistory: async (symbol, range = '1d', interval = '5m') => {
    const response = await axios.get(`/api/market/stocks/${symbol}/history?range=${range}&interval=${interval}`);
    return response.data;
  },

  searchStocks: async (query) => {
    const response = await axios.get(`/api/market/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getNifty50: async () => {
    const response = await axios.get('/api/market/nifty50');
    return response.data;
  },

  getSectors: async () => {
    const response = await axios.get('/api/market/sectors');
    return response.data;
  },
};

export default marketAPI;
