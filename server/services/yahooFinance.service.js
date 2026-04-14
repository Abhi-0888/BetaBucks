import axios from 'axios';
import env from '../config/env.js';
import { getISTNow, getISTDateString } from './marketStatus.service.js';

// Yahoo endpoints to try
const YAHOO_BASE_URLS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

// Cache for storing prices
const priceCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// ============================================================
// STOCK UNIVERSE — Realistic NSE data (Nifty 50 subset)
// ============================================================
const STOCK_DATA = {
  'RELIANCE.NS': { basePrice: 2950, name: 'Reliance Industries', marketCap: 1995000, volatility: 0.015, sector: 'Energy', pe: 22, pb: 2.1, avgVol: 12000000 },
  'TCS.NS': { basePrice: 4250, name: 'Tata Consultancy Services', marketCap: 1558000, volatility: 0.012, sector: 'IT', pe: 28, pb: 5.2, avgVol: 3500000 },
  'INFY.NS': { basePrice: 1480, name: 'Infosys Ltd', marketCap: 612000, volatility: 0.013, sector: 'IT', pe: 25, pb: 3.8, avgVol: 8000000 },
  'HDFCBANK.NS': { basePrice: 1520, name: 'HDFC Bank Ltd', marketCap: 1150000, volatility: 0.014, sector: 'Banking', pe: 18, pb: 2.9, avgVol: 9000000 },
  'ICICIBANK.NS': { basePrice: 1080, name: 'ICICI Bank Ltd', marketCap: 760000, volatility: 0.016, sector: 'Banking', pe: 16, pb: 2.4, avgVol: 11000000 },
  'WIPRO.NS': { basePrice: 465, name: 'Wipro Ltd', marketCap: 243000, volatility: 0.014, sector: 'IT', pe: 19, pb: 2.8, avgVol: 7000000 },
  'SBIN.NS': { basePrice: 890, name: 'State Bank of India', marketCap: 794000, volatility: 0.018, sector: 'Banking', pe: 12, pb: 1.6, avgVol: 18000000 },
  'TATAPOWER.NS': { basePrice: 410, name: 'Tata Power Company Ltd', marketCap: 131000, volatility: 0.025, sector: 'Utilities', pe: 35, pb: 2.2, avgVol: 22000000 },
  'TATASTEEL.NS': { basePrice: 168, name: 'Tata Steel Ltd', marketCap: 209000, volatility: 0.022, sector: 'Metals', pe: 14, pb: 1.2, avgVol: 25000000 },
  'HINDUNILVR.NS': { basePrice: 2320, name: 'Hindustan Unilever Ltd', marketCap: 543000, volatility: 0.010, sector: 'FMCG', pe: 45, pb: 11.2, avgVol: 2000000 },
  'BAJFINANCE.NS': { basePrice: 7020, name: 'Bajaj Finance Ltd', marketCap: 439000, volatility: 0.020, sector: 'Finance', pe: 32, pb: 6.8, avgVol: 4000000 },
  'ADANIENT.NS': { basePrice: 3340, name: 'Adani Enterprises Ltd', marketCap: 380000, volatility: 0.030, sector: 'Conglomerate', pe: 42, pb: 3.5, avgVol: 5000000 },
  'MARUTI.NS': { basePrice: 12750, name: 'Maruti Suzuki India Ltd', marketCap: 382000, volatility: 0.015, sector: 'Auto', pe: 24, pb: 4.1, avgVol: 1200000 },
  'SUNPHARMA.NS': { basePrice: 1780, name: 'Sun Pharmaceutical Ltd', marketCap: 426000, volatility: 0.014, sector: 'Pharma', pe: 28, pb: 3.2, avgVol: 4500000 },
  'ONGC.NS': { basePrice: 278, name: 'ONGC Ltd', marketCap: 350000, volatility: 0.018, sector: 'Energy', pe: 8, pb: 0.9, avgVol: 15000000 },
  'POWERGRID.NS': { basePrice: 335, name: 'Power Grid Corporation Ltd', marketCap: 312000, volatility: 0.012, sector: 'Utilities', pe: 15, pb: 2.1, avgVol: 8000000 },
  'COALINDIA.NS': { basePrice: 460, name: 'Coal India Ltd', marketCap: 283000, volatility: 0.016, sector: 'Mining', pe: 9, pb: 2.8, avgVol: 10000000 },
  'NTPC.NS': { basePrice: 390, name: 'NTPC Ltd', marketCap: 375000, volatility: 0.013, sector: 'Utilities', pe: 17, pb: 1.4, avgVol: 12000000 },
  'LT.NS': { basePrice: 3680, name: 'Larsen & Toubro Ltd', marketCap: 507000, volatility: 0.017, sector: 'Infrastructure', pe: 31, pb: 4.2, avgVol: 3000000 },
  'AXISBANK.NS': { basePrice: 1120, name: 'Axis Bank Ltd', marketCap: 345000, volatility: 0.018, sector: 'Banking', pe: 14, pb: 2.1, avgVol: 10000000 },
};

