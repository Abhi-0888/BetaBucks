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

// ============================================================
// NIDHIKOSH — Living Dashboard Endpoints
// ============================================================

// Get full market status (phase, IST time, frozen mode)
export const getMarketStatus = asyncHandler(async (req, res) => {
  const { getFullMarketStatus } = await import('../services/marketStatus.service.js');
  const status = getFullMarketStatus();
  res.json({ success: true, data: status });
});

// Get latest market snapshot (for post-market display)
export const getMarketSnapshot = asyncHandler(async (req, res) => {
  const { getLatestSnapshot } = await import('../services/snapshot.service.js');
  const snapshot = await getLatestSnapshot();
  res.json({ success: true, data: snapshot });
});

// Get sector heatmap
export const getSectorHeatmap = asyncHandler(async (req, res) => {
  const stocks = await Stock.find({ sector: { $ne: null } }).lean();
  const sectorMap = {};
  stocks.forEach(s => {
    const sec = s.sector;
    if (!sectorMap[sec]) sectorMap[sec] = { stocks: [], totalTurnover: 0, totalVolume: 0 };
    sectorMap[sec].stocks.push(s);
    sectorMap[sec].totalTurnover += s.turnover || 0;
    sectorMap[sec].totalVolume += s.volume || 0;
  });
  const heatmap = Object.entries(sectorMap).map(([sector, data]) => {
    const sorted = data.stocks.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    const avgChange = data.stocks.reduce((sum, s) => sum + (s.changePercent || 0), 0) / data.stocks.length;
    return {
      sector,
      avgChange: Math.round(avgChange * 100) / 100,
      totalTurnover: data.totalTurnover,
      totalVolume: data.totalVolume,
      stockCount: data.stocks.length,
      stocks: data.stocks.map(s => ({
        symbol: s.symbol, shortName: s.shortName,
        currentPrice: s.currentPrice, changePercent: s.changePercent,
        volume: s.volume, turnover: s.turnover,
      })),
    };
  }).sort((a, b) => b.avgChange - a.avgChange);
  res.json({ success: true, data: heatmap });
});

// Get NidhiKosh movers — gainers, losers, volume shockers, value leaders
export const getVyuhaMovers = asyncHandler(async (req, res) => {
  const stocks = await Stock.find({}).lean();

  const byChange = [...stocks].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
  const topGainers = byChange.filter(s => s.changePercent > 0).slice(0, 10).map(s => ({
    symbol: s.symbol, shortName: s.shortName, currentPrice: s.currentPrice,
    changePercent: s.changePercent, volume: s.volume, vwap: s.vwap,
  }));
  const topLosers = byChange.filter(s => s.changePercent < 0).reverse().slice(0, 10).map(s => ({
    symbol: s.symbol, shortName: s.shortName, currentPrice: s.currentPrice,
    changePercent: s.changePercent, volume: s.volume, vwap: s.vwap,
  }));

  const volumeShockers = stocks
    .filter(s => s.avgDailyVolume > 0 && s.volume > s.avgDailyVolume * 2)
    .sort((a, b) => (b.volume / (b.avgDailyVolume || 1)) - (a.volume / (a.avgDailyVolume || 1)))
    .slice(0, 10)
    .map(s => ({
      symbol: s.symbol, shortName: s.shortName, volume: s.volume,
      avgVolume: s.avgDailyVolume,
      volumeRatio: Math.round((s.volume / (s.avgDailyVolume || 1)) * 100) / 100,
      changePercent: s.changePercent, currentPrice: s.currentPrice,
    }));

  const valueLeaders = [...stocks]
    .sort((a, b) => (b.turnover || 0) - (a.turnover || 0))
    .slice(0, 10)
    .map(s => ({
      symbol: s.symbol, shortName: s.shortName,
      turnover: s.turnover, changePercent: s.changePercent, currentPrice: s.currentPrice,
    }));

  res.json({
    success: true,
    data: { topGainers, topLosers, volumeShockers, valueLeaders },
  });
});

// Get market breadth (advance/decline ratio)
export const getMarketBreadth = asyncHandler(async (req, res) => {
  const stocks = await Stock.find({}).lean();
  const advances = stocks.filter(s => s.changePercent > 0).length;
  const declines = stocks.filter(s => s.changePercent < 0).length;
  const unchanged = stocks.filter(s => !s.changePercent || s.changePercent === 0).length;
  const total = stocks.length;
  const adRatio = declines > 0 ? Math.round((advances / declines) * 100) / 100 : advances;

  // Total market turnover
  const totalTurnover = stocks.reduce((sum, s) => sum + (s.turnover || 0), 0);
  const totalVolume = stocks.reduce((sum, s) => sum + (s.volume || 0), 0);

  res.json({
    success: true,
    data: {
      advances, declines, unchanged, total,
      advanceDeclineRatio: adRatio,
      totalTurnover, totalVolume,
      sentiment: adRatio > 1.5 ? 'Bullish' : adRatio < 0.67 ? 'Bearish' : 'Neutral',
    },
  });
});

// Force snapshot capture (admin)
export const forceSnapshotCapture = asyncHandler(async (req, res) => {
  const { captureMarketSnapshot } = await import('../services/snapshot.service.js');
  const snapshot = await captureMarketSnapshot();
  res.json({ success: true, data: snapshot });
});

export default {
  getStocks,
  getStockDetail,
  getStockHistory,
  searchStocks,
  getNifty50,
  getSectors,
  getMarketStatus,
  getMarketSnapshot,
  getSectorHeatmap,
  getVyuhaMovers,
  getMarketBreadth,
  forceSnapshotCapture,
};
