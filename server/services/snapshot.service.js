/**
 * NidhiKosh Snapshot Service
 * 
 * Captures the full market state at 15:45 IST and stores it.
 * Serves the latest snapshot when market is closed.
 * Ensures "no empty states" — always returns data-rich content.
 */

import { Stock, MarketSnapshot } from '../models/index.js';
import { getISTDateString, getLastTradingDate, getISTNow } from './marketStatus.service.js';

/**
 * Capture a complete market snapshot
 */
export const captureMarketSnapshot = async () => {
  const sessionDate = getISTDateString();
  console.log(`📸 Capturing market snapshot for ${sessionDate}...`);

  try {
    // Get all stocks
    const stocks = await Stock.find({}).lean();
    if (stocks.length === 0) {
      console.warn('⚠️ No stocks to snapshot');
      return null;
    }

    // Calculate market breadth
    const advancers = stocks.filter(s => s.changePercent > 0);
    const decliners = stocks.filter(s => s.changePercent < 0);
    const unchanged = stocks.filter(s => !s.changePercent || s.changePercent === 0);

    // Build sector heatmap
    const sectorMap = {};
    stocks.forEach(s => {
      const sec = s.sector || 'Other';
      if (!sectorMap[sec]) {
        sectorMap[sec] = { stocks: [], totalTurnover: 0 };
      }
      sectorMap[sec].stocks.push(s);
      sectorMap[sec].totalTurnover += s.turnover || 0;
    });

    const sectorHeatmap = Object.entries(sectorMap).map(([sector, data]) => {
      const sorted = data.stocks.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
      const avgChange = data.stocks.reduce((sum, s) => sum + (s.changePercent || 0), 0) / data.stocks.length;
      return {
        sector,
        avgChange: Math.round(avgChange * 100) / 100,
        totalTurnover: data.totalTurnover,
        stockCount: data.stocks.length,
        topGainer: sorted[0] ? { symbol: sorted[0].symbol, changePercent: sorted[0].changePercent } : null,
        topLoser: sorted[sorted.length - 1] ? { symbol: sorted[sorted.length - 1].symbol, changePercent: sorted[sorted.length - 1].changePercent } : null,
      };
    }).sort((a, b) => b.avgChange - a.avgChange);

    // Top movers
    const byChange = [...stocks].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    const topGainers = byChange.filter(s => s.changePercent > 0).slice(0, 10).map(s => ({
      symbol: s.symbol, shortName: s.shortName, currentPrice: s.currentPrice,
      changePercent: s.changePercent, volume: s.volume,
    }));
    const topLosers = byChange.filter(s => s.changePercent < 0).reverse().slice(0, 10).map(s => ({
      symbol: s.symbol, shortName: s.shortName, currentPrice: s.currentPrice,
      changePercent: s.changePercent, volume: s.volume,
    }));

    // Volume shockers (> 200% of average daily volume)
    const volumeShockers = stocks
      .filter(s => s.avgDailyVolume > 0 && s.volume > s.avgDailyVolume * 2)
      .sort((a, b) => (b.volume / b.avgDailyVolume) - (a.volume / a.avgDailyVolume))
      .slice(0, 10)
      .map(s => ({
        symbol: s.symbol, shortName: s.shortName, volume: s.volume,
        avgVolume: s.avgDailyVolume,
        volumeRatio: Math.round((s.volume / s.avgDailyVolume) * 100) / 100,
        changePercent: s.changePercent,
      }));

    // Value leaders (highest turnover)
    const valueLeaders = [...stocks]
      .sort((a, b) => (b.turnover || 0) - (a.turnover || 0))
      .slice(0, 10)
      .map(s => ({
        symbol: s.symbol, shortName: s.shortName,
        turnover: s.turnover, changePercent: s.changePercent,
      }));

    // Calculate simulated index values
    const avgPrice = stocks.reduce((sum, s) => sum + (s.currentPrice || 0), 0) / stocks.length;
    const avgChange = stocks.reduce((sum, s) => sum + (s.changePercent || 0), 0) / stocks.length;
    const niftyValue = Math.round(22500 + (avgChange * 100));
    const bankNiftyValue = Math.round(48000 + (avgChange * 200));

    const snapshot = {
      sessionDate,
      capturedAt: new Date(),
      indices: {
        nifty50: {
          value: niftyValue,
          change: Math.round(avgChange * 100) / 100 * 100,
          changePercent: Math.round(avgChange * 100) / 100,
          advancers: advancers.length,
          decliners: decliners.length,
          unchanged: unchanged.length,
        },
        niftyBank: {
          value: bankNiftyValue,
          change: Math.round(avgChange * 1.2 * 100) / 100 * 200,
          changePercent: Math.round(avgChange * 1.2 * 100) / 100,
        },
        niftyNext50: {
          value: Math.round(58000 + (avgChange * 150)),
          change: Math.round(avgChange * 0.8 * 100) / 100 * 150,
          changePercent: Math.round(avgChange * 0.8 * 100) / 100,
        },
      },
      breadth: {
        advances: advancers.length,
        declines: decliners.length,
        unchanged: unchanged.length,
        advanceDeclineRatio: decliners.length > 0 
          ? Math.round((advancers.length / decliners.length) * 100) / 100 
          : advancers.length,
      },
      sectorHeatmap,
      movers: {
        topGainers,
        topLosers,
        volumeShockers,
        valueLeaders,
      },
      totalTurnover: stocks.reduce((sum, s) => sum + (s.turnover || 0), 0),
      totalVolume: stocks.reduce((sum, s) => sum + (s.volume || 0), 0),
      stockCount: stocks.length,
    };

    // Upsert snapshot
    const saved = await MarketSnapshot.findOneAndUpdate(
      { sessionDate },
      snapshot,
      { upsert: true, new: true }
    );

    console.log(`✅ Snapshot captured: ${sessionDate} — ${stocks.length} stocks, ${advancers.length} advancers, ${decliners.length} decliners`);
    return saved;
  } catch (error) {
    console.error('❌ Snapshot capture failed:', error.message);
    return null;
  }
};

/**
 * Get the latest market snapshot (for post-market display)
 */
export const getLatestSnapshot = async () => {
  // First try today's snapshot
  const today = getISTDateString();
  let snapshot = await MarketSnapshot.findOne({ sessionDate: today }).lean();
  
  if (snapshot) return snapshot;

  // Try last trading date
  const lastDate = getLastTradingDate();
  snapshot = await MarketSnapshot.findOne({ sessionDate: lastDate }).lean();
  
  if (snapshot) return snapshot;

  // Get most recent snapshot
  snapshot = await MarketSnapshot.findOne({}).sort({ sessionDate: -1 }).lean();
  
  if (snapshot) return snapshot;

  // No snapshot exists yet — generate one from current stock data
  return captureMarketSnapshot();
};

/**
 * Get snapshot for a specific date
 */
export const getSnapshotByDate = async (dateStr) => {
  return MarketSnapshot.findOne({ sessionDate: dateStr }).lean();
};

export default {
  captureMarketSnapshot,
  getLatestSnapshot,
  getSnapshotByDate,
};
