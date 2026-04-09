import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: [true, 'Please provide a stock symbol'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    shortName: {
      type: String,
      required: [true, 'Please provide company name'],
      trim: true,
    },
    exchange: {
      type: String,
      enum: ['NSE', 'BSE'],
      default: 'NSE',
    },
    sector: {
      type: String,
      default: null,
      index: true,
    },
    currentPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    previousClose: {
      type: Number,
      default: null,
    },
    dayHigh: {
      type: Number,
      default: null,
    },
    dayLow: {
      type: Number,
      default: null,
    },
    volume: {
      type: Number,
      default: null,
    },
    changeAmount: {
      type: Number,
      default: null,
    },
    changePercent: {
      type: Number,
      default: null,
    },
    marketCap: {
      type: Number,
      default: null,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Additional fields for charts
    fiftyTwoWeekHigh: {
      type: Number,
      default: null,
    },
    fiftyTwoWeekLow: {
      type: Number,
      default: null,
    },
    peRatio: {
      type: Number,
      default: null,
    },
    pbRatio: {
      type: Number,
      default: null,
    },
    dividendYield: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
stockSchema.index({ sector: 1, currentPrice: -1 });
stockSchema.index({ symbol: 1, lastUpdated: -1 });

// Calculate change from previous close
stockSchema.methods.calculateChange = function () {
  if (this.previousClose && this.currentPrice) {
    this.changeAmount = this.currentPrice - this.previousClose;
    this.changePercent = (this.changeAmount / this.previousClose) * 100;
  }
  return this;
};

// Virtual for price direction
stockSchema.virtual('trend').get(function () {
  if (!this.changePercent) return 'neutral';
  return this.changePercent >= 0 ? 'up' : 'down';
});

// Virtual for formatted price change
stockSchema.virtual('formattedChange').get(function () {
  if (!this.changePercent) return '0.00%';
  const sign = this.changePercent >= 0 ? '+' : '';
  return `${sign}${this.changePercent.toFixed(2)}%`;
});

const Stock = mongoose.model('Stock', stockSchema);

export default Stock;
