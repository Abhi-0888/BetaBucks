import { useQuery } from 'react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, Clock } from 'lucide-react';
import { analyticsAPI } from '../../api/analytics.api.js';
import { formatINR, formatPercent, getPnLColor } from '../../utils/formatters.js';

const Analytics = () => {
  const { data: pnlData } = useQuery(
    'pnl-chart',
    () => analyticsAPI.getPnLChart(30),
    { staleTime: 60000 }
  );

  const { data: statsData } = useQuery(
    'trade-stats',
    () => analyticsAPI.getTradeStats(),
    { staleTime: 60000 }
  );

  const chartData = pnlData?.data?.map(d => ({
    date: d.date,
    dailyPnL: d.dailyPnL,
    cumulativePnL: d.cumulativePnL,
  })) || [];

  const stats = statsData?.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-dark-500">Track your trading performance and insights</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-500/10 rounded-lg">
              <Target className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-dark-500 text-sm">Total Trades</p>
              <p className="text-xl font-bold text-white">{stats.totalTrades || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-profit/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-profit" />
            </div>
            <div>
              <p className="text-dark-500 text-sm">Win Rate</p>
              <p className="text-xl font-bold text-white">{formatPercent(stats.winRate, 1, false)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-500 text-sm">Avg Hold Time</p>
              <p className="text-xl font-bold text-white">{stats.avgHoldingDays?.toFixed(1) || 0}d</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${stats.totalRealisedPnL >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
              {stats.totalRealisedPnL >= 0 ? (
                <TrendingUp className="w-5 h-5 text-profit" />
              ) : (
                <TrendingDown className="w-5 h-5 text-loss" />
              )}
            </div>
            <div>
              <p className="text-dark-500 text-sm">Total P&L</p>
              <p className={`text-xl font-bold ${getPnLColor(stats.totalRealisedPnL)}`}>
                {formatINR(stats.totalRealisedPnL)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* P&L Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">P&L Over Time (30 Days)</h3>
        {chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                />
                <YAxis 
                  stroke="#64748b"
                  tickFormatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => formatINR(value)}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativePnL"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-dark-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4" />
            <p>No trading data available yet. Start trading to see your P&L chart!</p>
          </div>
        )}
      </div>

      {/* Best/Worst Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.bestTrade && (
          <div className="card border-profit/30">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-profit" />
              <h3 className="text-lg font-semibold text-white">Best Trade</h3>
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium">{stats.bestTrade.stockName}</p>
              <p className="text-2xl font-bold text-profit">
                +{formatINR(stats.bestTrade.realisedPnL)}
              </p>
              <p className="text-dark-500 text-sm">
                Sold {stats.bestTrade.quantity} shares @ {formatINR(stats.bestTrade.pricePerShare)}
              </p>
            </div>
          </div>
        )}
        {stats.worstTrade && (
          <div className="card border-loss/30">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-loss" />
              <h3 className="text-lg font-semibold text-white">Worst Trade</h3>
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium">{stats.worstTrade.stockName}</p>
              <p className="text-2xl font-bold text-loss">
                {formatINR(stats.worstTrade.realisedPnL)}
              </p>
              <p className="text-dark-500 text-sm">
                Sold {stats.worstTrade.quantity} shares @ {formatINR(stats.worstTrade.pricePerShare)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
