import axios from './axiosInstance.js';

export const portfolioAPI = {
  getHoldings: async () => {
    const response = await axios.get('/api/portfolio');
    return response;
  },

  getSummary: async () => {
    const response = await axios.get('/api/portfolio/summary');
    return response;
  },

  getAllocation: async () => {
    const response = await axios.get('/api/portfolio/allocation');
    return response;
  },
};

export default portfolioAPI;
