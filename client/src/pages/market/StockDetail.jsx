import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import {
  ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart3, DollarSign,
  Clock, Target, Package, Wallet, Percent, ChevronRight, Sparkles,
  Layers, Shield, Gauge, ArrowUpRight, ArrowDownRight, Minus, Plus,
  ShoppingCart, BadgeDollarSign,
} from 'lucide-react';
import { marketAPI } from '../../api/market.api.js';
import { tradeAPI } from '../../api/trade.api.js';
import { useLivePrice } from '../../hooks/useLivePrice.js';
import { usePortfolio } from '../../hooks/usePortfolio.js';
import OrderModal from '../../components/ui/OrderModal.jsx';
import { formatINR, formatLargeNumber, formatPercent, formatNumber } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

// ============================================================
// TradingView Chart Component
// ============================================================
const TVChart = ({ symbol, range, interval }) => {
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  const { data: histData } = useQuery(
    ['history', symbol, range, interval],
    () => marketAPI.getStockHistory(symbol, range, interval),
    { staleTime: 30000, keepPreviousData: true, retry: 2 }
  );

  useEffect(() => {
    // histData = { success, data: { symbol, range, data: [...candles] } }
    const candles = histData?.data?.data || histData?.data || [];
    if (!containerRef.current || !candles.length) return;

    // Cleanup old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,153,51,0.04)' },
        horzLines: { color: 'rgba(255,153,51,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,153,51,0.3)', width: 1, style: 2 },
        horzLine: { color: 'rgba(255,153,51,0.3)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,153,51,0.1)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'rgba(255,153,51,0.1)',
        timeVisible: range === '1d' || range === '5d',
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Normalize and sort candles — lightweight-charts requires sorted, unique timestamps
    const toUnix = (c) => c.time || Math.floor(new Date(c.timestamp).getTime() / 1000);
    const seen = new Set();
    const sortedCandles = candles
      .map(c => ({ ...c, _time: toUnix(c) }))
      .filter(c => c._time > 0 && c.close > 0 && !seen.has(c._time) && seen.add(c._time))
      .sort((a, b) => a._time - b._time);

    if (sortedCandles.length === 0) return;

    // Main candlestick series (lightweight-charts v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e80',
      wickDownColor: '#ef444480',
    });

    const candleData = sortedCandles.map(c => ({
      time: c._time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    candleSeries.setData(candleData);

    // VWAP overlay line
    const vwapCandles = sortedCandles.filter(c => c.vwap);
    if (vwapCandles.length > 0) {
      const vwapSeries = chart.addSeries(LineSeries, {
        color: '#ff993380',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      vwapSeries.setData(vwapCandles.map(c => ({ time: c._time, value: c.vwap })));
    }

    // Volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    const volumeData = sortedCandles.map(c => ({
      time: c._time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
    }));
    volumeSeries.setData(volumeData);

    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [histData, range]);

  return <div ref={containerRef} className="w-full" />;
};

// ============================================================
// QuickTradePanel — Inline buy/sell from the chart
// ============================================================
const QuickTradePanel = ({ stock, currentPrice, userHolding, balance }) => {
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState('BUY');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const isBuy = mode === 'BUY';
  const total = qty * currentPrice;
  const maxBuyQty = currentPrice > 0 ? Math.floor(balance / currentPrice) : 0;
  const maxSellQty = userHolding?.quantity || 0;

  const executeTrade = async () => {
    if (qty <= 0) return;
    if (isBuy && total > balance) { toast.error('Insufficient balance'); return; }
    if (!isBuy && qty > maxSellQty) { toast.error('Not enough shares'); return; }

    setLoading(true);
    try {
      const res = isBuy
        ? await tradeAPI.buyStock(stock.symbol, qty)
        : await tradeAPI.sellStock(stock.symbol, qty);
      if (res.success) {
        toast.success(`${isBuy ? 'Bought' : 'Sold'} ${qty} × ${stock.symbol.split('.')[0]} @ ${formatINR(currentPrice)}`);
        queryClient.invalidateQueries('portfolio');
        queryClient.invalidateQueries(['stock', stock.symbol]);
        setQty(1);
      }
    } catch (err) {
      console.error('Trade error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-3 p-3 bg-dark-900/60 rounded-xl border border-dark-700/50">
      {/* Mode Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-dark-700 shrink-0">
        <button onClick={() => setMode('BUY')}
          className={`px-4 py-2 text-sm font-semibold transition-all ${isBuy ? 'bg-profit text-white' : 'bg-dark-800 text-dark-500 hover:text-white'}`}>
          <ShoppingCart className="w-3.5 h-3.5 inline mr-1" /> Buy
        </button>
        <button onClick={() => setMode('SELL')}
          className={`px-4 py-2 text-sm font-semibold transition-all ${!isBuy ? 'bg-loss text-white' : 'bg-dark-800 text-dark-500 hover:text-white'}`}>
          <BadgeDollarSign className="w-3.5 h-3.5 inline mr-1" /> Sell
        </button>
      </div>

      {/* Qty Controls */}
      <div className="flex items-center gap-2 flex-1">
        <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 text-center bg-dark-800 border border-dark-700 rounded-lg py-1.5 text-white font-mono font-semibold text-sm focus:outline-none focus:border-saffron/50" />
        <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <div className="flex gap-1 ml-1">
          {[5, 10, 25].map(n => (
            <button key={n} onClick={() => setQty(n)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${qty === n ? 'bg-saffron/15 text-saffron' : 'bg-dark-800 text-dark-500 hover:text-white'}`}>
              {n}
            </button>
          ))}
          {isBuy && maxBuyQty > 0 && (
            <button onClick={() => setQty(maxBuyQty)} className="px-2 py-1 text-xs rounded font-medium bg-dark-800 text-dark-500 hover:text-white">
              Max
            </button>
          )}
        </div>
      </div>

      {/* Total + Execute */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-[10px] text-dark-500 uppercase tracking-wider">Total</div>
          <div className="text-sm font-bold font-mono text-white">{formatINR(total)}</div>
        </div>
        <button onClick={executeTrade} disabled={loading || qty <= 0 || (isBuy && total > balance) || (!isBuy && qty > maxSellQty)}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40 ${
            isBuy ? 'bg-profit hover:bg-green-600 text-white shadow-lg shadow-profit/20' : 'bg-loss hover:bg-red-600 text-white shadow-lg shadow-loss/20'
          }`}>
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isBuy ? 'BUY' : 'SELL'}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// MarketDepth Component — Bid/Ask Table
// ============================================================
const MarketDepthPanel = ({ depth }) => {
  const isClosed = !depth || depth.closed || !depth.bids?.length;

  return (
    <div className="card-vyuha">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-saffron" />
        <h4 className="text-sm font-semibold text-white">Market Depth</h4>
        {isClosed && (
          <span className="ml-auto text-[10px] font-medium bg-dark-700 text-dark-400 px-2 py-0.5 rounded-full">CLOSED</span>
        )}
      </div>
      {isClosed ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-8 h-8 text-dark-600 mb-2" />
          <p className="text-dark-400 text-sm font-medium">Market is closed</p>
          <p className="text-dark-600 text-xs mt-1">Depth data available during market hours (9:15 AM – 3:30 PM IST)</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Bids */}
          <div>
            <div className="flex justify-between text-dark-500 mb-1 px-1">
              <span>Bid</span><span>Qty</span>
            </div>
            {depth.bids.map((b, i) => {
              const maxQty = Math.max(...depth.bids.map(x => x.qty), ...depth.asks.map(x => x.qty), 1);
              return (
                <div key={i} className="relative flex justify-between px-1 py-0.5 rounded">
                  <div className="absolute inset-0 bg-profit/10 rounded" style={{ width: `${(b.qty / maxQty) * 100}%` }} />
                  <span className="relative text-profit font-mono">{formatINR(b.price)}</span>
                  <span className="relative text-dark-400 font-mono">{formatNumber(b.qty)}</span>
                </div>
              );
            })}
            <div className="text-profit text-xs mt-1 px-1 font-semibold">Total: {formatNumber(depth.totalBuyQty)}</div>
          </div>
          {/* Asks */}
          <div>
            <div className="flex justify-between text-dark-500 mb-1 px-1">
              <span>Ask</span><span>Qty</span>
            </div>
            {depth.asks.map((a, i) => {
              const maxQty = Math.max(...depth.bids.map(x => x.qty), ...depth.asks.map(x => x.qty), 1);
              return (
                <div key={i} className="relative flex justify-between px-1 py-0.5 rounded">
                  <div className="absolute inset-0 right-0 bg-loss/10 rounded" style={{ width: `${(a.qty / maxQty) * 100}%`, marginLeft: 'auto' }} />
                  <span className="relative text-loss font-mono">{formatINR(a.price)}</span>
                  <span className="relative text-dark-400 font-mono">{formatNumber(a.qty)}</span>
                </div>
              );
            })}
            <div className="text-loss text-xs mt-1 px-1 font-semibold">Total: {formatNumber(depth.totalSellQty)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// StatCard helper
// ============================================================
const StatCard = ({ label, value, sub, icon: Icon, color = 'text-saffron' }) => (
  <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700/50 hover:border-saffron/20 transition-all group">
    <div className="flex items-center gap-2 text-dark-400 text-xs mb-1.5">
      {Icon && <Icon className={`w-3.5 h-3.5 group-hover:${color} transition-colors`} />}
      <span>{label}</span>
    </div>
    <p className="text-lg font-bold text-white font-mono">{value}</p>
    {sub && <p className="text-xs text-dark-500 mt-0.5">{sub}</p>}
  </div>
);

// ============================================================
// MAIN: StockDetail
// ============================================================
const StockDetail = () => {
  const { symbol } = useParams();
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [chartRange, setChartRange] = useState('1d');
  const [chartInterval, setChartInterval] = useState('5m');

  const { data: stockData, isLoading } = useQuery(
    ['stock', symbol],
    () => marketAPI.getStockDetail(symbol),
    { staleTime: 10000, refetchInterval: 15000, keepPreviousData: true, retry: 2 }
  );

  const { price, changePercent, flash } = useLivePrice(symbol);
  const { holdings, summary } = usePortfolio();

  const stock = stockData?.data;
  const currentPrice = price || stock?.currentPrice || 0;
  const currentChange = changePercent || stock?.changePercent || 0;
  const userHolding = holdings?.holdings?.find(h => h.symbol === symbol);
  const isProfit = currentChange >= 0;

  // Price range bar position
  const priceRangePos = stock?.dayHigh && stock?.dayLow && stock.dayHigh !== stock.dayLow
    ? ((currentPrice - stock.dayLow) / (stock.dayHigh - stock.dayLow)) * 100
    : 50;

  const ranges = [
    { r: '1d', i: '5m', label: '1D' },
    { r: '5d', i: '15m', label: '5D' },
    { r: '1mo', i: '1d', label: '1M' },
    { r: '3mo', i: '1d', label: '3M' },
    { r: '6mo', i: '1d', label: '6M' },
    { r: '1y', i: '1d', label: '1Y' },
  ];

  if (isLoading || !stock) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-dark-800 rounded-lg w-32" />
        <div className="h-48 bg-dark-800 rounded-xl" />
        <div className="h-[360px] bg-dark-800 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-dark-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 animate-fadeIn">
      {/* Back */}
      <Link to="/market" className="inline-flex items-center gap-2 text-dark-400 hover:text-saffron transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium text-sm">Back to Market</span>
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden card-vyuha p-6">
        <div className={`absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-10 ${isProfit ? 'bg-profit' : 'bg-loss'}`} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${
              isProfit ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
            }`}>
              {stock.symbol.split('.')[0].slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{stock.shortName}</h1>
              <div className="flex items-center gap-2 text-dark-400 text-sm mt-1 flex-wrap">
                <span className="font-medium text-white font-mono">{stock.symbol}</span>
                <span className="badge-vyuha">{stock.sector || 'NSE'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold font-mono text-white transition-all duration-300 ${
              flash === 'green' ? 'text-profit scale-[1.02]' : flash === 'red' ? 'text-loss scale-[1.02]' : ''
            }`}>
              {formatINR(currentPrice)}
            </div>
            <div className="flex items-center justify-end gap-2 mt-1.5">
              <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold ${
                isProfit ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
              }`}>
                {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {isProfit ? '+' : ''}{stock.changePercent?.toFixed(2)}%
              </div>
              <span className="text-dark-500 text-sm font-mono">{formatINR(stock.changeAmount)}</span>
            </div>
            {stock.vwap && (
              <div className="text-xs text-dark-500 mt-1 font-mono">VWAP: {formatINR(stock.vwap)}</div>
            )}
          </div>
        </div>

        {/* Price Range Bar */}
        <div className="mt-4 px-1">
          <div className="flex justify-between text-xs text-dark-500 mb-1">
            <span>L: {formatINR(stock.dayLow)}</span>
            <span>H: {formatINR(stock.dayHigh)}</span>
          </div>
          <div className="relative h-2 bg-dark-700 rounded-full overflow-hidden">
            <div className="absolute h-full bg-gradient-to-r from-loss via-saffron to-profit rounded-full" style={{ width: '100%' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-saffron transition-all" style={{ left: `${priceRangePos}%` }} />
          </div>
        </div>

        {/* Buy/Sell */}
        <div className="flex gap-3 mt-5">
          {stock.tradingEnabled === false ? (
            <div className="flex-1 text-center py-3 text-sm rounded-lg bg-dark-800 border border-dark-700 text-dark-400">
              <Clock className="w-4 h-4 inline mr-1.5" />
              Market Closed — Trading resumes at 9:15 AM IST
            </div>
          ) : (
            <>
              <button onClick={() => setIsBuyModalOpen(true)} className="flex-1 btn-success py-3 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" /> Buy
              </button>
              <button onClick={() => setIsSellModalOpen(true)} disabled={!userHolding || userHolding.quantity === 0}
                className="flex-1 btn-danger py-3 text-sm">
                <TrendingDown className="w-4 h-4 mr-1" /> Sell {userHolding ? `(${userHolding.quantity})` : ''}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chart + Quick Trade */}
      <div className="card-vyuha p-4 space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white">Price Chart</h3>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isProfit ? 'bg-profit' : 'bg-loss'}`} />
              <span className="font-mono text-white">{formatINR(currentPrice)}</span>
              <span className={`font-mono ${isProfit ? 'text-profit' : 'text-loss'}`}>
                {isProfit ? '+' : ''}{currentChange?.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            {ranges.map(({ r, i, label }) => (
              <button key={r} onClick={() => { setChartRange(r); setChartInterval(i); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  chartRange === r ? 'bg-saffron/10 text-saffron border border-saffron/30' : 'text-dark-500 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <TVChart symbol={symbol} range={chartRange} interval={chartInterval} />

        {/* Quick Trade Panel — trade from chart (only during market hours) */}
        {stock.tradingEnabled !== false && (
          <QuickTradePanel stock={stock} currentPrice={currentPrice} userHolding={userHolding} balance={summary?.cashBalance || 0} />
        )}
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Open" value={formatINR(stock.openPrice || stock.previousClose)} icon={Activity} />
        <StatCard label="Prev Close" value={formatINR(stock.previousClose)} icon={Clock} />
        <StatCard label="Volume" value={formatLargeNumber(stock.volume)} sub="shares" icon={BarChart3} />
        <StatCard label="Turnover" value={formatLargeNumber(stock.turnover)} icon={DollarSign} />
        <StatCard label="VWAP" value={stock.vwap ? formatINR(stock.vwap) : 'N/A'} icon={Gauge} />
        <StatCard label="Market Cap" value={formatLargeNumber(stock.marketCap)} icon={DollarSign} />
        <StatCard label="Upper Circuit" value={stock.upperCircuit ? formatINR(stock.upperCircuit) : 'N/A'} icon={Shield} />
        <StatCard label="Lower Circuit" value={stock.lowerCircuit ? formatINR(stock.lowerCircuit) : 'N/A'} icon={Shield} />
      </div>

      {/* 52-Week + Fundamentals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="52W High" value={formatINR(stock.fiftyTwoWeekHigh)} icon={Target} />
        <StatCard label="52W Low" value={formatINR(stock.fiftyTwoWeekLow)} icon={Target} />
        <StatCard label="P/E Ratio" value={stock.peRatio?.toFixed(2) || 'N/A'} icon={Percent} />
        <StatCard label="P/B Ratio" value={stock.pbRatio?.toFixed(2) || 'N/A'} icon={Percent} />
        <StatCard label="Div Yield" value={stock.dividendYield ? `${stock.dividendYield}%` : 'N/A'} icon={DollarSign} />
      </div>

      {/* Market Depth + Position */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MarketDepthPanel depth={stock.marketDepth} />

        {userHolding ? (
          <div className="card-vyuha">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-saffron" />
              <h4 className="text-sm font-semibold text-white">Your Position</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-900/50 rounded-lg p-3">
                <div className="text-dark-500 text-xs"><Package className="w-3 h-3 inline mr-1" />Qty</div>
                <div className="text-xl font-bold text-white font-mono">{userHolding.quantity}</div>
              </div>
              <div className="bg-dark-900/50 rounded-lg p-3">
                <div className="text-dark-500 text-xs"><Target className="w-3 h-3 inline mr-1" />Avg Cost</div>
                <div className="text-xl font-bold text-white font-mono">{formatINR(userHolding.averageCostPrice)}</div>
              </div>
              <div className="bg-dark-900/50 rounded-lg p-3">
                <div className="text-dark-500 text-xs"><Wallet className="w-3 h-3 inline mr-1" />Value</div>
                <div className="text-xl font-bold text-white font-mono">{formatINR(userHolding.currentValue)}</div>
              </div>
              <div className="bg-dark-900/50 rounded-lg p-3">
                <div className="text-dark-500 text-xs"><Percent className="w-3 h-3 inline mr-1" />P&L</div>
                <div className={`text-xl font-bold font-mono ${userHolding.unrealisedPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatINR(userHolding.unrealisedPnL)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-vyuha flex flex-col items-center justify-center py-8">
            <Package className="w-10 h-10 text-dark-600 mb-3" />
            <p className="text-white font-medium mb-1">No position</p>
            <p className="text-dark-500 text-sm mb-4">Buy shares to build your portfolio</p>
            <button onClick={() => setIsBuyModalOpen(true)} className="btn-primary px-6 py-2 text-sm">
              Buy Now <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* Order Modals */}
      <OrderModal isOpen={isBuyModalOpen} onClose={() => setIsBuyModalOpen(false)} stock={stock} type="BUY" balance={summary?.cashBalance || 0} />
      <OrderModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} stock={stock} type="SELL" balance={summary?.cashBalance || 0} />
    </div>
  );
};

export default StockDetail;
