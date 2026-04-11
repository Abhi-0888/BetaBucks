import axios from 'axios';
import env from '../config/env.js';

// Yahoo endpoints to try
const YAHOO_BASE_URLS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

// Cache for storing prices
const priceCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Realistic base prices for NSE stocks (April 2024 market values)
const STOCK_DATA = {
  'RELIANCE.NS': { 
    basePrice: 2950, name: 'Reliance Industries', marketCap: 1995000,
    volatility: 0.015, sector: 'Energy', pe: 22, pb: 2.1
  },
  'TCS.NS': { 
    basePrice: 4250, name: 'Tata Consultancy Services', marketCap: 1558000,
    volatility: 0.012, sector: 'IT', pe: 28, pb: 5.2
  },
  'INFY.NS': { 
    basePrice: 1480, name: 'Infosys Ltd', marketCap: 612000,
    volatility: 0.013, sector: 'IT', pe: 25, pb: 3.8
  },
  'HDFCBANK.NS': { 
    basePrice: 1520, name: 'HDFC Bank Ltd', marketCap: 1150000,
    volatility: 0.014, sector: 'Banking', pe: 18, pb: 2.9
  },
  'ICICIBANK.NS': { 
    basePrice: 1080, name: 'ICICI Bank Ltd', marketCap: 760000,
    volatility: 0.016, sector: 'Banking', pe: 16, pb: 2.4
  },
  'WIPRO.NS': { 
    basePrice: 465, name: 'Wipro Ltd', marketCap: 243000,
    volatility: 0.014, sector: 'IT', pe: 19, pb: 2.8
  },
  'SBIN.NS': { 
    basePrice: 890, name: 'State Bank of India', marketCap: 794000,
    volatility: 0.018, sector: 'Banking', pe: 12, pb: 1.6
  },
  'TATAPOWER.NS': { 
    basePrice: 410, name: 'Tata Power Company Ltd', marketCap: 131000,
    volatility: 0.025, sector: 'Utilities', pe: 35, pb: 2.2
  },
  'TATASTEEL.NS': { 
    basePrice: 168, name: 'Tata Steel Ltd', marketCap: 209000,
    volatility: 0.022, sector: 'Metals', pe: 14, pb: 1.2
  },
  'HINDUNILVR.NS': { 
    basePrice: 2320, name: 'Hindustan Unilever Ltd', marketCap: 543000,
    volatility: 0.010, sector: 'FMCG', pe: 45, pb: 11.2
  },
  'BAJFINANCE.NS': { 
    basePrice: 7020, name: 'Bajaj Finance Ltd', marketCap: 439000,
    volatility: 0.020, sector: 'Finance', pe: 32, pb: 6.8
  },
  'ADANIENT.NS': { 
    basePrice: 3340, name: 'Adani Enterprises Ltd', marketCap: 380000,
    volatility: 0.030, sector: 'Conglomerate', pe: 42, pb: 3.5
  },
  'MARUTI.NS': { 
    basePrice: 12750, name: 'Maruti Suzuki India Ltd', marketCap: 382000,
    volatility: 0.015, sector: 'Auto', pe: 24, pb: 4.1
  },
  'SUNPHARMA.NS': { 
    basePrice: 1780, name: 'Sun Pharmaceutical Ltd', marketCap: 426000,
    volatility: 0.014, sector: 'Pharma', pe: 28, pb: 3.2
  },
  'ONGC.NS': { 
    basePrice: 278, name: 'ONGC Ltd', marketCap: 350000,
    volatility: 0.018, sector: 'Energy', pe: 8, pb: 0.9
  },
  'POWERGRID.NS': { 
    basePrice: 335, name: 'Power Grid Corporation Ltd', marketCap: 312000,
    volatility: 0.012, sector: 'Utilities', pe: 15, pb: 2.1
  },
  'COALINDIA.NS': { 
    basePrice: 460, name: 'Coal India Ltd', marketCap: 283000,
    volatility: 0.016, sector: 'Mining', pe: 9, pb: 2.8
  },
  'NTPC.NS': { 
    basePrice: 390, name: 'NTPC Ltd', marketCap: 375000,
    volatility: 0.013, sector: 'Utilities', pe: 17, pb: 1.4
  },
  'LT.NS': { 
    basePrice: 3680, name: 'Larsen & Toubro Ltd', marketCap: 507000,
    volatility: 0.017, sector: 'Infrastructure', pe: 31, pb: 4.2
  },
  'AXISBANK.NS': { 
    basePrice: 1120, name: 'Axis Bank Ltd', marketCap: 345000,
    volatility: 0.018, sector: 'Banking', pe: 14, pb: 2.1
  },
};