// ============================================================
// SIMULATION ENGINE — Persistent per-session state
// ============================================================
const currentPrices = new Map();
const sessionState = new Map();   // per-symbol session accumulators
let sessionDateStr = null;

// Get or initialize session state for a symbol
const getSessionState = (symbol) => {
  const today = getISTDateString();
  if (sessionDateStr !== today) {
    sessionDateStr = today;
    sessionState.clear();           // Reset all state on new day
  }
  if (!sessionState.has(symbol)) {
    const stock = STOCK_DATA[symbol];
    if (!stock) return null;
    const open = currentPrices.get(symbol) || stock.basePrice;
    sessionState.set(symbol, {
      openPrice: open,
      dayHigh: open,
      dayLow: open,
      cumulativeVolume: 0,
      cumulativeTurnover: 0,      // sum(price * volume) per tick
      cumulativeVWAPNum: 0,       // numerator for VWAP
      cumulativeVWAPDen: 0,       // denominator for VWAP
      candles1m: [],
      candles5m: [],
      lastCandleMin: -1,
      last5mCandleSlot: -1,
      ema50: open,
      ema200: open,
      tickCount: 0,
    });
  }
  return sessionState.get(symbol);
};

// Initialize current prices
Object.entries(STOCK_DATA).forEach(([symbol, data]) => {
  currentPrices.set(symbol, data.basePrice);
});

