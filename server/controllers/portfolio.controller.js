import { User, Stock, Portfolio } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { formatINR, formatPercent } from '../utils/tradeCalculations.js';

// Get user's holdings with live P&L
export const getHoldings = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const holdings = await Portfolio.find({ 
    userId, 
    quantity: { $gt: 0 } 
  }).sort({ lastTraded: -1 }).lean();

  // Enrich with live prices and calculate P&L
  const enrichedHoldings = await Promise.all(
    holdings.map(async (holding) => {
      const stock = await Stock.findOne({ symbol: holding.symbol }).lean();
      
      if (!stock || stock.currentPrice === 0) {
        return {
          ...holding,
          currentPrice: null,
          currentValue: 0,
          unrealisedPnL: 0,
          unrealisedPnLPercent: 0,
          trend: 'neutral',
        };
      }

      const currentPrice = stock.currentPrice;
      const currentValue = holding.quantity * currentPrice;
      const investedValue = holding.quantity * holding.averageCostPrice;
      const unrealisedPnL = currentValue - investedValue;
      const unrealisedPnLPercent = investedValue > 0 
        ? (unrealisedPnL / investedValue) * 100 
        : 0;

      return {
        ...holding,
        currentPrice,
        currentValue,
        investedValue,
        unrealisedPnL,
        unrealisedPnLPercent,
        dayChange: stock.changeAmount,
        dayChangePercent: stock.changePercent,
        trend: unrealisedPnL >= 0 ? 'up' : 'down',
        formattedUnrealisedPnL: formatINR(unrealisedPnL),
        formattedUnrealisedPnLPercent: formatPercent(unrealisedPnLPercent),
      };
    })
  );

  // Calculate totals
  const totalCurrentValue = enrichedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = enrichedHoldings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalUnrealisedPnL = totalCurrentValue - totalInvested;

  res.json({
    success: true,
    data: {
      holdings: enrichedHoldings,
      summary: {
        totalHoldings: enrichedHoldings.length,
        totalCurrentValue,
        totalInvested,
        totalUnrealisedPnL,
        totalUnrealisedPnLPercent: totalInvested > 0 
          ? (totalUnrealisedPnL / totalInvested) * 100 
          : 0,
        formattedTotalCurrentValue: formatINR(totalCurrentValue),
        formattedTotalInvested: formatINR(totalInvested),
        formattedTotalUnrealisedPnL: formatINR(totalUnrealisedPnL),
      },
    },
  });
});

// Get portfolio summary for dashboard
export const getSummary = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const [user, holdings] = await Promise.all([
    User.findById(userId).select('virtualBalance name'),
    Portfolio.find({ userId, quantity: { $gt: 0 } }).lean(),
  ]);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Calculate holdings value
  let holdingsValue = 0;
  let totalInvested = 0;
  
  const stockPromises = holdings.map(async (holding) => {
    const stock = await Stock.findOne({ symbol: holding.symbol }).select('currentPrice');
    if (stock && stock.currentPrice > 0) {
      holdingsValue += holding.quantity * stock.currentPrice;
      totalInvested += holding.quantity * holding.averageCostPrice;
    }
  });

  await Promise.all(stockPromises);

  const totalPortfolioValue = user.virtualBalance + holdingsValue;
  const unrealisedPnL = holdingsValue - totalInvested;
  const overallReturn = totalPortfolioValue - 100000;
  const overallReturnPercent = (overallReturn / 100000) * 100;

  res.json({
    success: true,
    data: {
      userName: user.name,
      cashBalance: user.virtualBalance,
      holdingsValue,
      totalPortfolioValue,
      totalInvested,
      unrealisedPnL,
      unrealisedPnLPercent: totalInvested > 0 ? (unrealisedPnL / totalInvested) * 100 : 0,
      overallReturn,
      overallReturnPercent,
      initialBalance: 100000,
      formattedCashBalance: formatINR(user.virtualBalance),
      formattedHoldingsValue: formatINR(holdingsValue),
      formattedTotalValue: formatINR(totalPortfolioValue),
      formattedTotalInvested: formatINR(totalInvested),
      formattedUnrealisedPnL: formatINR(unrealisedPnL),
      formattedOverallReturn: formatINR(overallReturn),
    },
  });
});

// Get sector allocation
export const getAllocation = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const holdings = await Portfolio.find({ 
    userId, 
    quantity: { $gt: 0 } 
  }).lean();

  // Group by sector
  const sectorMap = {};
  let totalValue = 0;

  await Promise.all(
    holdings.map(async (holding) => {
      const stock = await Stock.findOne({ symbol: holding.symbol }).select('currentPrice sector');
      if (stock && stock.currentPrice > 0) {
        const value = holding.quantity * stock.currentPrice;
        const sector = stock.sector || 'Other';
        
        if (!sectorMap[sector]) {
          sectorMap[sector] = { sector, value: 0, holdings: [] };
        }
        
        sectorMap[sector].value += value;
        sectorMap[sector].holdings.push({
          symbol: holding.symbol,
          quantity: holding.quantity,
          value,
        });
        
        totalValue += value;
      }
    })
  );

  // Convert to array with percentages
  const allocation = Object.values(sectorMap)
    .map(item => ({
      ...item,
      percent: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
      formattedValue: formatINR(item.value),
    }))
    .sort((a, b) => b.value - a.value);

  res.json({
    success: true,
    data: {
      allocation,
      totalValue,
      formattedTotalValue: formatINR(totalValue),
    },
  });
});

export default {
  getHoldings,
  getSummary,
  getAllocation,
};
