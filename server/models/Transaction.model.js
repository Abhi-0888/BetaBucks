import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    stockName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
      uppercase: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerShare: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    realisedPnL: {
      type: Number,
      default: null,
      // Only populated for SELL transactions
    },
    // Order status for pending orders (stop-loss, limit orders)
    status: {
      type: String,
      enum: ['EXECUTED', 'PENDING', 'CANCELLED', 'FAILED'],
      default: 'EXECUTED',
    },
    orderType: {
      type: String,
      enum: ['MARKET', 'LIMIT', 'STOP_LOSS'],
      default: 'MARKET',
    },
    targetPrice: {
      type: Number,
      default: null,
      // For limit and stop-loss orders
    },
    executedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
transactionSchema.index({ userId: 1, executedAt: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, symbol: 1 });
transactionSchema.index({ symbol: 1, executedAt: -1 });

// Virtual for profit/loss status
transactionSchema.virtual('isProfitable').get(function () {
  if (this.type !== 'SELL' || this.realisedPnL === null) return null;
  return this.realisedPnL > 0;
});

// Static method to get user's trading statistics
transactionSchema.statics.getTradeStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        buyCount: {
          $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, 1, 0] },
        },
        sellCount: {
          $sum: { $cond: [{ $eq: ['$type', 'SELL'] }, 1, 0] },
        },
        profitableSells: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$type', 'SELL'] }, { $gt: ['$realisedPnL', 0] }] },
              1,
              0,
            ],
          },
        },
        totalRealisedPnL: {
          $sum: {
            $cond: [{ $eq: ['$type', 'SELL'] }, '$realisedPnL', 0],
          },
        },
      },
    },
  ]);

  if (stats.length === 0) {
    return {
      totalTrades: 0,
      buyCount: 0,
      sellCount: 0,
      winRate: 0,
      totalRealisedPnL: 0,
    };
  }

  const result = stats[0];
  result.winRate = result.sellCount > 0 
    ? (result.profitableSells / result.sellCount) * 100 
    : 0;

  return result;
};

// Static method to get daily P&L for charts
transactionSchema.statics.getDailyPnL = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'SELL',
        realisedPnL: { $ne: null },
        executedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$executedAt' },
        },
        dailyPnL: { $sum: '$realisedPnL' },
        trades: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
