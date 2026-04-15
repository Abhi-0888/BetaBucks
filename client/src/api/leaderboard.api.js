import axios from './axiosInstance.js';

export const leaderboardAPI = {
  getLeaderboard: async (limit = 50) => {
    const response = await axios.get(`/api/leaderboard?limit=${limit}`);
    return response;
  },

  getMyRank: async () => {
    const response = await axios.get('/api/leaderboard/me');
    return response;
  },

  getRankHistory: async (days = 7) => {
    const response = await axios.get(`/api/leaderboard/history?days=${days}`);
    return response;
  },
};

export default leaderboardAPI;
