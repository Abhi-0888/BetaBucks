import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatINR } from '../../utils/formatters.js';
import { tradeAPI } from '../../api/trade.api.js';
import toast from 'react-hot-toast';

const OrderModal = ({ isOpen, onClose, stock, type = 'BUY', balance = 0, onSuccess }) => {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(type);

  const price = stock?.currentPrice || 0;
  const totalAmount = quantity * price;
  const isBuy = activeTab === 'BUY';
  const canAfford = isBuy ? balance >= totalAmount : true;

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setActiveTab(type);
    }
  }, [isOpen, type]);

  if (!isOpen || !stock) return null;

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setQuantity(Math.max(1, Math.min(10000, value)));
  };

  const handleQuickQty = (multiplier) => {
    const maxQty = isBuy ? Math.floor(balance / price) : 10000;
    const qty = Math.max(1, Math.floor(maxQty * multiplier));
    setQuantity(qty);
  };

  const handleSubmit = async () => {
    if (!canAfford) {
      toast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = isBuy 
        ? await tradeAPI.buyStock(stock.symbol, quantity)
        : await tradeAPI.sellStock(stock.symbol, quantity);

      if (response.success) {
        toast.success(`${isBuy ? 'Bought' : 'Sold'} ${quantity} shares of ${stock.shortName}`);
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Trade error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Place Order</h3>
            <p className="text-sm text-dark-500">{stock.shortName} ({stock.symbol})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-dark-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('BUY')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              isBuy 
                ? 'bg-profit text-white' 
                : 'bg-dark-700 text-dark-500 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Buy
          </button>
          <button
            onClick={() => setActiveTab('SELL')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              !isBuy 
                ? 'bg-loss text-white' 
                : 'bg-dark-700 text-dark-500 hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            Sell
          </button>
        </div>

        {/* Price Display */}
        <div className="mb-6 p-4 bg-dark-900 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-dark-500">Current Price</span>
            <span className="text-xl font-bold text-white">{formatINR(price)}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-dark-500">Available Balance</span>
            <span className="text-white flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              {formatINR(balance)}
            </span>
          </div>
        </div>

        {/* Quantity Input */}
        <div className="mb-4">
          <label className="label">Quantity</label>
          <input
            type="number"
            min="1"
            max="10000"
            value={quantity}
            onChange={handleQuantityChange}
            className="input text-center text-lg font-semibold"
          />
        </div>

        {/* Quick Quantity Buttons */}
        <div className="flex gap-2 mb-6">
          {[0.25, 0.5, 0.75, 1].map((multiplier) => (
            <button
              key={multiplier}
              onClick={() => handleQuickQty(multiplier)}
              disabled={isBuy && balance < price}
              className="flex-1 py-2 text-xs bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {multiplier === 1 ? 'Max' : `${Math.round(multiplier * 100)}%`}
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="mb-6 p-4 bg-dark-900 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-dark-500">Total Amount</span>
            <span className={`text-xl font-bold ${isBuy ? 'text-profit' : 'text-loss'}`}>
              {formatINR(totalAmount)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !canAfford}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            isBuy
              ? 'bg-profit hover:bg-profit-dark text-white disabled:bg-profit/50'
              : 'bg-loss hover:bg-loss-dark text-white disabled:bg-loss/50'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            `${isBuy ? 'Buy' : 'Sell'} ${stock.symbol}`
          )}
        </button>
      </div>
    </div>
  );
};

export default OrderModal;
