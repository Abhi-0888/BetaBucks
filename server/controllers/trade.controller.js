import { User, Stock, Transaction, Portfolio } from '../models/index.js';
import { fetchSingleQuote } from '../services/yahooFinance.service.js';
import { 
  emitTradeConfirmation, 
  emitTradeError, 
  emitPortfolioUpdate 
} from '../socket/socket.handler.js';
import { 
  calcBuyCost, 
  calcSellProceeds, 
  calcRealisedPnL,
  calcNewAvgCost 
} from '../utils/tradeCalculations.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// Buy stock
export const buyStock = asyncHandler(async (req, res) => {
  const { symbol, quantity } = req.body;
  const userId = req.userId;

  // Validate quantity
  if (!quantity || quantity < 1) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be at least 1',
    });
  }

  // Get stock from database
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  if (!stock) {
    return res.status(404).json({
      success: false,
      message: 'Stock not found',
    });
  }

  // Fetch live price from Yahoo Finance
  let livePrice = stock.currentPrice;
  const freshQuote = await fetchSingleQuote(symbol.toUpperCase());
  if (freshQuote && freshQuote.currentPrice > 0) {
    livePrice = freshQuote.currentPrice;
  }

  // Calculate total cost
  const totalCost = calcBuyCost(quantity, livePrice);

  // Get user and check balance
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.virtualBalance < totalCost) {
    emitTradeError(userId, {
      message: 'Insufficient balance for this order',
      code: 'INSUFFICIENT_BALANCE',
      required: totalCost,
      available: user.virtualBalance,
    });
    
    return res.status(400).json({
      success: false,
      message: `Insufficient balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${user.virtualBalance.toFixed(2)}`,
    });
  }

  const balanceBefore = user.virtualBalance;

  // Atomic balance deduction
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, virtualBalance: { $gte: totalCost } },
    { $inc: { virtualBalance: -totalCost } },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(400).json({
      success: false,
      message: 'Transaction failed. Please try again.',
    });
  }

  const balanceAfter = updatedUser.virtualBalance;

  // Create transaction record
  const transaction = await Transaction.create({
    userId,
    symbol: stock.symbol,
    stockName: stock.shortName,
    type: 'BUY',
    quantity,
    pricePerShare: livePrice,
    totalAmount: totalCost,
    balanceBefore,
    balanceAfter,
    status: 'EXECUTED',
    orderType: 'MARKET',
  });

  // Update or create portfolio entry
  let portfolio = await Portfolio.findOne({ userId, symbol: stock.symbol });
  
  if (portfolio) {
    // Calculate new average cost
    const newAvgCost = calcNewAvgCost(
      portfolio.quantity,
      portfolio.averageCostPrice,
      quantity,
      livePrice
    );

    portfolio.quantity += quantity;
    portfolio.averageCostPrice = newAvgCost;
    portfolio.totalInvested = portfolio.quantity * newAvgCost;
    portfolio.lastTraded = new Date();
    await portfolio.save();
  } else {
    // Create new portfolio entry
    portfolio = await Portfolio.create({
      userId,
      symbol: stock.symbol,
      stockName: stock.shortName,
      quantity,
      averageCostPrice: livePrice,
      totalInvested: totalCost,
      sector: stock.sector,
      firstBought: new Date(),
      lastTraded: new Date(),
    });
  }

  // Calculate new portfolio summary for socket
  const holdings = await Portfolio.find({ userId, quantity: { $gt: 0 } });
  let holdingsValue = 0;
  for (const holding of holdings) {
    const hStock = await Stock.findOne({ symbol: holding.symbol });
    if (hStock) {
      holdingsValue += holding.quantity * hStock.currentPrice;
    }
  }
  
  const totalPortfolioValue = balanceAfter + holdingsValue;
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
  const unrealisedPnL = holdingsValue - totalInvested;

  // Emit socket events
  emitTradeConfirmation(userId, {
    tradeId: transaction._id,
    type: 'BUY',
    symbol: stock.symbol,
    stockName: stock.shortName,
    qty: quantity,
    price: livePrice,
    totalAmount: totalCost,
    newBalance: balanceAfter,
  });

  emitPortfolioUpdate(userId, {
    totalValue: totalPortfolioValue,
    cashBalance: balanceAfter,
    holdingsValue,
    unrealisedPnL,
    unrealisedPnLPercent: totalInvested > 0 ? (unrealisedPnL / totalInvested) * 100 : 0,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Successfully bought ${quantity} shares of ${stock.shortName}`,
    data: {
      transaction: {
        id: transaction._id,
        type: transaction.type,
        symbol: transaction.symbol,
        stockName: transaction.stockName,
        quantity: transaction.quantity,
        pricePerShare: transaction.pricePerShare,
        totalAmount: transaction.totalAmount,
        balanceAfter: transaction.balanceAfter,
        executedAt: transaction.executedAt,
      },
      portfolio: {
        symbol: portfolio.symbol,
        quantity: portfolio.quantity,
        averageCostPrice: portfolio.averageCostPrice,
        totalInvested: portfolio.totalInvested,
      },
      newBalance: balanceAfter,
    },
  });
});

// Sell stock
export const sellStock = asyncHandler(async (req, res) => {
  const { symbol, quantity } = req.body;
  const userId = req.userId;

  // Validate quantity
  if (!quantity || quantity < 1) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be at least 1',
    });
  }

  // Get stock
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  if (!stock) {
    return res.status(404).json({
      success: false,
      message: 'Stock not found',
    });
  }

  // Check holdings
  const portfolio = await Portfolio.findOne({ userId, symbol: stock.symbol });
  if (!portfolio || portfolio.quantity < quantity) {
    return res.status(400).json({
      success: false,
      message: `You only hold ${portfolio?.quantity || 0} shares of ${stock.symbol}`,
    });
  }

  // Fetch live price
  let livePrice = stock.currentPrice;
  const freshQuote = await fetchSingleQuote(symbol.toUpperCase());
  if (freshQuote && freshQuote.currentPrice > 0) {
    livePrice = freshQuote.currentPrice;
  }

  // Calculate proceeds and P&L
  const proceeds = calcSellProceeds(quantity, livePrice);
  const realisedPnL = calcRealisedPnL(livePrice, portfolio.averageCostPrice, quantity);

  // Get user
  const user = await User.findById(userId);
  const balanceBefore = user.virtualBalance;

  // Credit balance
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { virtualBalance: proceeds } },
    { new: true }
  );

  const balanceAfter = updatedUser.virtualBalance;

  // Create transaction record
  const transaction = await Transaction.create({
    userId,
    symbol: stock.symbol,
    stockName: stock.shortName,
    type: 'SELL',
    quantity,
    pricePerShare: livePrice,
    totalAmount: proceeds,
    balanceBefore,
    balanceAfter,
    realisedPnL,
    status: 'EXECUTED',
    orderType: 'MARKET',
  });

  // Update portfolio
  const newQuantity = portfolio.quantity - quantity;
  portfolio.quantity = newQuantity;
  portfolio.totalInvested = newQuantity * portfolio.averageCostPrice;
  
  if (newQuantity === 0) {
    portfolio.isActive = false;
    portfolio.averageCostPrice = 0;
    portfolio.totalInvested = 0;
  }
  
  portfolio.lastTraded = new Date();
  await portfolio.save();

  // Calculate new portfolio summary
  const holdings = await Portfolio.find({ userId, quantity: { $gt: 0 } });
  let holdingsValue = 0;
  for (const holding of holdings) {
    const hStock = await Stock.findOne({ symbol: holding.symbol });
    if (hStock) {
      holdingsValue += holding.quantity * hStock.currentPrice;
    }
  }
  
  const totalPortfolioValue = balanceAfter + holdingsValue;
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
  const unrealisedPnL = holdingsValue - totalInvested;

  // Emit socket events
  emitTradeConfirmation(userId, {
    tradeId: transaction._id,
    type: 'SELL',
    symbol: stock.symbol,
    stockName: stock.shortName,
    qty: quantity,
    price: livePrice,
    totalAmount: proceeds,
    pnl: realisedPnL,
    newBalance: balanceAfter,
  });

  emitPortfolioUpdate(userId, {
    totalValue: totalPortfolioValue,
    cashBalance: balanceAfter,
    holdingsValue,
    unrealisedPnL,
    unrealisedPnLPercent: totalInvested > 0 ? (unrealisedPnL / totalInvested) * 100 : 0,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Successfully sold ${quantity} shares of ${stock.shortName}`,
    data: {
      transaction: {
        id: transaction._id,
        type: transaction.type,
        symbol: transaction.symbol,
        stockName: transaction.stockName,
        quantity: transaction.quantity,
        pricePerShare: transaction.pricePerShare,
        totalAmount: transaction.totalAmount,
        realisedPnL: transaction.realisedPnL,
        balanceAfter: transaction.balanceAfter,
        executedAt: transaction.executedAt,
      },
      portfolio: newQuantity > 0 ? {
        symbol: portfolio.symbol,
        quantity: portfolio.quantity,
        averageCostPrice: portfolio.averageCostPrice,
        totalInvested: portfolio.totalInvested,
      } : null,
      newBalance: balanceAfter,
      realisedPnL,
    },
  });
});

// Get trade history
export const getTradeHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const userId = req.userId;

  const query = { userId };
  if (type && ['BUY', 'SELL'].includes(type.toUpperCase())) {
    query.type = type.toUpperCase();
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ executedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Transaction.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

export default {
  buyStock,
  sellStock,
  getTradeHistory,
};
