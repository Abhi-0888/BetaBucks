import axios from 'axios';
import env from '../config/env.js';

const YAHOO_BASE_URL = env.YAHOO_FINANCE_BASE_URL;

// Cache for storing prices to avoid redundant calls
const priceCache = new Map();
const CACHE_TTL = 10000; // 10 seconds

// Fetch single stock quote
export const fetchSingleQuote = async (symbol) => {
  try {
    // Check cache
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const url = `${YAHOO_BASE_URL}/v8/finance/chart/${symbol}?interval=1d`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const result = response.data.chart.result?.[0];
    if (!result) {
      throw new Error(`No data available for ${symbol}`);
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const close = quote?.close?.[quote.close.length - 1];

    const data = {
      symbol,
      currentPrice: close || meta.regularMarketPrice || 0,
      previousClose: meta.previousClose || meta.chartPreviousClose || 0,
      dayHigh: meta.regularMarketDayHigh || 0,
      dayLow: meta.regularMarketDayLow || 0,
      volume: meta.regularMarketVolume || 0,
      changeAmount: 0,
      changePercent: 0,
      marketCap: meta.marketCap || null,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null,
      currency: meta.currency || 'INR',
      lastUpdated: new Date(),
    };

    // Calculate change
    if (data.previousClose > 0) {
      data.changeAmount = data.currentPrice - data.previousClose;
      data.changePercent = (data.changeAmount / data.previousClose) * 100;
    }

    // Update cache
    priceCache.set(symbol, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    return null;
  }
};

// Fetch batch quotes for multiple stocks
export const fetchBatchQuotes = async (symbols) => {
  try {
    if (!symbols || symbols.length === 0) return [];

    const symbolsParam = symbols.join(',');
    const url = `${YAHOO_BASE_URL}/v7/finance/quote?symbols=${symbolsParam}`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const quotes = response.data.quoteResponse?.result || [];
    
    return quotes.map(quote => {
      const currentPrice = quote.regularMarketPrice || 0;
      const previousClose = quote.regularMarketPreviousClose || quote.previousClose || 0;
      const changeAmount = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (changeAmount / previousClose) * 100 : 0;

      return {
        symbol: quote.symbol,
        shortName: quote.shortName || quote.longName || quote.symbol,
        currentPrice,
        previousClose,
        dayHigh: quote.regularMarketDayHigh || 0,
        dayLow: quote.regularMarketDayLow || 0,
        volume: quote.regularMarketVolume || 0,
        changeAmount,
        changePercent,
        marketCap: quote.marketCap || null,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
        peRatio: quote.trailingPE || null,
        pbRatio: quote.priceToBook || null,
        dividendYield: quote.dividendYield ? quote.dividendYield * 100 : null,
        currency: quote.currency || 'INR',
        lastUpdated: new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching batch quotes:', error.message);
    return [];
  }
};

// Fetch historical data for charts
export const fetchHistory = async (symbol, range = '1d', interval = '5m') => {
  try {
    const validRanges = ['1d', '5d', '1mo', '3mo', '6mo', '1y'];
    const validIntervals = ['1m', '5m', '15m', '30m', '1h', '1d'];
    
    if (!validRanges.includes(range)) range = '1d';
    if (!validIntervals.includes(interval)) interval = '5m';

    const url = `${YAHOO_BASE_URL}/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const result = response.data.chart.result?.[0];
    if (!result) {
      throw new Error('No historical data available');
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const { open, high, low, close, volume } = quote;

    // Map to OHLCV format
    const data = timestamps.map((timestamp, index) => ({
      timestamp: new Date(timestamp * 1000).toISOString(),
      open: open?.[index] || close?.[index] || 0,
      high: high?.[index] || close?.[index] || 0,
      low: low?.[index] || close?.[index] || 0,
      close: close?.[index] || 0,
      volume: volume?.[index] || 0,
    })).filter(d => d.close > 0);

    return {
      symbol,
      range,
      interval,
      data,
      currency: result.meta.currency || 'INR',
      exchangeName: result.meta.exchangeName,
    };
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error.message);
    return null;
  }
};

// Search for stocks
export const searchSymbols = async (query) => {
  try {
    if (!query || query.length < 1) return [];

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const quotes = response.data.quotes || [];
    
    // Filter for NSE and BSE stocks
    return quotes
      .filter(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')))
      .map(q => ({
        symbol: q.symbol,
        shortName: q.shortname || q.longname || q.symbol,
        exchange: q.exchange || (q.symbol.endsWith('.NS') ? 'NSE' : 'BSE'),
        type: q.typeDisp || 'Equity',
        sector: q.sector || null,
      }))
      .slice(0, 10);
  } catch (error) {
    console.error('Error searching symbols:', error.message);
    return [];
  }
};

// Clear price cache
export const clearCache = () => {
  priceCache.clear();
};

export default {
  fetchSingleQuote,
  fetchBatchQuotes,
  fetchHistory,
  searchSymbols,
  clearCache,
};
