import { Transaction } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { formatINR, formatPercent } from '../utils/tradeCalculations.js';

// Get P&L chart data
export const getPnLChart = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const userId = req.userId;

  const dailyData = await Transaction.getDailyPnL(userId, parseInt(days));

  // Calculate cumulative P&L
  let cumulativePnL = 0;
  const chartData = dailyData.map(day => {
    cumulativePnL += day.dailyPnL;
    return {
      date: day._id,
      dailyPnL: day.dailyPnL,
      cumulativePnL,
      trades: day.trades,
      formattedDailyPnL: formatINR(day.dailyPnL),
      formattedCumulativePnL: formatINR(cumulativePnL),
    };
  });

  res.json({
    success: true,
    data: chartData,
    meta: {
      days: parseInt(days),
      totalDailyPnL: chartData.reduce((sum, d) => sum + d.dailyPnL, 0),
      finalCumulativePnL: cumulativePnL,
    },
  });
});

// Get trade statistics
export const getTradeStats = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const stats = await Transaction.getTradeStats(userId);

  // Get best and worst trades
  const bestWorstTrades = await Transaction.aggregate([
    { 
      $match: { 
        userId: new (await import('mongoose')).default.Types.ObjectId(userId),
        type: 'SELL',
        realisedPnL: { $ne: null },
      } 
    },
    { $sort: { realisedPnL: -1 } },
    {
      $group: {
        _id: null,
        bestTrade: { $first: '$$ROOT' },
        worstTrade: { $last: '$$ROOT' },
      },
    },
  ]);

  // Calculate average holding period
  const holdingPeriodData = await Transaction.aggregate([
    { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId) } },
    { $sort: { executedAt: 1 } },
    {
      $group: {
        _id: '$symbol',
        transactions: { $push: { type: '$type', date: '$executedAt', qty: '$quantity' } },
      },
    },
  ]);

  let totalHoldingDays = 0;
  let closedPositions = 0;

  holdingPeriodData.forEach(stock => {
    let buyQueue = [];
    
    stock.transactions.forEach(tx => {
      if (tx.type === 'BUY') {
        buyQueue.push({ date: tx.date, qty: tx.qty });
      } else if (tx.type === 'SELL' && buyQueue.length > 0) {
        let sellQty = tx.qty;
        while (sellQty > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const matchedQty = Math.min(sellQty, buy.qty);
          const daysHeld = Math.ceil(
            (new Date(tx.date) - new Date(buy.date)) / (1000 * 60 * 60 * 24)
          );
          
          totalHoldingDays += daysHeld;
          closedPositions++;
          
          sellQty -= matchedQty;
          buy.qty -= matchedQty;
          
          if (buy.qty === 0) {
            buyQueue.shift();
          }
        }
      }
    });
  });

  const avgHoldingDays = closedPositions > 0 ? totalHoldingDays / closedPositions : 0;

  // Format best/worst trades
  const bestTrade = bestWorstTrades[0]?.bestTrade || null;
  const worstTrade = bestWorstTrades[0]?.worstTrade || null;

  res.json({
    success: true,
    data: {
      ...stats,
      winRate: parseFloat(stats.winRate.toFixed(2)),
      avgHoldingDays: parseFloat(avgHoldingDays.toFixed(1)),
      bestTrade: bestTrade ? {
        symbol: bestTrade.symbol,
        stockName: bestTrade.stockName,
        quantity: bestTrade.quantity,
        realisedPnL: bestTrade.realisedPnL,
        pricePerShare: bestTrade.pricePerShare,
        formattedRealisedPnL: formatINR(bestTrade.realisedPnL),
      } : null,
      worstTrade: worstTrade ? {
        symbol: worstTrade.symbol,
        stockName: worstTrade.stockName,
        quantity: worstTrade.quantity,
        realisedPnL: worstTrade.realisedPnL,
        pricePerShare: worstTrade.pricePerShare,
        formattedRealisedPnL: formatINR(worstTrade.realisedPnL),
      } : null,
    },
  });
});

// Get sector performance
export const getSectorPerformance = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { Portfolio, Stock } = await import('../models/index.js');

  const holdings = await Portfolio.find({ userId, quantity: { $gt: 0 } }).lean();
  
  const sectorData = {};

  await Promise.all(
    holdings.map(async (holding) => {
      const stock = await Stock.findOne({ symbol: holding.symbol }).lean();
      if (stock) {
        const sector = stock.sector || 'Other';
        const currentValue = holding.quantity * stock.currentPrice;
        const investedValue = holding.quantity * holding.averageCostPrice;
        const pnl = currentValue - investedValue;

        if (!sectorData[sector]) {
          sectorData[sector] = {
            sector,
            holdingsCount: 0,
            totalValue: 0,
            totalInvested: 0,
            totalPnL: 0,
          };
        }

        sectorData[sector].holdingsCount++;
        sectorData[sector].totalValue += currentValue;
        sectorData[sector].totalInvested += investedValue;
        sectorData[sector].totalPnL += pnl;
      }
    })
  );

  const sectors = Object.values(sectorData).map(s => ({
    ...s,
    pnlPercent: s.totalInvested > 0 ? (s.totalPnL / s.totalInvested) * 100 : 0,
    formattedTotalValue: formatINR(s.totalValue),
    formattedTotalPnL: formatINR(s.totalPnL),
  })).sort((a, b) => b.totalValue - a.totalValue);

  res.json({
    success: true,
    data: sectors,
  });
});

export default {
  getPnLChart,
  getTradeStats,
  getSectorPerformance,
};
