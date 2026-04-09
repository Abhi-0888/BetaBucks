import axios from './axiosInstance.js';

export const portfolioAPI = {
  getHoldings: async () => {
    const response = await axios.get('/api/portfolio');
    return response.data;
  },

  getSummary: async () => {
    const response = await axios.get('/api/portfolio/summary');
    return response.data;
  },

  getAllocation: async () => {
    const response = await axios.get('/api/portfolio/allocation');
    return response.data;
  },
};

export default portfolioAPI;
