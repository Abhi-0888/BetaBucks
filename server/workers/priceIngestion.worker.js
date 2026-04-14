import { Stock } from '../models/index.js';
import { fetchBatchQuotes } from '../services/yahooFinance.service.js';
import { isSnapshotTime, getFullMarketStatus } from '../services/marketStatus.service.js';
import { captureMarketSnapshot } from '../services/snapshot.service.js';
import env from '../config/env.js';

let io = null;
let intervalId = null;
let isRunning = false;
let snapshotCapturedToday = false;
let lastSnapshotDate = null;

export const initializePriceWorker = (socketIo) => {
  io = socketIo;
  console.log('💰 Price ingestion worker initialized');
};

export const startPriceWorker = () => {
  if (isRunning) {
    console.log('⚠️ Price worker already running');
    return;
  }
  isRunning = true;
  console.log('▶️ Starting price ingestion worker (15s interval)');
  fetchAndUpdatePrices();
  intervalId = setInterval(fetchAndUpdatePrices, 15000);
};

export const stopPriceWorker = () => {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  isRunning = false;
  console.log('⏹️ Price ingestion worker stopped');
};

const fetchAndUpdatePrices = async () => {
  try {
    const symbols = env.DEFAULT_STOCKS;
    const marketStatus = getFullMarketStatus();

    // Broadcast market status to all clients
    if (io) io.emit('market_status', marketStatus);

    const quotes = await fetchBatchQuotes(symbols);
    if (!quotes || quotes.length === 0) return;

    const updates = [];

    for (const quote of quotes) {
      // Build full update payload with all NidhiKosh fields
      const updateData = {
        symbol: quote.symbol,
        shortName: quote.shortName,
        exchange: quote.exchange || 'NSE',
        sector: quote.sector,
        currentPrice: quote.currentPrice,
        previousClose: quote.previousClose,
        openPrice: quote.openPrice,
        dayHigh: quote.dayHigh,
        dayLow: quote.dayLow,
        officialClose: quote.officialClose,
        volume: quote.volume,
        turnover: quote.turnover,
        avgDailyVolume: quote.avgDailyVolume,
        vwap: quote.vwap,
        changeAmount: quote.changeAmount,
        changePercent: quote.changePercent,
        marketCap: quote.marketCap,
        upperCircuit: quote.upperCircuit,
        lowerCircuit: quote.lowerCircuit,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        peRatio: quote.peRatio,
        pbRatio: quote.pbRatio,
        dividendYield: quote.dividendYield,
        ema50: quote.ema50,
        ema200: quote.ema200,
        marketDepth: quote.marketDepth,
        intradayCandles: quote.intradayCandles,
        fiveMinCandles: quote.fiveMinCandles,
        sessionDate: quote.sessionDate,
        lastUpdated: new Date(),
      };

      await Stock.findOneAndUpdate(
        { symbol: quote.symbol },
        updateData,
        { upsert: true, new: true }
      );

      updates.push({
        symbol: quote.symbol,
        price: quote.currentPrice,
        change: quote.changeAmount,
        changePercent: quote.changePercent,
        volume: quote.volume,
        vwap: quote.vwap,
        turnover: quote.turnover,
        high: quote.dayHigh,
        low: quote.dayLow,
        depth: quote.marketDepth,
        timestamp: new Date().toISOString(),
      });
    }

    // Emit price updates
    if (io && updates.length > 0) {
      updates.forEach(update => {
        io.emit('price_update', update);
        io.to(`stock:${update.symbol}`).emit('price_update_priority', update);
      });
    }

    // ---- Snapshot trigger at 15:45 IST ----
    const today = marketStatus.sessionDate;
    if (today !== lastSnapshotDate) {
      snapshotCapturedToday = false;
      lastSnapshotDate = today;
    }

    if (isSnapshotTime() && !snapshotCapturedToday) {
      snapshotCapturedToday = true;
      console.log('📸 Snapshot trigger fired!');
      const snapshot = await captureMarketSnapshot();
      if (io && snapshot) {
        io.emit('market_snapshot', snapshot);
      }
    }

  } catch (error) {
    console.error('❌ Error in price ingestion:', error.message);
  }
};

export const forcePriceUpdate = async () => {
  console.log('🔄 Forcing price update...');
  await fetchAndUpdatePrices();
};

export const forceSnapshot = async () => {
  console.log('📸 Forcing snapshot capture...');
  return captureMarketSnapshot();
};

export const getWorkerStatus = () => ({
  isRunning,
  intervalId: !!intervalId,
  snapshotCapturedToday,
  marketStatus: getFullMarketStatus(),
});

export default { initializePriceWorker, startPriceWorker, stopPriceWorker, forcePriceUpdate, forceSnapshot, getWorkerStatus };
