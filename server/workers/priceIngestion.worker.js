import { Stock } from '../models/index.js';
import { fetchBatchQuotes } from '../services/yahooFinance.service.js';
import env from '../config/env.js';

let io = null;
let intervalId = null;
let isRunning = false;

// Initialize worker with Socket.io instance
export const initializePriceWorker = (socketIo) => {
  io = socketIo;
  console.log('💰 Price ingestion worker initialized');
};

// Start price ingestion
export const startPriceWorker = () => {
  if (isRunning) {
    console.log('⚠️ Price worker already running');
    return;
  }

  isRunning = true;
  console.log('▶️ Starting price ingestion worker (15s interval)');

  // Immediate first run
  fetchAndUpdatePrices();

  // Set interval (15 seconds)
  intervalId = setInterval(fetchAndUpdatePrices, 15000);
};

// Stop price ingestion
export const stopPriceWorker = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  console.log('⏹️ Price ingestion worker stopped');
};

// Fetch and update prices
const fetchAndUpdatePrices = async () => {
  try {
    const symbols = env.DEFAULT_STOCKS;
    
    console.log(`🔄 Fetching prices for ${symbols.length} stocks...`);
    
    const quotes = await fetchBatchQuotes(symbols);
    
    if (!quotes || quotes.length === 0) {
      console.warn('⚠️ No quotes received - check stock symbols');
      return;
    }
    
    // Log if using simulated data
    const mockCount = quotes.filter(q => q.isMock).length;
    if (mockCount > 0) {
      console.log(`📊 Using simulated data for ${mockCount}/${quotes.length} stocks`);
    }

    // Update database and emit socket events
    const updates = [];
    
    for (const quote of quotes) {
      // Update or create stock in database with all market data
      const updatedStock = await Stock.findOneAndUpdate(
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

      if (updatedStock) {
        updates.push({
          symbol: quote.symbol,
          price: quote.currentPrice,
          change: quote.changeAmount,
          changePercent: quote.changePercent,
          volume: quote.volume,
          high: quote.dayHigh,
          low: quote.dayLow,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Emit to all connected clients via Socket.io
    if (io && updates.length > 0) {
      updates.forEach(update => {
        io.emit('price_update', update);
      });
      
      console.log(`✅ Updated ${updates.length} stocks and emitted price updates`);
    }

  } catch (error) {
    console.error('❌ Error in price ingestion:', error.message);
  }
};

// Force immediate update (for manual refresh)
export const forcePriceUpdate = async () => {
  console.log('🔄 Forcing price update...');
  await fetchAndUpdatePrices();
};

// Get worker status
export const getWorkerStatus = () => ({
  isRunning,
  intervalId: !!intervalId,
});

export default {
  initializePriceWorker,
  startPriceWorker,
  stopPriceWorker,
  forcePriceUpdate,
  getWorkerStatus,
};
