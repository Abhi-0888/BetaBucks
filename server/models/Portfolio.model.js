import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageCostPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalInvested: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sector: {
      type: String,
      default: null,
    },
    firstBought: {
      type: Date,
      default: null,
    },
    lastTraded: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - one portfolio entry per user per stock
portfolioSchema.index({ userId: 1, symbol: 1 }, { unique: true });
portfolioSchema.index({ userId: 1, isActive: 1 });
portfolioSchema.index({ sector: 1 });

// Calculate new average cost after a buy
portfolioSchema.methods.calculateNewAverageCost = function (newQty, newPrice) {
  const oldQty = this.quantity;
  const oldAvg = this.averageCostPrice;
  
  if (oldQty === 0) {
    return newPrice;
  }
  
  const totalValue = (oldQty * oldAvg) + (newQty * newPrice);
  const totalQty = oldQty + newQty;
  
  return totalValue / totalQty;
};

// Calculate unrealized P&L
portfolioSchema.methods.calculateUnrealizedPnL = async function () {
  const Stock = mongoose.model('Stock');
  const stock = await Stock.findOne({ symbol: this.symbol });
  
  if (!stock || this.quantity === 0) {
    return { unrealizedPnL: 0, unrealizedPnLPercent: 0, currentValue: 0 };
  }
  
  const currentValue = this.quantity * stock.currentPrice;
  const investedValue = this.quantity * this.averageCostPrice;
  const unrealizedPnL = currentValue - investedValue;
  const unrealizedPnLPercent = investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0;
  
  return {
    unrealizedPnL,
    unrealizedPnLPercent,
    currentValue,
    currentPrice: stock.currentPrice,
  };
};

// Virtual for holding status
portfolioSchema.virtual('status').get(function () {
  if (this.quantity === 0) return 'CLOSED';
  return 'OPEN';
});

// Virtual for days held
portfolioSchema.virtual('daysHeld').get(function () {
  if (!this.firstBought) return 0;
  const diffTime = Math.abs(new Date() - this.firstBought);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

export default Portfolio;