// Store current prices (will drift over time like real market)
const currentPrices = new Map();

// Initialize current prices
Object.entries(STOCK_DATA).forEach(([symbol, data]) => {
  currentPrices.set(symbol, data.basePrice);
});

// Simulate realistic price movement
const updatePrice = (symbol) => {
  const stock = STOCK_DATA[symbol];
  if (!stock) return null;

  const currentPrice = currentPrices.get(symbol) || stock.basePrice;
  // Random walk with slight mean reversion toward base price
  const drift = (stock.basePrice - currentPrice) * 0.001; // Small pull to base
  const volatility = stock.volatility * currentPrice;
  const change = (Math.random() - 0.5) * volatility + drift;
  
  let newPrice = currentPrice + change;
  newPrice = Math.max(newPrice, stock.basePrice * 0.7); // Floor at 70% of base
  newPrice = Math.min(newPrice, stock.basePrice * 1.3); // Cap at 130% of base
  
  currentPrices.set(symbol, newPrice);
  
  const changeAmount = newPrice - stock.basePrice;
  const changePercent = (changeAmount / stock.basePrice) * 100;
  
  // Realistic volume based on price and volatility
  const baseVolume = Math.floor(50000000 / stock.basePrice);
  const volume = Math.floor(baseVolume * (0.5 + Math.random()));
  
  return {
    symbol,
    shortName: stock.name,
    currentPrice: Math.round(newPrice * 100) / 100,
    previousClose: stock.basePrice,
    dayHigh: Math.round(newPrice * 1.02 * 100) / 100,
    dayLow: Math.round(newPrice * 0.98 * 100) / 100,
    volume: volume,
    changeAmount: Math.round(changeAmount * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    marketCap: stock.marketCap * 1000000000, // Convert to rupees
    fiftyTwoWeekHigh: Math.round(stock.basePrice * 1.45),
    fiftyTwoWeekLow: Math.round(stock.basePrice * 0.55),
    peRatio: stock.pe,
    pbRatio: stock.pb,
    dividendYield: Math.round((Math.random() * 2 + 0.5) * 10) / 10,
    currency: 'INR',
    lastUpdated: new Date(),
    isMock: true,
    dataSource: 'simulated'
  };
};

// Generate complete stock data
const generateStockData = (symbol) => {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = updatePrice(symbol);
  if (data) {
    priceCache.set(symbol, { data, timestamp: Date.now() });
  }
  return data;
};

// Fetch single stock quote (uses simulated market data)
export const fetchSingleQuote = async (symbol) => {
  try {
    // Try Yahoo Finance first
    for (const baseUrl of YAHOO_BASE_URLS) {
      try {
        const url = `${baseUrl}/v8/finance/chart/${symbol}?interval=1d`;
        const response = await axios.get(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        const result = response.data.chart?.result?.[0];
        if (result) {
          const meta = result.meta;
          const quote = result.indicators?.quote?.[0];
          const close = quote?.close?.filter(c => c !== null);
          const currentPrice = close?.[close.length - 1] || meta.regularMarketPrice || 0;
          
          if (currentPrice > 0) {
            // Update our simulated price to match real data
            currentPrices.set(symbol, currentPrice);
            
            const data = {
              symbol,
              shortName: meta.shortName || symbol,
              currentPrice: Math.round(currentPrice * 100) / 100,
              previousClose: meta.previousClose || currentPrice,
              dayHigh: meta.regularMarketDayHigh || currentPrice * 1.01,
              dayLow: meta.regularMarketDayLow || currentPrice * 0.99,
              volume: meta.regularMarketVolume || 0,
              marketCap: meta.marketCap || null,
              currency: meta.currency || 'INR',
              lastUpdated: new Date(),
              isMock: false,
              dataSource: 'yahoo'
            };
            priceCache.set(symbol, { data, timestamp: Date.now() });
            return data;
          }
        }
      } catch (err) {
        continue;
      }
    }
    
    // Fall back to simulated data
    return generateStockData(symbol);
  } catch (error) {
    return generateStockData(symbol);
  }
};

// Fetch batch quotes for multiple stocks (uses simulated data with Yahoo fallback)
export const fetchBatchQuotes = async (symbols) => {
  if (!symbols || symbols.length === 0) return [];

  // Update all prices first (simulated market movement)
  const results = symbols.map(symbol => generateStockData(symbol));
  
  // Try to fetch real data in background (don't block)
  symbols.forEach(async (symbol) => {
    try {
      for (const baseUrl of YAHOO_BASE_URLS) {
        const url = `${baseUrl}/v8/finance/chart/${symbol}?interval=1d`;
        const response = await axios.get(url, {
          timeout: 3000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        
        const result = response.data.chart?.result?.[0];
        if (result?.meta?.regularMarketPrice) {
          // Update simulated price to match real data
          currentPrices.set(symbol, result.meta.regularMarketPrice);
        }
        break;
      }
    } catch (err) {
      // Ignore errors, simulated data is already returned
    }
  });
  
  return results.filter(r => r !== null);
};

// Generate mock historical data
const generateMockHistory = (symbol, range, interval) => {
  const stock = STOCK_DATA[symbol] || { basePrice: 1000, name: symbol };
  const basePrice = currentPrices.get(symbol) || stock.basePrice;
  
  const rangePoints = {
    '1d': 24, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365
  };
  
  const points = rangePoints[range] || 24;
  const data = [];
  let currentPrice = basePrice;
  
  const now = Date.now();
  for (let i = points - 1; i >= 0; i--) {
    const variation = (Math.random() - 0.5) * stock.volatility * 0.5;
    currentPrice = currentPrice * (1 + variation);
    
    const timestamp = new Date(now - i * 86400000).toISOString();
    data.push({
      timestamp,
      open: Math.round(currentPrice * 0.998 * 100) / 100,
      high: Math.round(currentPrice * 1.005 * 100) / 100,
      low: Math.round(currentPrice * 0.995 * 100) / 100,
      close: Math.round(currentPrice * 100) / 100,
      volume: Math.floor(Math.random() * 1000000) + 500000,
    });
  }
  
  return {
    symbol,
    range,
    interval,
    data,
    currency: 'INR',
    exchangeName: 'NSE',
    isMock: true,
  };
};

// Fetch historical data for charts with fallback
export const fetchHistory = async (symbol, range = '1d', interval = '5m') => {
  try {
    const validRanges = ['1d', '5d', '1mo', '3mo', '6mo', '1y'];
    const validIntervals = ['1m', '5m', '15m', '30m', '1h', '1d'];
    
    if (!validRanges.includes(range)) range = '1d';
    if (!validIntervals.includes(interval)) interval = '5m';

    // Try each Yahoo endpoint
    for (const baseUrl of YAHOO_BASE_URLS) {
      try {
        const url = `${baseUrl}/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
        
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        });

        const result = response.data.chart?.result?.[0];
        if (!result) continue;

        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const { open, high, low, close, volume } = quote;

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
          isMock: false,
        };
      } catch (err) {
        continue;
      }
    }
    
    // All failed - return mock data
    console.warn(`All endpoints failed for ${symbol} history, using mock data`);
    return generateMockHistory(symbol, range, interval);
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error.message);
    return generateMockHistory(symbol, range, interval);
  }
};

// Search for stocks (with local fallback)
export const searchSymbols = async (query) => {
  try {
    if (!query || query.length < 1) return [];

    // Local search in stock data
    const localResults = Object.entries(STOCK_DATA)
      .filter(([symbol, data]) => 
        symbol.toLowerCase().includes(query.toLowerCase()) ||
        data.name.toLowerCase().includes(query.toLowerCase())
      )
      .map(([symbol, data]) => ({
        symbol,
        shortName: data.name,
        exchange: 'NSE',
        type: 'Equity',
        sector: data.sector,
      }));

    // Try Yahoo API
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    const quotes = response.data.quotes || [];
    
    // Filter for NSE and BSE stocks
    const apiResults = quotes
      .filter(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')))
      .map(q => ({
        symbol: q.symbol,
        shortName: q.shortname || q.longname || q.symbol,
        exchange: q.exchange || (q.symbol.endsWith('.NS') ? 'NSE' : 'BSE'),
        type: q.typeDisp || 'Equity',
        sector: q.sector || null,
      }))
      .slice(0, 10);
    
    return apiResults.length > 0 ? apiResults : localResults;
  } catch (error) {
    console.warn('Yahoo search failed, using local results');
    return Object.entries(STOCK_DATA)
      .filter(([symbol, data]) => 
        symbol.toLowerCase().includes(query.toLowerCase()) ||
        data.name.toLowerCase().includes(query.toLowerCase())
      )
      .map(([symbol, data]) => ({
        symbol,
        shortName: data.name,
        exchange: 'NSE',
        type: 'Equity',
        sector: data.sector,
      }))
      .slice(0, 10);
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
