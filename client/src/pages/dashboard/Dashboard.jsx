import { useEffect } from 'react';
import { TrendingUp, Wallet, Trophy, Activity } from 'lucide-react';
import { useQuery } from 'react-query';
import StockTable from '../../components/ui/StockTable.jsx';
import { usePortfolio } from '../../hooks/usePortfolio.js';
import { useLeaderboard } from '../../hooks/useLeaderboard.js';
import { marketAPI } from '../../api/market.api.js';
import { formatINR, formatPercent, getPnLColor } from '../../utils/formatters.js';

const DashboardCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => (
  <div className="card-hover">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-dark-500 text-sm mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        {subtitle && (
          <p className={`text-sm mt-1 ${trend === 'up' ? 'text-profit' : trend === 'down' ? 'text-loss' : 'text-dark-500'}`}>
            {subtitle}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg bg-${color}-500/10`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
    </div>
  </div>
);

const MiniLeaderboard = ({ leaderboard, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Top Traders</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-dark-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Top Traders</h3>
        <a href="/leaderboard" className="text-sm text-primary-400 hover:text-primary-300">View All</a>
      </div>
      <div className="space-y-3">
        {leaderboard.slice(0, 5).map((user, index) => (
          <div key={user.userId} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-400' :
                index === 2 ? 'bg-orange-600/20 text-orange-400' :
                'bg-dark-700 text-dark-500'
              }`}>
                {index + 1}
              </span>
              <span className="text-white font-medium">{user.userName}</span>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold">{formatINR(user.totalPortfolioValue)}</p>
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

const MarketTicker = ({ stocks }) => {
  if (!stocks?.length) return null;
  
  // Duplicate stocks for seamless loop
  const tickerStocks = [...stocks, ...stocks];
  
  return (
    <div className="bg-dark-800 border-y border-dark-700 py-2 overflow-hidden">
      <div className="flex animate-ticker">
        {tickerStocks.map((stock, index) => (
          <div key={`${stock.symbol}-${index}`} className="flex items-center gap-2 px-4 whitespace-nowrap">
            <span className="text-dark-500 text-sm">{stock.symbol.replace('.NS', '')}</span>
            <span className="text-white font-medium">{formatINR(stock.currentPrice)}</span>
            <span className={`text-xs ${stock.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { summary, summaryLoading } = usePortfolio();
  const { leaderboard, leaderboardLoading } = useLeaderboard();
  
  const { data: niftyData } = useQuery(
    'nifty50',
    () => marketAPI.getNifty50(),
    { staleTime: 30000 }
  );

  const niftyStocks = niftyData?.data || [];

  const stats = summary || {};

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-500">Welcome back! Here's your trading overview.</p>
      </div>

      {/* Market Ticker */}
      <MarketTicker stocks={niftyStocks} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Portfolio Value"
          value={formatINR(stats.totalPortfolioValue)}
          subtitle={stats.overallReturn !== undefined ? `${stats.overallReturn >= 0 ? '+' : ''}${formatPercent(stats.overallReturnPercent, 2, false)} all time` : null}
          trend={stats.overallReturn >= 0 ? 'up' : 'down'}
          icon={Wallet}
          color="primary"
        />
        <DashboardCard
          title="Cash Balance"
          value={formatINR(stats.cashBalance)}
          subtitle="Available to trade"
          icon={Activity}
          color="blue"
        />
        <DashboardCard
          title="Unrealized P&L"
          value={formatINR(stats.unrealisedPnL)}
          subtitle={stats.unrealisedPnLPercent !== undefined ? formatPercent(stats.unrealisedPnLPercent) : null}
          trend={stats.unrealisedPnL >= 0 ? 'up' : 'down'}
          icon={TrendingUp}
          color={stats.unrealisedPnL >= 0 ? 'profit' : 'loss'}
        />
        <DashboardCard
          title="Total Invested"
          value={formatINR(stats.totalInvested)}
          subtitle="In current holdings"
          icon={Wallet}
          color="purple"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Table */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Market Overview</h2>
          </div>
          <StockTable />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MiniLeaderboard 
            leaderboard={leaderboard} 
            isLoading={leaderboardLoading} 
          />
          
          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/market" className="flex items-center gap-3 p-3 bg-dark-900 rounded-lg hover:bg-dark-700 transition-colors">
                <TrendingUp className="w-5 h-5 text-primary-400" />
                <span className="text-white">Browse Market</span>
              </a>
              <a href="/portfolio" className="flex items-center gap-3 p-3 bg-dark-900 rounded-lg hover:bg-dark-700 transition-colors">
                <Wallet className="w-5 h-5 text-primary-400" />
                <span className="text-white">View Portfolio</span>
              </a>
              <a href="/leaderboard" className="flex items-center gap-3 p-3 bg-dark-900 rounded-lg hover:bg-dark-700 transition-colors">
                <Trophy className="w-5 h-5 text-primary-400" />
                <span className="text-white">Check Rank</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
