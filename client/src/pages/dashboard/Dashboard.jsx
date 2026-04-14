import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, Trophy, Activity, BarChart3,
  Zap, Eye, ArrowUpRight, ArrowDownRight, Clock, Radio, Flame,
  ChevronRight, Volume2,
} from 'lucide-react';
import { useQuery } from 'react-query';
import { usePortfolio } from '../../hooks/usePortfolio.js';
import { useLeaderboard } from '../../hooks/useLeaderboard.js';
import { marketAPI } from '../../api/market.api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { formatINR, formatPercent, formatLargeNumber, formatNumber } from '../../utils/formatters.js';

// ============================================================
// MarketStatusHeader — Phase banner + IST clock
// ============================================================
const MarketStatusHeader = ({ status }) => {
  const phaseClass = status?.isOpen ? 'phase-open' : status?.isPostClose ? 'phase-post' : 'phase-closed';
  const phaseLabel = status?.isOpen ? 'LIVE' : status?.isPostClose ? 'POST-CLOSE' : status?.isFrozenMode ? 'POST-MARKET ANALYSIS' : 'CLOSED';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold gradient-text">NidhiKosh</h1>
        <div className={phaseClass}>
          {status?.isOpen && <Radio className="w-3 h-3 animate-pulse" />}
          {phaseLabel}
        </div>
        {status?.isFrozenMode && (
          <span className="frozen-badge">
            <Eye className="w-3 h-3" /> Frozen Snapshot
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-dark-500 text-sm">
        <Clock className="w-4 h-4" />
        <span className="font-mono">{status?.currentIST || '--:--'}</span>
        <span className="text-dark-600">|</span>
        <span>{status?.message}</span>
      </div>
    </div>
  );
};

// ============================================================
// MarketTicker — Scrolling price ribbon
// ============================================================
const MarketTicker = ({ stocks }) => {
  if (!stocks?.length) return null;
  const tickerStocks = [...stocks, ...stocks];

  return (
    <div className="glow-border rounded-lg py-2 overflow-hidden bg-dark-800/50">
      <div className="flex animate-ticker">
        {tickerStocks.map((stock, i) => (
          <div key={`${stock.symbol}-${i}`} className="flex items-center gap-2 px-5 whitespace-nowrap">
            <span className="text-dark-400 text-xs font-mono">{stock.symbol?.replace('.NS', '')}</span>
            <span className="text-white font-semibold text-sm">{formatINR(stock.currentPrice)}</span>
            <span className={`text-xs font-mono ${stock.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// IndexCard — Nifty 50 / Bank Nifty styled card
// ============================================================
const IndexCard = ({ name, value, change, changePercent, advancers, decliners }) => {
  const isUp = changePercent >= 0;
  return (
    <div className="card-vyuha p-4 animate-slideUp">
      <div className="flex items-center justify-between mb-2">
        <span className="text-dark-400 text-xs font-medium uppercase tracking-wider">{name}</span>
        {isUp ? <ArrowUpRight className="w-4 h-4 text-profit" /> : <ArrowDownRight className="w-4 h-4 text-loss" />}
      </div>
      <div className="text-2xl font-bold text-white font-mono">{value?.toLocaleString('en-IN')}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-sm font-semibold ${isUp ? 'text-profit' : 'text-loss'}`}>
          {isUp ? '+' : ''}{change?.toFixed(2)} ({isUp ? '+' : ''}{changePercent?.toFixed(2)}%)
        </span>
      </div>
      {(advancers !== undefined) && (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 bg-dark-700 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-profit rounded-full" style={{ width: `${(advancers / Math.max(1, advancers + decliners)) * 100}%` }} />
          </div>
          <span className="text-xs text-dark-500">{advancers}A/{decliners}D</span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// PortfolioSummaryCards
// ============================================================
const PortfolioSummaryCards = ({ stats }) => {
  const cards = [
    { title: 'Portfolio Value', value: formatINR(stats?.totalPortfolioValue), icon: Wallet, color: 'saffron' },
    { title: 'Cash Balance', value: formatINR(stats?.cashBalance), icon: Activity, color: 'accent-400' },
    { title: 'Unrealized P&L', value: formatINR(stats?.unrealisedPnL), icon: TrendingUp, trend: stats?.unrealisedPnL },
    { title: 'Total Invested', value: formatINR(stats?.totalInvested), icon: BarChart3, color: 'primary-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="card-hover p-3 animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-dark-500 text-xs">{c.title}</span>
            <c.icon className="w-4 h-4 text-saffron/60" />
          </div>
          <div className={`text-lg font-bold font-mono ${
            c.trend !== undefined ? (c.trend >= 0 ? 'text-profit' : 'text-loss') : 'text-white'
          }`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// SectorHeatmap — Color-coded sector performance grid
// ============================================================
const SectorHeatmap = ({ heatmapData }) => {
  if (!heatmapData?.length) return null;

  const getHeatColor = (change) => {
    if (change >= 2) return 'bg-profit/30 border-profit/40';
    if (change >= 1) return 'bg-profit/20 border-profit/30';
    if (change >= 0.3) return 'bg-profit/10 border-profit/20';
    if (change >= -0.3) return 'bg-dark-700/50 border-dark-600';
    if (change >= -1) return 'bg-loss/10 border-loss/20';
    if (change >= -2) return 'bg-loss/20 border-loss/30';
    return 'bg-loss/30 border-loss/40';
  };

  return (
    <div className="card-vyuha">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-saffron" />
        <h3 className="text-lg font-semibold text-white">Sector Heatmap</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {heatmapData.map((s) => (
          <div key={s.sector} className={`heatmap-cell border ${getHeatColor(s.avgChange)}`}>
            <div className="text-xs text-dark-400 font-medium truncate">{s.sector}</div>
            <div className={`text-lg font-bold font-mono ${s.avgChange >= 0 ? 'text-profit' : 'text-loss'}`}>
              {s.avgChange >= 0 ? '+' : ''}{s.avgChange?.toFixed(2)}%
            </div>
            <div className="text-xs text-dark-500 mt-1">{s.stockCount} stocks</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// MoversTable — Top Gainers / Losers tabs
// ============================================================
const MoversTable = ({ movers }) => {
  const [tab, setTab] = useState('gainers');
  const data = tab === 'gainers' ? movers?.topGainers
    : tab === 'losers' ? movers?.topLosers
    : tab === 'volume' ? movers?.volumeShockers
    : movers?.valueLeaders;

  return (
    <div className="card-vyuha">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-saffron" />
        <h3 className="text-lg font-semibold text-white">Vyuha Movers</h3>
      </div>
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {[
          { key: 'gainers', label: 'Gainers', icon: TrendingUp },
          { key: 'losers', label: 'Losers', icon: TrendingDown },
          { key: 'volume', label: 'Vol. Shock', icon: Volume2 },
          { key: 'value', label: 'Value', icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === key ? 'bg-saffron/10 text-saffron border border-saffron/30' : 'text-dark-500 hover:text-white hover:bg-dark-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
        {data?.slice(0, 8).map((s, i) => (
          <Link
            key={s.symbol}
            to={`/market/${s.symbol}`}
            className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/50 hover:bg-dark-700/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-dark-600 text-xs font-mono w-5">{i + 1}</span>
              <div>
                <div className="text-white text-sm font-medium group-hover:text-saffron transition-colors">
                  {s.symbol?.replace('.NS', '')}
                </div>
                <div className="text-dark-500 text-xs truncate max-w-[120px]">{s.shortName}</div>
              </div>
            </div>
            <div className="text-right">
              {tab === 'volume' ? (
                <>
                  <div className="text-white text-sm font-mono">{s.volumeRatio?.toFixed(1)}x</div>
                  <div className={`text-xs ${s.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
                  </div>
                </>
              ) : tab === 'value' ? (
                <>
                  <div className="text-white text-sm font-mono">{formatLargeNumber(s.turnover)}</div>
                  <div className={`text-xs ${s.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
                  </div>
                </>
              ) : (
                <>
                  <div className="text-white text-sm font-mono">{formatINR(s.currentPrice)}</div>
                  <div className={`text-xs font-semibold ${s.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
                  </div>
                </>
              )}
            </div>
          </Link>
        ))}
        {(!data || data.length === 0) && (
          <div className="text-center py-8 text-dark-500 text-sm">No data yet</div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// BreadthGauge — Advance/Decline visual
// ============================================================
const BreadthGauge = ({ breadth }) => {
  if (!breadth) return null;
  const { advances = 0, declines = 0, unchanged = 0, advanceDeclineRatio, sentiment, totalTurnover } = breadth;
  const total = advances + declines + unchanged;
  const advPct = total > 0 ? (advances / total) * 100 : 50;

  const sentimentColor = sentiment === 'Bullish' ? 'text-profit' : sentiment === 'Bearish' ? 'text-loss' : 'text-saffron';

  return (
    <div className="card-vyuha">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-saffron" />
        <h3 className="text-lg font-semibold text-white">Market Breadth</h3>
      </div>
      <div className="space-y-4">
        {/* Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-profit font-semibold">{advances} Advancing</span>
            <span className="text-loss font-semibold">{declines} Declining</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-dark-700">
            <div className="bg-profit rounded-l-full transition-all duration-500" style={{ width: `${advPct}%` }} />
            <div className="bg-loss rounded-r-full transition-all duration-500" style={{ width: `${100 - advPct}%` }} />
          </div>
          {unchanged > 0 && <div className="text-xs text-dark-500 mt-1">{unchanged} unchanged</div>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-900/50 rounded-lg p-3">
            <div className="text-dark-500 text-xs">A/D Ratio</div>
            <div className="text-white font-bold font-mono text-lg">{advanceDeclineRatio}</div>
          </div>
          <div className="bg-dark-900/50 rounded-lg p-3">
            <div className="text-dark-500 text-xs">Sentiment</div>
            <div className={`font-bold text-lg ${sentimentColor}`}>{sentiment || 'Neutral'}</div>
          </div>
        </div>

        {totalTurnover > 0 && (
          <div className="bg-dark-900/50 rounded-lg p-3">
            <div className="text-dark-500 text-xs">Total Market Turnover</div>
            <div className="text-white font-bold font-mono">{formatLargeNumber(totalTurnover)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MiniLeaderboard
// ============================================================
const MiniLeaderboard = ({ leaderboard, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card-vyuha">
        <h3 className="text-lg font-semibold text-white mb-4">Top Traders</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="card-vyuha">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-saffron" />
          <h3 className="text-lg font-semibold text-white">Top Traders</h3>
        </div>
        <Link to="/leaderboard" className="text-xs text-saffron hover:text-saffron-light flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {(leaderboard || []).slice(0, 5).map((user, index) => (
          <div key={user.userId} className="flex items-center justify-between p-2.5 bg-dark-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-saffron/20 text-saffron' :
                index === 1 ? 'bg-gray-400/20 text-gray-400' :
                index === 2 ? 'bg-vyuha-bronze/20 text-vyuha-bronze' :
                'bg-dark-700 text-dark-500'
              }`}>{index + 1}</span>
              <span className="text-white font-medium text-sm">{user.userName}</span>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold text-sm font-mono">{formatINR(user.totalPortfolioValue)}</p>
              <p className={`text-xs ${user.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatPercent(user.pnlPercent)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// MAIN: NidhiKosh Living Dashboard
// ============================================================
const Dashboard = () => {
  const { summary } = usePortfolio();
  const { leaderboard, leaderboardLoading } = useLeaderboard();
  const { marketStatus } = useSocket();

  const { data: statusData } = useQuery('marketStatus', () => marketAPI.getMarketStatus(), { refetchInterval: 15000 });
  const { data: niftyData } = useQuery('nifty50', () => marketAPI.getNifty50(), { staleTime: 15000 });
  const { data: snapshotData } = useQuery('snapshot', () => marketAPI.getSnapshot(), { staleTime: 30000 });
  const { data: heatmapData } = useQuery('heatmap', () => marketAPI.getHeatmap(), { staleTime: 15000 });
  const { data: moversData } = useQuery('movers', () => marketAPI.getMovers(), { staleTime: 15000 });
  const { data: breadthData } = useQuery('breadth', () => marketAPI.getBreadth(), { staleTime: 15000 });

  const status = statusData?.data || marketStatus || {};
  const niftyStocks = niftyData?.data || [];
  const snapshot = snapshotData?.data;
  const heatmap = heatmapData?.data || [];
  const movers = moversData?.data || {};
  const breadth = breadthData?.data;

  // Index data from snapshot or simulated
  const nifty50Index = snapshot?.indices?.nifty50 || { value: 22500, change: 0, changePercent: 0 };
  const bankNifty = snapshot?.indices?.niftyBank || { value: 48000, change: 0, changePercent: 0 };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <MarketStatusHeader status={status} />

      {/* Market Ticker */}
      <MarketTicker stocks={niftyStocks} />

      {/* Index Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <IndexCard
          name="NIFTY 50"
          value={nifty50Index.value}
          change={nifty50Index.change}
          changePercent={nifty50Index.changePercent}
          advancers={nifty50Index.advancers}
          decliners={nifty50Index.decliners}
        />
        <IndexCard
          name="BANK NIFTY"
          value={bankNifty.value}
          change={bankNifty.change}
          changePercent={bankNifty.changePercent}
        />
        <div className="sm:col-span-2 lg:col-span-1">
          <PortfolioSummaryCards stats={summary} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Heatmap + Movers */}
        <div className="lg:col-span-2 space-y-5">
          <SectorHeatmap heatmapData={heatmap} />
          <MoversTable movers={movers} />
        </div>

        {/* Right: Breadth + Leaderboard */}
        <div className="space-y-5">
          <BreadthGauge breadth={breadth} />
          <MiniLeaderboard leaderboard={leaderboard} isLoading={leaderboardLoading} />

          {/* Quick Actions */}
          <div className="card-vyuha">
            <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {[
                { to: '/market', label: 'Browse Market', icon: TrendingUp },
                { to: '/portfolio', label: 'View Portfolio', icon: Wallet },
                { to: '/leaderboard', label: 'Check Rank', icon: Trophy },
              ].map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="flex items-center gap-3 p-2.5 bg-dark-900/50 rounded-lg hover:bg-dark-700/50 transition-colors group">
                  <Icon className="w-4 h-4 text-saffron/60 group-hover:text-saffron transition-colors" />
                  <span className="text-white text-sm">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-dark-600 ml-auto group-hover:text-saffron transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
