import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    rank: {
      type: Number,
      required: true,
      index: true,
    },
    totalPortfolioValue: {
      type: Number,
      required: true,
      default: 100000,
    },
    totalPnL: {
      type: Number,
      required: true,
      default: 0,
    },
    pnlPercent: {
      type: Number,
      required: true,
      default: 0,
    },
    virtualBalance: {
      type: Number,
      required: true,
      default: 100000,
    },
    holdingsValue: {
      type: Number,
      required: true,
      default: 0,
    },
    snapshotAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
leaderboardSchema.index({ snapshotAt: -1, rank: 1 });
leaderboardSchema.index({ userId: 1, snapshotAt: -1 });

// Static method to get latest leaderboard
leaderboardSchema.statics.getLatest = async function (limit = 50) {
  const latestSnapshot = await this.findOne().sort({ snapshotAt: -1 }).select('snapshotAt');
  
  if (!latestSnapshot) return [];
  
  return await this.find({ snapshotAt: latestSnapshot.snapshotAt })
    .sort({ rank: 1 })
    .limit(limit)
    .select('rank userId userName totalPortfolioValue pnlPercent');
};

// Static method to get user's rank history
leaderboardSchema.statics.getUserRankHistory = async function (userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    userId: new mongoose.Types.ObjectId(userId),
    snapshotAt: { $gte: startDate },
  })
    .sort({ snapshotAt: 1 })
    .select('snapshotAt rank totalPortfolioValue pnlPercent');
};

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

export default Leaderboard;
