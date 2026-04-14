import mongoose from 'mongoose';

// Market Depth Level schema (Top 5 Bid/Ask)
const depthLevelSchema = new mongoose.Schema({
  price: { type: Number, default: 0 },
  qty: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
}, { _id: false });

// Intraday candle schema
const candleSchema = new mongoose.Schema({
  t: { type: Date, required: true },       // timestamp
  o: { type: Number, required: true },      // open
  h: { type: Number, required: true },      // high
  l: { type: Number, required: true },      // low
  c: { type: Number, required: true },      // close
  v: { type: Number, default: 0 },          // volume
}, { _id: false });

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
    // --- Core Price Fields ---
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
    openPrice: {
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
    // Official NSE closing price (weighted avg of last 30 min)
    officialClose: {
      type: Number,
      default: null,
    },
    // --- Volume & Turnover ---
    volume: {
      type: Number,
      default: 0,
    },
    turnover: {
      type: Number,  // Total traded value in INR
      default: 0,
    },
    avgDailyVolume: {
      type: Number,  // 30-day average
      default: 0,
    },
    // --- VWAP ---
    vwap: {
      type: Number,
      default: null,
    },
    // --- Change ---
    changeAmount: {
      type: Number,
      default: null,
    },
    changePercent: {
      type: Number,
      default: null,
    },
    // --- Market Cap ---
    marketCap: {
      type: Number,
      default: null,
    },
    // --- Circuit Limits ---
    upperCircuit: {
      type: Number,
      default: null,
    },
    lowerCircuit: {
      type: Number,
      default: null,
    },
    // --- 52 Week ---
    fiftyTwoWeekHigh: {
      type: Number,
      default: null,
    },
    fiftyTwoWeekLow: {
      type: Number,
      default: null,
    },
    // --- Fundamentals ---
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
    // --- Market Depth (Top 5 Bid/Ask snapshot) ---
    marketDepth: {
      bids: { type: [depthLevelSchema], default: [] },
      asks: { type: [depthLevelSchema], default: [] },
      totalBuyQty: { type: Number, default: 0 },
      totalSellQty: { type: Number, default: 0 },
    },
    // --- Intraday Candles (1-minute) – frozen after close ---
    intradayCandles: {
      type: [candleSchema],
      default: [],
    },
    // --- 5-minute candles ---
    fiveMinCandles: {
      type: [candleSchema],
      default: [],
    },
    // --- Moving Averages ---
    ema50: { type: Number, default: null },
    ema200: { type: Number, default: null },
    // --- Metadata ---
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sessionDate: {
      type: String,  // YYYY-MM-DD of trading session
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
stockSchema.index({ sector: 1, currentPrice: -1 });
stockSchema.index({ symbol: 1, lastUpdated: -1 });
stockSchema.index({ changePercent: -1 });
stockSchema.index({ volume: -1 });
stockSchema.index({ turnover: -1 });

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