// ============================================================
// PRICE UPDATE — Generates full NidhiKosh-grade data
// ============================================================
const updatePrice = (symbol) => {
  const stock = STOCK_DATA[symbol];
  if (!stock) return null;

  const prev = currentPrices.get(symbol) || stock.basePrice;
  const drift = (stock.basePrice - prev) * 0.001;
  const vol = stock.volatility * prev;
  const change = (Math.random() - 0.5) * vol + drift;

  let newPrice = prev + change;
  newPrice = Math.max(newPrice, stock.basePrice * 0.7);
  newPrice = Math.min(newPrice, stock.basePrice * 1.3);
  newPrice = Math.round(newPrice * 100) / 100;

  currentPrices.set(symbol, newPrice);

  // ---- Session State ----
  const ss = getSessionState(symbol);
  if (!ss) return null;

  ss.tickCount++;

  // Track High/Low
  if (newPrice > ss.dayHigh) ss.dayHigh = newPrice;
  if (newPrice < ss.dayLow) ss.dayLow = newPrice;

  // Volume for this tick
  const tickVolume = Math.floor((stock.avgVol / 25) * (0.3 + Math.random() * 1.4));
  ss.cumulativeVolume += tickVolume;

  // Turnover
  const tickTurnover = tickVolume * newPrice;
  ss.cumulativeTurnover += tickTurnover;

  // VWAP accumulator
  ss.cumulativeVWAPNum += newPrice * tickVolume;
  ss.cumulativeVWAPDen += tickVolume;
  const vwap = ss.cumulativeVWAPDen > 0
    ? Math.round((ss.cumulativeVWAPNum / ss.cumulativeVWAPDen) * 100) / 100
    : newPrice;

  // EMA updates (exponential moving average approximation)
  const k50 = 2 / 51;
  const k200 = 2 / 201;
  ss.ema50 = Math.round((newPrice * k50 + ss.ema50 * (1 - k50)) * 100) / 100;
  ss.ema200 = Math.round((newPrice * k200 + ss.ema200 * (1 - k200)) * 100) / 100;

  // ---- 1-minute candle ----
  const now = getISTNow();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (currentMin !== ss.lastCandleMin) {
    ss.candles1m.push({
      t: new Date(), o: newPrice, h: newPrice, l: newPrice, c: newPrice, v: tickVolume,
    });
    ss.lastCandleMin = currentMin;
    // Keep max 375 candles (full session)
    if (ss.candles1m.length > 400) ss.candles1m.shift();
  } else {
    const last = ss.candles1m[ss.candles1m.length - 1];
    if (last) {
      if (newPrice > last.h) last.h = newPrice;
      if (newPrice < last.l) last.l = newPrice;
      last.c = newPrice;
      last.v += tickVolume;
    }
  }

  // ---- 5-minute candle ----
  const fiveMinSlot = Math.floor(currentMin / 5);
  if (fiveMinSlot !== ss.last5mCandleSlot) {
    ss.candles5m.push({
      t: new Date(), o: newPrice, h: newPrice, l: newPrice, c: newPrice, v: tickVolume,
    });
    ss.last5mCandleSlot = fiveMinSlot;
    if (ss.candles5m.length > 80) ss.candles5m.shift();
  } else {
    const last5 = ss.candles5m[ss.candles5m.length - 1];
    if (last5) {
      if (newPrice > last5.h) last5.h = newPrice;
      if (newPrice < last5.l) last5.l = newPrice;
      last5.c = newPrice;
      last5.v += tickVolume;
    }
  }

  // ---- Market Depth (simulated Top 5 Bid/Ask) ----
  const spread = newPrice * 0.001;
  const bids = Array.from({ length: 5 }, (_, i) => ({
    price: Math.round((newPrice - spread * (i + 1)) * 100) / 100,
    qty: Math.floor(Math.random() * 5000 + 500) * (5 - i),
    orders: Math.floor(Math.random() * 50 + 5),
  }));
  const asks = Array.from({ length: 5 }, (_, i) => ({
    price: Math.round((newPrice + spread * (i + 1)) * 100) / 100,
    qty: Math.floor(Math.random() * 5000 + 500) * (5 - i),
    orders: Math.floor(Math.random() * 50 + 5),
  }));
  const totalBuyQty = bids.reduce((s, b) => s + b.qty, 0);
  const totalSellQty = asks.reduce((s, a) => s + a.qty, 0);

  // ---- Circuit Limits (±20% of previous close for large cap) ----
  const prevClose = stock.basePrice;
  const upperCircuit = Math.round(prevClose * 1.20 * 100) / 100;
  const lowerCircuit = Math.round(prevClose * 0.80 * 100) / 100;

  // ---- Official Close (weighted avg of last 30 candles — simulated) ----
  const last30 = ss.candles1m.slice(-30);
  const officialClose = last30.length > 0
    ? Math.round(
        last30.reduce((sum, c) => sum + c.c * c.v, 0) /
        Math.max(1, last30.reduce((sum, c) => sum + c.v, 0))
        * 100
      ) / 100
    : newPrice;

  const changeAmount = Math.round((newPrice - prevClose) * 100) / 100;
  const changePercent = Math.round(((newPrice - prevClose) / prevClose) * 10000) / 100;

  return {
    symbol,
    shortName: stock.name,
    sector: stock.sector,
    exchange: 'NSE',
    currentPrice: newPrice,
    previousClose: prevClose,
    openPrice: ss.openPrice,
    dayHigh: Math.round(ss.dayHigh * 100) / 100,
    dayLow: Math.round(ss.dayLow * 100) / 100,
    officialClose,
    volume: ss.cumulativeVolume,
    turnover: Math.round(ss.cumulativeTurnover),
    avgDailyVolume: stock.avgVol,
    vwap,
    changeAmount,
    changePercent,
    marketCap: stock.marketCap * 1000000000,
    upperCircuit,
    lowerCircuit,
    fiftyTwoWeekHigh: Math.round(stock.basePrice * 1.45),
    fiftyTwoWeekLow: Math.round(stock.basePrice * 0.55),
    peRatio: stock.pe,
    pbRatio: stock.pb,
    dividendYield: Math.round((Math.random() * 2 + 0.5) * 10) / 10,
    ema50: ss.ema50,
    ema200: ss.ema200,
    marketDepth: { bids, asks, totalBuyQty, totalSellQty },
    intradayCandles: ss.candles1m,
    fiveMinCandles: ss.candles5m,
    sessionDate: getISTDateString(),
    currency: 'INR',
    lastUpdated: new Date(),
    isMock: true,
    dataSource: 'simulated',
  };
};

