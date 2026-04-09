import { User, Stock, Portfolio, Leaderboard } from '../models/index.js';
import { calcTotalPortfolioValue } from '../utils/tradeCalculations.js';

// Calculate and update leaderboard
export const updateLeaderboard = async () => {
  try {
    console.log('🏆 Updating leaderboard...');
    
    // Get all active users
    const users = await User.find({ isActive: true }).select('_id name virtualBalance');
    
    const leaderboardEntries = [];
    
    for (const user of users) {
      // Get user's holdings
      const holdings = await Portfolio.find({ 
        userId: user._id, 
        quantity: { $gt: 0 } 
      });
      
      // Calculate holdings value with live prices
      let holdingsValue = 0;
      for (const holding of holdings) {
        const stock = await Stock.findOne({ symbol: holding.symbol });
        if (stock && stock.currentPrice > 0) {
          holdingsValue += holding.quantity * stock.currentPrice;
        }
      }
      
      const totalPortfolioValue = user.virtualBalance + holdingsValue;
      const totalPnL = totalPortfolioValue - 100000;
      const pnlPercent = (totalPnL / 100000) * 100;
      
      leaderboardEntries.push({
        userId: user._id,
        userName: user.name,
        totalPortfolioValue,
        totalPnL,
        pnlPercent,
        virtualBalance: user.virtualBalance,
        holdingsValue,
      });
    }
    
    // Sort by portfolio value descending
    leaderboardEntries.sort((a, b) => b.totalPortfolioValue - a.totalPortfolioValue);
    
    // Assign ranks and save
    const snapshotAt = new Date();
    const savePromises = leaderboardEntries.map((entry, index) => {
      return Leaderboard.create({
        ...entry,
        rank: index + 1,
        snapshotAt,
      });
    });
    
    await Promise.all(savePromises);
    
    // Clean old snapshots (keep only last 24 hours)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    await Leaderboard.deleteMany({ snapshotAt: { $lt: cutoffDate } });
    
    console.log(`✅ Leaderboard updated: ${leaderboardEntries.length} users ranked`);
    
    // Return top 10 for socket broadcast
    return leaderboardEntries.slice(0, 10);
  } catch (error) {
    console.error('❌ Error updating leaderboard:', error.message);
    return [];
  }
};

// Get current leaderboard
export const getLeaderboard = async (limit = 50) => {
  try {
    const latestSnapshot = await Leaderboard.findOne()
      .sort({ snapshotAt: -1 })
      .select('snapshotAt');
    
    if (!latestSnapshot) {
      // Generate leaderboard if none exists
      await updateLeaderboard();
      return getLeaderboard(limit);
    }
    
    const leaderboard = await Leaderboard.find({
      snapshotAt: latestSnapshot.snapshotAt,
    })
      .sort({ rank: 1 })
      .limit(limit)
      .select('rank userId userName totalPortfolioValue pnlPercent totalPnL');
    
    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error.message);
    return [];
  }
};

// Get user's rank
export const getUserRank = async (userId) => {
  try {
    const latestSnapshot = await Leaderboard.findOne()
      .sort({ snapshotAt: -1 })
      .select('snapshotAt');
    
    if (!latestSnapshot) {
      return null;
    }
    
    const userRank = await Leaderboard.findOne({
      userId,
      snapshotAt: latestSnapshot.snapshotAt,
    });
    
    if (!userRank) {
      return null;
    }
    
    // Get total participants
    const totalParticipants = await Leaderboard.countDocuments({
      snapshotAt: latestSnapshot.snapshotAt,
    });
    
    // Get nearby ranks (3 above and below)
    const nearbyRanks = await Leaderboard.find({
      snapshotAt: latestSnapshot.snapshotAt,
      rank: {
        $gte: Math.max(1, userRank.rank - 3),
        $lte: Math.min(totalParticipants, userRank.rank + 3),
      },
    })
      .sort({ rank: 1 })
      .select('rank userId userName totalPortfolioValue pnlPercent');
    
    return {
      myRank: userRank,
      totalParticipants,
      percentile: ((totalParticipants - userRank.rank) / totalParticipants) * 100,
      nearbyRanks,
    };
  } catch (error) {
    console.error('Error getting user rank:', error.message);
    return null;
  }
};

// Get user's rank history
export const getUserRankHistory = async (userId, days = 7) => {
  try {
    const history = await Leaderboard.getUserRankHistory(userId, days);
    return history;
  } catch (error) {
    console.error('Error getting rank history:', error.message);
    return [];
  }
};

export default {
  updateLeaderboard,
  getLeaderboard,
  getUserRank,
  getUserRankHistory,
};
