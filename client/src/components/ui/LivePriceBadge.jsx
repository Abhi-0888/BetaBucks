import { formatINR, formatPercent } from '../../utils/formatters.js';

const LivePriceBadge = ({ 
  price, 
  changePercent, 
  flash, 
  showChange = true,
  size = 'md' 
}) => {
  const isProfit = changePercent >= 0;
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
  };

  return (
    <div className={`flex flex-col ${flash === 'green' ? 'animate-flash-green' : flash === 'red' ? 'animate-flash-red' : ''} rounded px-1 -mx-1`}>
      <span className={`${sizeClasses[size]} text-white`}>
        {formatINR(price)}
      </span>
      {showChange && changePercent !== undefined && (
        <span className={`text-xs ${isProfit ? 'text-profit' : 'text-loss'}`}>
          {isProfit ? '▲' : '▼'} {formatPercent(changePercent)}
        </span>
      )}
    </div>
  );
};

export default LivePriceBadge;
