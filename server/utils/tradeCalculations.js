/**
 * Trade Calculation Utilities
 * Pure functions for calculating trade values
 */

// Calculate total cost for a buy order
export const calcBuyCost = (quantity, price) => {
  return quantity * price;
};

// Calculate proceeds from a sell order
export const calcSellProceeds = (quantity, price) => {
  return quantity * price;
};

// Calculate new weighted average cost after a buy
export const calcNewAvgCost = (oldQty, oldAvg, newQty, newPrice) => {
  if (oldQty === 0) return newPrice;
  
  const totalValue = (oldQty * oldAvg) + (newQty * newPrice);
  const totalQty = oldQty + newQty;
  
  return totalValue / totalQty;
};

// Calculate realized P&L on sell
export const calcRealisedPnL = (sellPrice, avgCost, quantity) => {
  return (sellPrice - avgCost) * quantity;
};

// Calculate unrealized P&L for current holdings
export const calcUnrealisedPnL = (currentPrice, avgCost, quantity) => {
  return (currentPrice - avgCost) * quantity;
};

// Calculate unrealized P&L percentage
export const calcUnrealisedPnLPercent = (unrealisedPnL, totalInvested) => {
  if (totalInvested === 0) return 0;
  return (unrealisedPnL / totalInvested) * 100;
};

// Calculate total portfolio value
export const calcTotalPortfolioValue = (virtualBalance, holdings) => {
  const holdingsValue = holdings.reduce((sum, holding) => {
    return sum + (holding.quantity * (holding.currentPrice || 0));
  }, 0);
  
  return virtualBalance + holdingsValue;
};

// Calculate overall return percentage
export const calcOverallReturnPercent = (totalPortfolioValue, initialBalance = 100000) => {
  return ((totalPortfolioValue - initialBalance) / initialBalance) * 100;
};

// Calculate win rate
export const calcWinRate = (profitableTrades, totalTrades) => {
  if (totalTrades === 0) return 0;
  return (profitableTrades / totalTrades) * 100;
};

// Format currency as INR
export const formatINR = (amount) => {
  if (amount === null || amount === undefined) return '₹0.00';
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

// Format percentage
export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0.00%';
  
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

// Format large numbers (for market cap, volume)
export const formatLargeNumber = (num) => {
  if (num === null || num === undefined) return '-';
  
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)}Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }
  if (num >= 1000) {
    return `₹${(num / 1000).toFixed(2)}K`;
  }
  
  return `₹${num.toFixed(2)}`;
};

// Get color class based on value
export const getPnLColor = (value) => {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-500';
};

// Get trend indicator
export const getTrendIndicator = (value) => {
  if (value > 0) return '▲';
  if (value < 0) return '▼';
  return '—';
};

export default {
  calcBuyCost,
  calcSellProceeds,
  calcNewAvgCost,
  calcRealisedPnL,
  calcUnrealisedPnL,
  calcUnrealisedPnLPercent,
  calcTotalPortfolioValue,
  calcOverallReturnPercent,
  calcWinRate,
  formatINR,
  formatPercent,
  formatLargeNumber,
  getPnLColor,
  getTrendIndicator,
};
