import { useState } from 'react';
import { useQuery } from 'react-query';
import { History as HistoryIcon, Download, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { tradeAPI } from '../../api/trade.api.js';
import { formatINR, formatDateTime, getPnLColor } from '../../utils/formatters.js';

const History = () => {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery(
    ['trade-history', page, filter],
    () => tradeAPI.getTradeHistory({ 
      page, 
      limit: 20, 
      type: filter === 'all' ? undefined : filter 
    }),
    { staleTime: 30000 }
  );

  const transactions = data?.data || [];
  const pagination = data?.pagination || {};

  const handleExport = () => {
    // Simple CSV export
    const csvContent = [
      ['Date', 'Type', 'Symbol', 'Name', 'Quantity', 'Price', 'Total', 'P&L'].join(','),
      ...transactions.map(t => [
        new Date(t.executedAt).toISOString(),
        t.type,
        t.symbol,
        `"${t.stockName}"`,
        t.quantity,
        t.pricePerShare,
        t.totalAmount,
        t.realisedPnL || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade History</h1>
          <p className="text-dark-500">View all your buy and sell transactions</p>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'BUY', 'SELL'].map((type) => (
          <button
            key={type}
            onClick={() => {
              setFilter(type);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-primary-500 text-white'
                : 'bg-dark-800 text-dark-500 hover:text-white'
            }`}
          >
            {type === 'all' ? 'All' : type}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-dark-700 rounded-lg" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <HistoryIcon className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-500">No transactions yet</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-4 py-3 text-dark-500 text-sm">
                        {formatDateTime(tx.executedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          tx.type === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                        }`}>
                          {tx.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{tx.symbol.replace('.NS', '')}</p>
                          <p className="text-sm text-dark-500">{tx.stockName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{tx.quantity}</td>
                      <td className="px-4 py-3 text-right text-dark-500">{formatINR(tx.pricePerShare)}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {tx.type === 'BUY' ? '-' : '+'}{formatINR(tx.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tx.realisedPnL !== null && tx.realisedPnL !== undefined ? (
                          <span className={`font-medium ${getPnLColor(tx.realisedPnL)}`}>
                            {tx.realisedPnL > 0 ? '+' : ''}{formatINR(tx.realisedPnL)}
                          </span>
                        ) : (
                          <span className="text-dark-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-700">
                <p className="text-dark-500 text-sm">
                  Showing {transactions.length} of {pagination.total} transactions
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-dark-700 rounded-lg text-sm text-white disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-dark-500">
                    Page {page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="px-3 py-1 bg-dark-700 rounded-lg text-sm text-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;
