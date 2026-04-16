import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolio } from '../../hooks/usePortfolio.js';
import { formatINR, formatPercent, getPnLColor } from '../../utils/formatters.js';
import { TrendingUp, TrendingDown, Wallet, PieChart as PieIcon } from 'lucide-react';

const Portfolio = () => {
  const { holdings, summary, allocation, isLoading } = usePortfolio();
  const [activeTab, setActiveTab] = useState('holdings');

  const allocationData = allocation?.allocation?.map(item => ({
    name: item.sector,
    value: item.value,
    percent: item.percent,
  })) || [];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-20 bg-dark-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-dark-800 rounded-xl" />
          <div className="h-32 bg-dark-800 rounded-xl" />
          <div className="h-32 bg-dark-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const stats = summary || {};
  const userHoldings = holdings?.holdings || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-dark-500">Track your investments and performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-500/10 rounded-lg shrink-0">
              <Wallet className="w-5 h-5 text-primary-400" />
            </div>
            <div className="min-w-0">
              <p className="text-dark-500 text-xs font-medium">Total Value</p>
              <p className="text-base md:text-lg lg:text-xl font-bold text-white font-mono truncate" title={formatINR(stats.totalPortfolioValue)}>{formatINR(stats.totalPortfolioValue)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-lg shrink-0">
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-dark-500 text-xs font-medium">Cash Balance</p>
              <p className="text-base md:text-lg lg:text-xl font-bold text-white font-mono truncate" title={formatINR(stats.cashBalance)}>{formatINR(stats.cashBalance)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${stats.unrealisedPnL >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
              {stats.unrealisedPnL >= 0 ? (
                <TrendingUp className="w-5 h-5 text-profit" />
              ) : (
                <TrendingDown className="w-5 h-5 text-loss" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-dark-500 text-xs font-medium">Unrealized P&L</p>
              <p className={`text-base md:text-lg lg:text-xl font-bold font-mono truncate ${stats.unrealisedPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatINR(stats.unrealisedPnL)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${stats.overallReturn >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
              {stats.overallReturn >= 0 ? (
                <TrendingUp className="w-5 h-5 text-profit" />
              ) : (
                <TrendingDown className="w-5 h-5 text-loss" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-dark-500 text-xs font-medium">Overall Return</p>
              <p className={`text-base md:text-lg lg:text-xl font-bold font-mono truncate ${stats.overallReturn >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatPercent(stats.overallReturnPercent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700">
        <button
          onClick={() => setActiveTab('holdings')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'holdings'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-dark-500 hover:text-white'
          }`}
        >
          Holdings ({userHoldings.length})
        </button>
        <button
          onClick={() => setActiveTab('allocation')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'allocation'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-dark-500 hover:text-white'
          }`}
        >
          Sector Allocation
        </button>
      </div>

      {/* Holdings Tab */}
      {activeTab === 'holdings' && (
        <div className="card">
          {userHoldings.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-500">No holdings yet</p>
              <a href="/market" className="text-primary-400 hover:text-primary-300 mt-2 inline-block">
                Start trading →
              </a>
            </div>
          ) : (
            <div className="table-container">
              <table className="table w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">Avg Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">LTP</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">Current Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {userHoldings.map((holding) => (
                    <tr key={holding.symbol} className="hover:bg-dark-800/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{holding.symbol.replace('.NS', '')}</p>
                          <p className="text-sm text-dark-500">{holding.stockName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{holding.quantity}</td>
                      <td className="px-4 py-3 text-right text-dark-500">{formatINR(holding.averageCostPrice)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatINR(holding.currentPrice)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatINR(holding.currentValue)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${getPnLColor(holding.unrealisedPnL)}`}>
                        {formatINR(holding.unrealisedPnL)}
                        <br />
                        <span className="text-xs">{formatPercent(holding.unrealisedPnLPercent, 2, false)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Allocation Tab */}
      {activeTab === 'allocation' && (
        <div className="card">
          {allocationData.length === 0 ? (
            <div className="text-center py-12">
              <PieIcon className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-500">No allocation data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => formatINR(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {allocationData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-white font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{formatINR(item.value)}</p>
                      <p className="text-sm text-dark-500">{item.percent.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Portfolio;
