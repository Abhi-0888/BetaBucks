import { Stock } from '../models/index.js';
import { fetchHistory, searchSymbols } from '../services/yahooFinance.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { formatLargeNumber } from '../utils/tradeCalculations.js';
import env from '../config/env.js';

// Get all stocks with pagination and filters
export const getStocks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sector, search, sortBy = 'currentPrice', order = 'desc' } = req.query;
  
  const query = {};
  
  // Filter by sector
  if (sector && sector !== 'all') {
    query.sector = sector;
  }
  
  // Search by symbol or name
  if (search) {
    query.$or = [
      { symbol: { $regex: search, $options: 'i' } },
      { shortName: { $regex: search, $options: 'i' } },
    ];
  }

  // Sort options
  const sortOptions = {};
  const validSortFields = ['symbol', 'shortName', 'currentPrice', 'changePercent', 'volume', 'lastUpdated'];
  if (validSortFields.includes(sortBy)) {
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sortOptions.lastUpdated = -1;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let [stocks, total] = await Promise.all([
    Stock.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Stock.countDocuments(query),
  ]);

  // If no stocks in database, populate with simulated data
  if (total === 0 && !search && !sector) {
    const { fetchBatchQuotes } = await import('../services/yahooFinance.service.js');
    const defaultStocks = env.DEFAULT_STOCKS || ['RELIANCE.NS', 'TCS.NS', 'INFY.NS'];
    const quotes = await fetchBatchQuotes(defaultStocks);
    
    // Create stocks in database
    for (const quote of quotes) {
      await Stock.findOneAndUpdate(
        { symbol: quote.symbol },
        {
          symbol: quote.symbol,
          shortName: quote.shortName,
          currentPrice: quote.currentPrice,
          previousClose: quote.previousClose,
          dayHigh: quote.dayHigh,
          dayLow: quote.dayLow,
          volume: quote.volume,
          change: quote.changeAmount,
          changePercent: quote.changePercent,
          marketCap: quote.marketCap,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
          peRatio: quote.peRatio,
          pbRatio: quote.pbRatio,
          dividendYield: quote.dividendYield,
          currency: quote.currency,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
    }
    
    // Re-fetch after creating
    [stocks, total] = await Promise.all([
      Stock.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Stock.countDocuments(query),
    ]);
  }

  // Enrich with formatted data
  const enrichedStocks = stocks.map(stock => ({
    ...stock,
    trend: stock.changePercent >= 0 ? 'up' : 'down',
    formattedChange: `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent?.toFixed(2) || '0.00'}%`,
    formattedMarketCap: formatLargeNumber(stock.marketCap),
  }));

  res.json({
    success: true,
    data: enrichedStocks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// Get single stock details
export const getStockDetail = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() }).lean();
  
  if (!stock) {
    return res.status(404).json({
      success: false,
      message: 'Stock not found',
    });
  }

  // Enrich response
  const enrichedStock = {
    ...stock,
    trend: stock.changePercent >= 0 ? 'up' : 'down',
    formattedChange: `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent?.toFixed(2) || '0.00'}%`,
    formattedChangeAmount: `${stock.changeAmount >= 0 ? '+' : ''}₹${stock.changeAmount?.toFixed(2) || '0.00'}`,
    formattedMarketCap: formatLargeNumber(stock.marketCap),
    formattedVolume: formatLargeNumber(stock.volume),
  };

  res.json({
    success: true,
    data: enrichedStock,
  });
});

// Get stock price history for charts
export const getStockHistory = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { range = '1d', interval = '5m' } = req.query;
  
  const history = await fetchHistory(symbol.toUpperCase(), range, interval);
  
  if (!history) {
    return res.status(404).json({
      success: false,
      message: 'Unable to fetch historical data',
    });
  }

  res.json({
    success: true,
    data: history,
  });
});

// Search for stocks
export const searchStocks = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 1) {
    return res.json({
      success: true,
      data: [],
    });
  }

  // First search in our database
  const dbResults = await Stock.find({
    $or: [
      { symbol: { $regex: q, $options: 'i' } },
      { shortName: { $regex: q, $options: 'i' } },
    ],
  }).limit(10).lean();

  // Then search Yahoo Finance for more results
  const yahooResults = await searchSymbols(q);
  
  // Merge and deduplicate
  const symbolSet = new Set(dbResults.map(s => s.symbol));
  const combinedResults = [
    ...dbResults,
    ...yahooResults.filter(y => !symbolSet.has(y.symbol)),
  ];

  res.json({
    success: true,
    data: combinedResults.slice(0, 15),
  });
});

// Get all NIFTY 50 stocks
export const getNifty50 = asyncHandler(async (req, res) => {
  const stocks = await Stock.find({
    symbol: { $in: env.DEFAULT_STOCKS },
  }).sort({ changePercent: -1 }).lean();

  res.json({
    success: true,
    data: stocks.map(s => ({
      ...s,
      trend: s.changePercent >= 0 ? 'up' : 'down',
      formattedChange: `${s.changePercent >= 0 ? '+' : ''}${s.changePercent?.toFixed(2) || '0.00'}%`,
    })),
  });
});

// Get all sectors with stats
export const getSectors = asyncHandler(async (req, res) => {
  const sectors = await Stock.aggregate([
    { $match: { sector: { $ne: null } } },
    {
      $group: {
        _id: '$sector',
        count: { $sum: 1 },
        avgChange: { $avg: '$changePercent' },
        stocks: {
          $push: {
            symbol: '$symbol',
            shortName: '$shortName',
            currentPrice: '$currentPrice',
            changePercent: '$changePercent',
          },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.json({
    success: true,
    data: sectors.map(s => ({
      sector: s._id,
      stockCount: s.count,
      avgChange: s.avgChange?.toFixed(2) || 0,
      trend: s.avgChange >= 0 ? 'up' : 'down',
      topStocks: s.stocks.slice(0, 3),
    })),
  });
});

export default {
  getStocks,
  getStockDetail,
  getStockHistory,
  searchStocks,
  getNifty50,
  getSectors,
};
