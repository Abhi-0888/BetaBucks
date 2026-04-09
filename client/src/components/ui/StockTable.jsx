import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from 'react-query';
import LivePriceBadge from './LivePriceBadge.jsx';
import OrderModal from './OrderModal.jsx';
import { marketAPI } from '../../api/market.api.js';
import { useLivePrice } from '../../hooks/useLivePrice.js';
import { formatLargeNumber } from '../../utils/formatters.js';

const StockRow = ({ stock, onBuyClick }) => {
  const { price, changePercent, flash } = useLivePrice(stock.symbol);
  
  const currentPrice = price || stock.currentPrice;
  const currentChange = changePercent || stock.changePercent;

  return (
    <tr className="hover:bg-dark-800/50 transition-colors">
      <td className="px-4 py-3">
        <Link to={`/market/${stock.symbol}`} className="block">
          <p className="font-medium text-white">{stock.symbol.replace('.NS', '')}</p>
          <p className="text-sm text-dark-500 truncate max-w-[150px]">{stock.shortName}</p>
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs bg-dark-700 px-2 py-1 rounded-full text-dark-400">
          {stock.sector || 'Other'}
        </span>
      </td>
      <td className="px-4 py-3">
        <LivePriceBadge 
          price={currentPrice} 
          changePercent={currentChange} 
          flash={flash}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`text-sm ${currentChange >= 0 ? 'text-profit' : 'text-loss'}`}>
          {currentChange >= 0 ? '+' : ''}{currentChange?.toFixed(2) || '0.00'}%
        </span>
      </td>
      <td className="px-4 py-3 text-right text-dark-500 text-sm">
        {formatLargeNumber(stock.volume)}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBuyClick(stock);
          }}
          className="px-3 py-1.5 bg-profit/10 text-profit text-sm font-medium rounded-lg hover:bg-profit hover:text-white transition-colors"
        >
          Trade
        </button>
      </td>
    </tr>
  );
};

const StockTable = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'changePercent', direction: 'desc' });

  const { data, isLoading } = useQuery(
    ['stocks', searchQuery, sortConfig],
    () => marketAPI.getStocks({ 
      search: searchQuery, 
      sortBy: sortConfig.key, 
      order: sortConfig.direction,
      limit: 50 
    }),
    { staleTime: 30000 }
  );

  const stocks = data?.data || [];

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleBuyClick = (stock) => {
    setSelectedStock(stock);
    setIsOrderModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-14 bg-dark-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table w-full">
            <thead>
              <tr className="text-left border-b border-dark-700">
                <th className="px-4 py-3 text-xs font-medium text-dark-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-xs font-medium text-dark-500 uppercase">Sector</th>
                <th className="px-4 py-3 text-xs font-medium text-dark-500 uppercase">Price</th>
                <th className="px-4 py-3 text-xs font-medium text-dark-500 uppercase text-right">
                  <button 
                    onClick={() => handleSort('changePercent')}
                    className="flex items-center gap-1 ml-auto"
                  >
                    Change
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-dark-500 uppercase text-right">Volume</th>
                <th className="px-4 py-3 text-xs font-medium text-dark-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <StockRow 
                  key={stock.symbol} 
                  stock={stock} 
                  onBuyClick={handleBuyClick}
                />
              ))}
            </tbody>
          </table>
        </div>

        {stocks.length === 0 && (
          <div className="text-center py-8 text-dark-500">
            No stocks found
          </div>
        )}
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        stock={selectedStock}
        type="BUY"
      />
    </>
  );
};

export default StockTable;
