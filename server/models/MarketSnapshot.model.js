import mongoose from 'mongoose';

// Stores the complete market state at close for post-market display
const marketSnapshotSchema = new mongoose.Schema(
  {
    sessionDate: {
      type: String,       // YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    capturedAt: {
      type: Date,
      required: true,
    },
    // Index data
    indices: {
      nifty50: {
        value: { type: Number, default: 0 },
        change: { type: Number, default: 0 },
        changePercent: { type: Number, default: 0 },
        advancers: { type: Number, default: 0 },
        decliners: { type: Number, default: 0 },
        unchanged: { type: Number, default: 0 },
      },
      niftyBank: {
        value: { type: Number, default: 0 },
        change: { type: Number, default: 0 },
        changePercent: { type: Number, default: 0 },
      },
      niftyNext50: {
        value: { type: Number, default: 0 },
        change: { type: Number, default: 0 },
        changePercent: { type: Number, default: 0 },
      },
    },
    // Market breadth
    breadth: {
      advances: { type: Number, default: 0 },
      declines: { type: Number, default: 0 },
      unchanged: { type: Number, default: 0 },
      advanceDeclineRatio: { type: Number, default: 1 },
    },
    // Sector heatmap data
    sectorHeatmap: [{
      sector: String,
      avgChange: Number,
      totalTurnover: Number,
      stockCount: Number,
      topGainer: {
        symbol: String,
        changePercent: Number,
      },
      topLoser: {
        symbol: String,
        changePercent: Number,
      },
    }],
    // Vyuha Movers
    movers: {
      topGainers: [{
        symbol: String,
        shortName: String,
        currentPrice: Number,
        changePercent: Number,
        volume: Number,
      }],
      topLosers: [{
        symbol: String,
        shortName: String,
        currentPrice: Number,
        changePercent: Number,
        volume: Number,
      }],
      volumeShockers: [{  // > 200% avg daily volume
        symbol: String,
        shortName: String,
        volume: Number,
        avgVolume: Number,
        volumeRatio: Number,
        changePercent: Number,
      }],
      valueLeaders: [{    // Highest turnover
        symbol: String,
        shortName: String,
        turnover: Number,
        changePercent: Number,
      }],
    },
    // Summary stats
    totalTurnover: { type: Number, default: 0 },   // Market-wide turnover in Cr
    totalVolume: { type: Number, default: 0 },
    stockCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

marketSnapshotSchema.index({ sessionDate: -1 });

const MarketSnapshot = mongoose.model('MarketSnapshot', marketSnapshotSchema);

export default MarketSnapshot;
