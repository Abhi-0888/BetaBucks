import { getLeaderboard, getUserRank, getUserRankHistory } from '../services/leaderboard.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// Get top leaderboard
export const getTopLeaderboard = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;
  
  const leaderboard = await getLeaderboard(parseInt(limit));

  res.json({
    success: true,
    data: leaderboard,
    meta: {
      total: leaderboard.length,
      generatedAt: new Date().toISOString(),
    },
  });
});

// Get current user's rank
export const getMyRank = asyncHandler(async (req, res) => {
  const userId = req.userId;
  
  const rankData = await getUserRank(userId);

  if (!rankData) {
    return res.json({
      success: true,
      data: {
        myRank: null,
        totalParticipants: 0,
        percentile: 0,
        nearbyRanks: [],
      },
    });
  }

  res.json({
    success: true,
    data: rankData,
  });
});

// Get user's rank history
export const getRankHistory = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const userId = req.userId;
  
  const history = await getUserRankHistory(userId, parseInt(days));

  res.json({
    success: true,
    data: history.map(h => ({
      date: h.snapshotAt,
      rank: h.rank,
      totalPortfolioValue: h.totalPortfolioValue,
      pnlPercent: h.pnlPercent,
    })),
  });
});

export default {
  getTopLeaderboard,
  getMyRank,
  getRankHistory,
};
