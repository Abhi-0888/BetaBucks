/**
 * NidhiKosh Market Status Service
 * 
 * Manages NSE market hours, post-market state, and the "Living Dashboard" logic.
 * Market hours: 09:15 – 15:30 IST (Mon–Fri)
 * Post-close session ends: 15:45 IST
 * Snapshot trigger: 15:45 IST
 */

// NSE holidays for 2024-2026 (sample — extend as needed)
const NSE_HOLIDAYS = new Set([
  '2024-01-26', '2024-03-08', '2024-03-25', '2024-03-29',
  '2024-04-11', '2024-04-14', '2024-04-17', '2024-04-21',
  '2024-05-01', '2024-05-23', '2024-06-17', '2024-07-17',
  '2024-08-15', '2024-10-02', '2024-11-01', '2024-11-15',
  '2024-12-25',
  '2025-02-26', '2025-03-14', '2025-03-31', '2025-04-10',
  '2025-04-14', '2025-04-18', '2025-05-01', '2025-08-15',
  '2025-08-27', '2025-10-02', '2025-10-21', '2025-10-22',
  '2025-11-05', '2025-12-25',
  '2026-01-26', '2026-03-10', '2026-03-30', '2026-04-03',
  '2026-04-14', '2026-05-01', '2026-08-15', '2026-10-02',
  '2026-12-25',
]);

/** Get current time in IST */
export const getISTNow = () => {
  const now = new Date();
  // Convert to IST string, then back to Date-like object
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
};

/** Get today's date string in IST (YYYY-MM-DD) */
export const getISTDateString = (date) => {
  const d = date || getISTNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Minutes since midnight in IST */
const getISTMinutes = (date) => {
  const d = date || getISTNow();
  return d.getHours() * 60 + d.getMinutes();
};

// Time constants (in minutes from midnight)
const PRE_OPEN_START = 9 * 60;          // 09:00
const MARKET_OPEN = 9 * 60 + 15;        // 09:15
const MARKET_CLOSE = 15 * 60 + 30;      // 15:30
const POST_CLOSE_END = 15 * 60 + 45;    // 15:45
const SNAPSHOT_TRIGGER = 15 * 60 + 45;   // 15:45

/** Check if a given date is a trading day */
export const isTradingDay = (date) => {
  const d = date || getISTNow();
  const day = d.getDay();
  if (day === 0 || day === 6) return false; // Weekend
  const dateStr = getISTDateString(d);
  return !NSE_HOLIDAYS.has(dateStr);
};

/** Market phase enum */
export const MarketPhase = {
  PRE_OPEN: 'PRE_OPEN',
  OPEN: 'OPEN',
  POST_CLOSE: 'POST_CLOSE',
  CLOSED: 'CLOSED',
};

/** Get the current market phase */
export const getMarketPhase = () => {
  const ist = getISTNow();
  const mins = getISTMinutes(ist);

  if (!isTradingDay(ist)) return MarketPhase.CLOSED;
  if (mins >= PRE_OPEN_START && mins < MARKET_OPEN) return MarketPhase.PRE_OPEN;
  if (mins >= MARKET_OPEN && mins < MARKET_CLOSE) return MarketPhase.OPEN;
  if (mins >= MARKET_CLOSE && mins < POST_CLOSE_END) return MarketPhase.POST_CLOSE;
  return MarketPhase.CLOSED;
};

/** Is the market currently accepting orders? */
export const isMarketOpen = () => {
  return getMarketPhase() === MarketPhase.OPEN;
};

/** Should we serve the frozen snapshot instead of live data? */
export const shouldServeFrozenData = () => {
  const phase = getMarketPhase();
  return phase === MarketPhase.CLOSED || phase === MarketPhase.POST_CLOSE;
};

/** Should we trigger a snapshot capture? */
export const isSnapshotTime = () => {
  const ist = getISTNow();
  const mins = getISTMinutes(ist);
  return isTradingDay(ist) && mins >= SNAPSHOT_TRIGGER && mins < SNAPSHOT_TRIGGER + 2;
};

/** Get the last trading date (for snapshot retrieval) */
export const getLastTradingDate = () => {
  const ist = getISTNow();
  const mins = getISTMinutes(ist);
  
  // If market hasn't opened today yet, or it's a non-trading day, go back
  let d = new Date(ist);
  
  // If today is a trading day and market has been open at some point, today is last trading date
  if (isTradingDay(d) && mins >= MARKET_OPEN) {
    return getISTDateString(d);
  }
  
  // Otherwise walk backwards to find the last trading day
  for (let i = 0; i < 10; i++) {
    d.setDate(d.getDate() - 1);
    if (isTradingDay(d)) {
      return getISTDateString(d);
    }
  }
  
  return getISTDateString(ist); // fallback
};

/** Full market status object for UI */
export const getFullMarketStatus = () => {
  const ist = getISTNow();
  const phase = getMarketPhase();
  const mins = getISTMinutes(ist);
  const tradingDay = isTradingDay(ist);

  let message = '';
  let timeToEvent = null;

  switch (phase) {
    case MarketPhase.PRE_OPEN:
      message = 'Pre-open session active';
      timeToEvent = MARKET_OPEN - mins;
      break;
    case MarketPhase.OPEN:
      message = 'Market is live';
      timeToEvent = MARKET_CLOSE - mins;
      break;
    case MarketPhase.POST_CLOSE:
      message = 'Post-close session';
      break;
    case MarketPhase.CLOSED:
      if (!tradingDay) {
        message = ist.getDay() === 0 || ist.getDay() === 6
          ? 'Market closed (Weekend)'
          : 'Market closed (Holiday)';
      } else if (mins < PRE_OPEN_START) {
        message = 'Market opens at 09:15 IST';
        timeToEvent = MARKET_OPEN - mins;
      } else {
        message = 'Market closed for the day';
      }
      break;
  }

  return {
    phase,
    isOpen: phase === MarketPhase.OPEN,
    isPreOpen: phase === MarketPhase.PRE_OPEN,
    isPostClose: phase === MarketPhase.POST_CLOSE,
    isClosed: phase === MarketPhase.CLOSED,
    isTradingDay: tradingDay,
    isFrozenMode: shouldServeFrozenData(),
    opensAt: '09:15',
    closesAt: '15:30',
    timezone: 'IST (UTC+05:30)',
    currentIST: ist.toLocaleTimeString('en-IN', { hour12: true }),
    message,
    minutesToEvent: timeToEvent,
    lastTradingDate: getLastTradingDate(),
    sessionDate: getISTDateString(),
  };
};

export default {
  getISTNow,
  getISTDateString,
  isTradingDay,
  getMarketPhase,
  isMarketOpen,
  shouldServeFrozenData,
  isSnapshotTime,
  getLastTradingDate,
  getFullMarketStatus,
  MarketPhase,
};
