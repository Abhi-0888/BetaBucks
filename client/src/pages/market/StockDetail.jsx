import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  DollarSign,
  Clock,
  Target,
  Package,
  Wallet,
  Percent,
  ChevronRight,
  Sparkles
} from 'lucide-react';
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
    <div className="space-y-6 pb-8">
      {/* Back Button */}
      <Link to="/market" className="inline-flex items-center gap-2 text-dark-400 hover:text-white transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Market</span>
      </Link>

      {/* Hero Stock Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 border border-dark-700 p-6">
        {/* Background Effects */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 ${isProfit ? 'bg-accent-success' : 'bg-accent-error'}`} />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-500/10 rounded-full blur-3xl" />
        
        <div className="relative">
          {/* Stock Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                isProfit 
                  ? 'bg-accent-success/20 text-accent-success' 
                  : 'bg-accent-error/20 text-accent-error'
              }`}>
                {stock.symbol.split('.')[0].slice(0, 2)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{stock.shortName}</h1>
                <div className="flex items-center gap-2 text-dark-400 text-sm mt-1">
                  <span className="font-medium text-white">{stock.symbol}</span>
                  <span>•</span>
                  <span>{stock.exchange}</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 bg-dark-700 rounded-full text-xs">{stock.sector}</span>
                </div>
              </div>
            </div>
            
            {/* Price Display */}
            <div className="text-right">
              <div className={`text-5xl font-bold text-white transition-all duration-300 ${
                flash === 'green' ? 'text-accent-success scale-105' : flash === 'red' ? 'text-accent-error scale-105' : ''
              }`}>
                {formatINR(currentPrice)}
              </div>
              <div className={`flex items-center justify-end gap-2 mt-2 ${isProfit ? 'text-accent-success' : 'text-accent-error'}`}>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                  isProfit ? 'bg-accent-success/20' : 'bg-accent-error/20'
                }`}>
                  {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{isProfit ? '+' : ''}{stock.changePercent?.toFixed(2) || '0.00'}%</span>
                </div>
                <span className="text-dark-400 text-sm">{formatINR(stock.changeAmount)}</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-dark-500 text-xs mt-2">
                <Clock className="w-3 h-3" />
                <span>Last updated: {new Date(stock.lastUpdated).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsBuyModalOpen(true)}
              className="flex-1 bg-accent-success hover:bg-accent-success/90 text-dark-900 font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-accent-success/25 hover:-translate-y-0.5"
            >
              <TrendingUp className="w-5 h-5" />
              Buy Stock
            </button>
            <button
              onClick={() => setIsSellModalOpen(true)}
              disabled={!userHolding || userHolding.quantity === 0}
              className="flex-1 bg-accent-error hover:bg-accent-error/90 disabled:bg-dark-700 disabled:text-dark-500 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-accent-error/25 hover:-translate-y-0.5"
            >
              <TrendingDown className="w-5 h-5" />
              Sell {userHolding ? `(${userHolding.quantity})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid - Modern Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50 hover:border-accent-500/30 transition-all group">
          <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
            <Target className="w-4 h-4 group-hover:text-accent-500 transition-colors" />
            <span>Day High</span>
          </div>
          <p className="text-xl font-bold text-white">{formatINR(stock.dayHigh)}</p>
          <div className="mt-1 h-1 bg-dark-700 rounded-full overflow-hidden">
            <div className="h-full bg-accent-success/50 rounded-full" style={{ width: '70%' }} />
          </div>
        </div>
        
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50 hover:border-accent-500/30 transition-all group">
          <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
            <Target className="w-4 h-4 group-hover:text-accent-error transition-colors" />
            <span>Day Low</span>
          </div>
          <p className="text-xl font-bold text-white">{formatINR(stock.dayLow)}</p>
          <div className="mt-1 h-1 bg-dark-700 rounded-full overflow-hidden">
            <div className="h-full bg-accent-error/50 rounded-full" style={{ width: '30%' }} />
          </div>
        </div>
        
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50 hover:border-accent-500/30 transition-all group">
          <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
            <BarChart3 className="w-4 h-4 group-hover:text-accent-500 transition-colors" />
            <span>Volume</span>
          </div>
          <p className="text-xl font-bold text-white">{formatLargeNumber(stock.volume)}</p>
          <p className="text-xs text-dark-500 mt-1">shares traded today</p>
        </div>
        
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50 hover:border-accent-500/30 transition-all group">
          <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
            <DollarSign className="w-4 h-4 group-hover:text-accent-500 transition-colors" />
            <span>Market Cap</span>
          </div>
          <p className="text-xl font-bold text-white">{formatLargeNumber(stock.marketCap)}</p>
          <p className="text-xs text-dark-500 mt-1">company valuation</p>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/30">
          <p className="text-dark-400 text-xs mb-1">52 Week High</p>
          <p className="text-lg font-semibold text-white">{formatINR(stock.fiftyTwoWeekHigh)}</p>
        </div>
        <div className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/30">
          <p className="text-dark-400 text-xs mb-1">52 Week Low</p>
          <p className="text-lg font-semibold text-white">{formatINR(stock.fiftyTwoWeekLow)}</p>
        </div>
        <div className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/30">
          <p className="text-dark-400 text-xs mb-1">P/E Ratio</p>
          <p className="text-lg font-semibold text-white">{stock.peRatio?.toFixed(2) || 'N/A'}</p>
        </div>
      </div>

      {/* Your Position - Enhanced */}
      {userHolding && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/10 via-dark-800 to-dark-900 border border-primary-500/30 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-white">Your Position</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1 text-dark-400 text-xs mb-1">
                  <Package className="w-3 h-3" />
                  <span>Quantity</span>
                </div>
                <p className="text-2xl font-bold text-white">{userHolding.quantity}</p>
                <p className="text-xs text-dark-500">shares owned</p>
              </div>
              
              <div className="bg-dark-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1 text-dark-400 text-xs mb-1">
                  <Target className="w-3 h-3" />
                  <span>Avg Cost</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatINR(userHolding.averageCostPrice)}</p>
                <p className="text-xs text-dark-500">per share</p>
              </div>
              
              <div className="bg-dark-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1 text-dark-400 text-xs mb-1">
                  <Wallet className="w-3 h-3" />
                  <span>Current Value</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatINR(userHolding.currentValue)}</p>
                <p className="text-xs text-dark-500">total value</p>
              </div>
              
              <div className="bg-dark-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1 text-dark-400 text-xs mb-1">
                  <Percent className="w-3 h-3" />
                  <span>Unrealized P&L</span>
                </div>
                <p className={`text-2xl font-bold ${userHolding.unrealisedPnL >= 0 ? 'text-accent-success' : 'text-accent-error'}`}>
                  {formatINR(userHolding.unrealisedPnL)}
                </p>
                <p className={`text-xs ${userHolding.unrealisedPnL >= 0 ? 'text-accent-success' : 'text-accent-error'}`}>
                  {userHolding.unrealisedPnL >= 0 ? '↑' : '↓'} {Math.abs((userHolding.unrealisedPnL / userHolding.currentValue) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not Holding Message */}
      {!userHolding && (
        <div className="bg-dark-800/30 rounded-xl p-6 border border-dashed border-dark-600 text-center">
          <Package className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">You don't own this stock yet</h3>
          <p className="text-dark-400 text-sm mb-4">Start building your portfolio by buying shares</p>
          <button
            onClick={() => setIsBuyModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-accent-500 hover:bg-accent-500/90 text-dark-900 font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-accent-500/25"
          >
            Buy Now
            <ChevronRight className="w-4 h-4" />
          </button>
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
