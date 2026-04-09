import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart3, DollarSign } from 'lucide-react';
import { marketAPI } from '../../api/market.api.js';
import { useLivePrice } from '../../hooks/useLivePrice.js';
import { usePortfolio } from '../../hooks/usePortfolio.js';
import OrderModal from '../../components/ui/OrderModal.jsx';
import { formatINR, formatLargeNumber, formatPercent } from '../../utils/formatters.js';

const StockDetail = () => {
  const { symbol } = useParams();
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  
  const { data: stockData, isLoading } = useQuery(
    ['stock', symbol],
    () => marketAPI.getStockDetail(symbol),
    { staleTime: 15000 }
  );

  const { price, changePercent, flash } = useLivePrice(symbol);
  const { holdings, summary } = usePortfolio();

  const stock = stockData?.data;
  const currentPrice = price || stock?.currentPrice || 0;
  const currentChange = changePercent || stock?.changePercent || 0;
  
  // Find if user holds this stock
  const userHolding = holdings?.holdings?.find(h => h.symbol === symbol);

  if (isLoading || !stock) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-40 bg-dark-800 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-dark-800 rounded-xl" />
          <div className="h-32 bg-dark-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const isProfit = currentChange >= 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/market" className="inline-flex items-center gap-2 text-dark-500 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Market
      </Link>

      {/* Stock Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{stock.shortName}</h1>
            <p className="text-dark-500">{stock.symbol} • {stock.exchange} • {stock.sector}</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold text-white ${flash === 'green' ? 'animate-flash-green' : flash === 'red' ? 'animate-flash-red' : ''}`}>
              {formatINR(currentPrice)}
            </div>
            <div className={`flex items-center justify-end gap-1 ${isProfit ? 'text-profit' : 'text-loss'}`}>
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-medium">{formatPercent(currentChange)}</span>
              <span className="text-dark-500">({formatINR(stock.changeAmount)})</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setIsBuyModalOpen(true)}
            className="flex-1 btn-success py-3"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            Buy
          </button>
          <button
            onClick={() => setIsSellModalOpen(true)}
            disabled={!userHolding || userHolding.quantity === 0}
            className="flex-1 btn-danger py-3 disabled:opacity-50"
          >
            <TrendingDown className="w-5 h-5 mr-2" />
            Sell {userHolding ? `(${userHolding.quantity})` : ''}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-dark-500 text-sm flex items-center gap-1">
            <Activity className="w-4 h-4" /> Day High
          </p>
          <p className="text-lg font-semibold text-white">{formatINR(stock.dayHigh)}</p>
        </div>
        <div className="card">
          <p className="text-dark-500 text-sm flex items-center gap-1">
            <Activity className="w-4 h-4" /> Day Low
          </p>
          <p className="text-lg font-semibold text-white">{formatINR(stock.dayLow)}</p>
        </div>
        <div className="card">
          <p className="text-dark-500 text-sm flex items-center gap-1">
            <BarChart3 className="w-4 h-4" /> Volume
          </p>
          <p className="text-lg font-semibold text-white">{formatLargeNumber(stock.volume)}</p>
        </div>
        <div className="card">
          <p className="text-dark-500 text-sm flex items-center gap-1">
            <DollarSign className="w-4 h-4" /> Market Cap
          </p>
          <p className="text-lg font-semibold text-white">{formatLargeNumber(stock.marketCap)}</p>
        </div>
      </div>

      {/* Your Position */}
      {userHolding && (
        <div className="card border-primary-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">Your Position</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-dark-500 text-sm">Quantity</p>
              <p className="text-xl font-semibold text-white">{userHolding.quantity}</p>
            </div>
            <div>
              <p className="text-dark-500 text-sm">Avg Cost</p>
              <p className="text-xl font-semibold text-white">{formatINR(userHolding.averageCostPrice)}</p>
            </div>
            <div>
              <p className="text-dark-500 text-sm">Current Value</p>
              <p className="text-xl font-semibold text-white">{formatINR(userHolding.currentValue)}</p>
            </div>
            <div>
              <p className="text-dark-500 text-sm">Unrealized P&L</p>
              <p className={`text-xl font-semibold ${userHolding.unrealisedPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatINR(userHolding.unrealisedPnL)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order Modals */}
      <OrderModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        stock={stock}
        type="BUY"
        balance={summary?.cashBalance || 0}
      />
      <OrderModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        stock={stock}
        type="SELL"
        balance={summary?.cashBalance || 0}
      />
    </div>
  );
};

export default StockDetail;