// ============================================================
// PUBLIC API
// ============================================================

const generateStockData = (symbol) => {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = updatePrice(symbol);
  if (data) priceCache.set(symbol, { data, timestamp: Date.now() });
  return data;
};

export const fetchSingleQuote = async (symbol) => {
  try {
    for (const baseUrl of YAHOO_BASE_URLS) {
      try {
        const url = `${baseUrl}/v8/finance/chart/${symbol}?interval=1d`;
        const response = await axios.get(url, {
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        const result = response.data.chart?.result?.[0];
        if (result) {
          const meta = result.meta;
          const quote = result.indicators?.quote?.[0];
          const close = quote?.close?.filter(c => c !== null);
          const currentPrice = close?.[close.length - 1] || meta.regularMarketPrice || 0;
          if (currentPrice > 0) {
            currentPrices.set(symbol, currentPrice);
            const data = {
              symbol, shortName: meta.shortName || symbol,
              currentPrice: Math.round(currentPrice * 100) / 100,
              previousClose: meta.previousClose || currentPrice,
              dayHigh: meta.regularMarketDayHigh || currentPrice * 1.01,
              dayLow: meta.regularMarketDayLow || currentPrice * 0.99,
              volume: meta.regularMarketVolume || 0,
              marketCap: meta.marketCap || null,
              currency: meta.currency || 'INR',
              lastUpdated: new Date(), isMock: false, dataSource: 'yahoo',
            };
            priceCache.set(symbol, { data, timestamp: Date.now() });
            return data;
          }
        }
      } catch (err) { continue; }
    }
    return generateStockData(symbol);
  } catch (error) {
    return generateStockData(symbol);
  }
};

export const fetchBatchQuotes = async (symbols) => {
  if (!symbols || symbols.length === 0) return [];
  const results = symbols.map(symbol => generateStockData(symbol));
  // Background Yahoo sync (non-blocking)
  symbols.forEach(async (symbol) => {
    try {
      for (const baseUrl of YAHOO_BASE_URLS) {
        const url = `${baseUrl}/v8/finance/chart/${symbol}?interval=1d`;
        const resp = await axios.get(url, { timeout: 3000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const r = resp.data.chart?.result?.[0];
        if (r?.meta?.regularMarketPrice) currentPrices.set(symbol, r.meta.regularMarketPrice);
        break;
      } 
    } catch (err) { /* ignore */ }
  });
  return results.filter(r => r !== null);
};

// Generate mock historical data — enhanced for TradingView
const generateMockHistory = (symbol, range, interval) => {
  const stock = STOCK_DATA[symbol] || { basePrice: 1000, name: symbol, volatility: 0.015 };
  const basePrice = currentPrices.get(symbol) || stock.basePrice;

  const config = {
    '1d':  { points: 375, stepMs: 60000 },         // 1-min candles for a full day
    '5d':  { points: 75 * 5, stepMs: 300000 },     // 5-min candles
    '1mo': { points: 22, stepMs: 86400000 },        // daily
    '3mo': { points: 66, stepMs: 86400000 },
    '6mo': { points: 132, stepMs: 86400000 },
    '1y':  { points: 252, stepMs: 86400000 },
  };
  const { points, stepMs } = config[range] || config['1d'];

  const data = [];
  let price = basePrice * (0.95 + Math.random() * 0.1);
  const now = Date.now();
  let cumulativeVol = 0;
  let cumulativeVwapNum = 0;

  for (let i = points - 1; i >= 0; i--) {
    const v = (Math.random() - 0.5) * stock.volatility * (range === '1d' ? 0.3 : 0.8);
    price = price * (1 + v);
    const vol = Math.floor(Math.random() * (stock.avgVol || 1000000) / points) + 1000;
    cumulativeVol += vol;
    cumulativeVwapNum += price * vol;

    const ts = new Date(now - i * stepMs);
    data.push({
      timestamp: ts.toISOString(),
      time: Math.floor(ts.getTime() / 1000),
      open: Math.round(price * 0.9985 * 100) / 100,
      high: Math.round(price * 1.003 * 100) / 100,
      low: Math.round(price * 0.997 * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume: vol,
      vwap: cumulativeVol > 0 ? Math.round((cumulativeVwapNum / cumulativeVol) * 100) / 100 : price,
    });
  }

  return { symbol, range, interval, data, currency: 'INR', exchangeName: 'NSE', isMock: true };
};

export const fetchHistory = async (symbol, range = '1d', interval = '5m') => {
  try {
    const validRanges = ['1d', '5d', '1mo', '3mo', '6mo', '1y'];
    const validIntervals = ['1m', '5m', '15m', '30m', '1h', '1d'];
    if (!validRanges.includes(range)) range = '1d';
    if (!validIntervals.includes(interval)) interval = '5m';

    for (const baseUrl of YAHOO_BASE_URLS) {
      try {
        const url = `${baseUrl}/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
        const response = await axios.get(url, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json' },
        });
        const result = response.data.chart?.result?.[0];
        if (!result) continue;
        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const { open, high, low, close, volume } = quote;
        const data = timestamps.map((timestamp, index) => ({
          timestamp: new Date(timestamp * 1000).toISOString(),
          time: timestamp,
          open: open?.[index] || close?.[index] || 0,
          high: high?.[index] || close?.[index] || 0,
          low: low?.[index] || close?.[index] || 0,
          close: close?.[index] || 0,
          volume: volume?.[index] || 0,
        })).filter(d => d.close > 0);
        return { symbol, range, interval, data, currency: result.meta.currency || 'INR', exchangeName: result.meta.exchangeName, isMock: false };
      } catch (err) { continue; }
    }
    return generateMockHistory(symbol, range, interval);
  } catch (error) {
    return generateMockHistory(symbol, range, interval);
  }
};

export const searchSymbols = async (query) => {
  try {
    if (!query || query.length < 1) return [];
    const localResults = Object.entries(STOCK_DATA)
      .filter(([symbol, data]) => symbol.toLowerCase().includes(query.toLowerCase()) || data.name.toLowerCase().includes(query.toLowerCase()))
      .map(([symbol, data]) => ({ symbol, shortName: data.name, exchange: 'NSE', type: 'Equity', sector: data.sector }));
    try {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
      const quotes = response.data.quotes || [];
      const apiResults = quotes
        .filter(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')))
        .map(q => ({ symbol: q.symbol, shortName: q.shortname || q.longname || q.symbol, exchange: q.exchange || (q.symbol.endsWith('.NS') ? 'NSE' : 'BSE'), type: q.typeDisp || 'Equity', sector: q.sector || null }))
        .slice(0, 10);
      return apiResults.length > 0 ? apiResults : localResults;
    } catch { return localResults; }
  } catch (error) {
    return Object.entries(STOCK_DATA)
      .filter(([symbol, data]) => symbol.toLowerCase().includes(query.toLowerCase()) || data.name.toLowerCase().includes(query.toLowerCase()))
      .map(([symbol, data]) => ({ symbol, shortName: data.name, exchange: 'NSE', type: 'Equity', sector: data.sector }))
      .slice(0, 10);
  }
};

export const getStockUniverse = () => STOCK_DATA;
export const clearCache = () => { priceCache.clear(); };

export default { fetchSingleQuote, fetchBatchQuotes, fetchHistory, searchSymbols, clearCache, getStockUniverse };
