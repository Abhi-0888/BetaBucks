import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Activity,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Briefcase,
  Landmark,
  Factory,
  ShoppingBag,
  Truck,
  Cpu
} from 'lucide-react';
import { marketAPI } from '../../api/market.api.js';
import { formatINR, formatPercent } from '../../utils/formatters.js';

// Sector icons mapping
const sectorIcons = {
  'IT': Cpu,
  'Banking': Landmark,
  'Energy': Zap,
  'Auto': Truck,
  'FMCG': ShoppingBag,
  'Pharma': Building2,
  'Metals': Factory,
  'Finance': Briefcase,
  'Infrastructure': Building2,
  'Mining': Factory,
  'Utilities': Zap,
  'Conglomerate': Briefcase,
};

const SECTOR_FILTERS = [
  { id: 'all', label: 'All Sectors', icon: Activity },
  { id: 'IT', label: 'IT & Tech', icon: Cpu },
  { id: 'Banking', label: 'Banking', icon: Landmark },
  { id: 'Energy', label: 'Energy', icon: Zap },
  { id: 'Auto', label: 'Auto', icon: Truck },
  { id: 'FMCG', label: 'FMCG', icon: ShoppingBag },
  { id: 'Pharma', label: 'Pharma', icon: Building2 },
];

const Market = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [sortBy, setSortBy] = useState('changePercent');

  // Debounce search input — wait 400ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch stocks
  const { data: stocksData, isLoading, error } = useQuery(
    ['stocks', selectedSector, debouncedSearch, sortBy],
    () => marketAPI.getStocks({
      sector: selectedSector === 'all' ? undefined : selectedSector,
      search: debouncedSearch || undefined,
      sortBy,
      order: 'desc',
      limit: 50
    }),
    { refetchInterval: 30000, keepPreviousData: true }
  );

  const stocks = stocksData?.data || [];
  const topGainers = stocks.filter(s => s.changePercent > 0).slice(0, 3);
  const topLosers = stocks.filter(s => s.changePercent < 0).slice(0, 3);

  // Calculate market stats
  const marketStats = {
    totalStocks: stocks.length,
    gainers: stocks.filter(s => s.changePercent > 0).length,
    losers: stocks.filter(s => s.changePercent < 0).length,
    avgChange: stocks.length > 0 
      ? (stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length).toFixed(2)
      : 0
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-white mb-2">Market Data Unavailable</h3>
        <p className="text-dark-400">Unable to fetch stock data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Section with Market Stats */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 border border-dark-700 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-success/5 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-accent-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Stock Market</h1>
              <p className="text-dark-400 text-sm">Live NSE India • Real-time trading simulation</p>
            </div>
          </div>

          {/* Market Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-3 border border-dark-700/50">
              <p className="text-dark-400 text-xs mb-1">Active Stocks</p>
              <p className="text-xl font-bold text-white">{marketStats.totalStocks}</p>
            </div>
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-3 border border-dark-700/50">
              <p className="text-dark-400 text-xs mb-1 text-accent-success">Gainers</p>
              <p className="text-xl font-bold text-accent-success">{marketStats.gainers}</p>
            </div>
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-3 border border-dark-700/50">
              <p className="text-dark-400 text-xs mb-1 text-accent-error">Losers</p>
              <p className="text-xl font-bold text-accent-error">{marketStats.losers}</p>
            </div>
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-3 border border-dark-700/50">
              <p className="text-dark-400 text-xs mb-1">Avg Change</p>
              <p className={`text-xl font-bold ${marketStats.avgChange >= 0 ? 'text-accent-success' : 'text-accent-error'}`}>
                {marketStats.avgChange > 0 ? '+' : ''}{marketStats.avgChange}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Movers - Gainers & Losers */}
      {(topGainers.length > 0 || topLosers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Gainers */}
          {topGainers.length > 0 && (
            <div className="bg-dark-800/30 rounded-xl p-4 border border-accent-success/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-accent-success" />
                <h3 className="text-sm font-semibold text-accent-success">Top Gainers</h3>
              </div>
              <div className="space-y-2">
                {topGainers.map((stock) => (
                  <Link 
                    key={stock.symbol} 
                    to={`/market/${stock.symbol}`}
                    className="flex items-center justify-between p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent-success/20 rounded-lg flex items-center justify-center text-xs font-bold text-accent-success">
                        {stock.symbol.split('.')[0].slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{stock.symbol.split('.')[0]}</p>
                        <p className="text-dark-400 text-xs truncate max-w-[100px]">{stock.shortName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold text-sm">₹{stock.currentPrice}</p>
                      <p className="text-accent-success text-xs flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        +{stock.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top Losers */}
          {topLosers.length > 0 && (
            <div className="bg-dark-800/30 rounded-xl p-4 border border-accent-error/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-accent-error" />
                <h3 className="text-sm font-semibold text-accent-error">Top Losers</h3>
              </div>
              <div className="space-y-2">
                {topLosers.map((stock) => (
                  <Link 
                    key={stock.symbol} 
                    to={`/market/${stock.symbol}`}
                    className="flex items-center justify-between p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent-error/20 rounded-lg flex items-center justify-center text-xs font-bold text-accent-error">
                        {stock.symbol.split('.')[0].slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{stock.symbol.split('.')[0]}</p>
                        <p className="text-dark-400 text-xs truncate max-w-[100px]">{stock.shortName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold text-sm">₹{stock.currentPrice}</p>
                      <p className="text-accent-error text-xs flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3" />
                        {stock.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Section */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Search stocks by name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all"
          />
        </div>

        {/* Sector Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 text-dark-400 text-sm mr-2">
            <Filter className="w-4 h-4" />
            <span>Sectors:</span>
          </div>
          {SECTOR_FILTERS.map((sector) => {
            const Icon = sector.icon;
            const isActive = selectedSector === sector.id;
            return (
              <button
                key={sector.id}
                onClick={() => setSelectedSector(sector.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-accent-500 text-dark-900 shadow-lg shadow-accent-500/25' 
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700 border border-dark-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {sector.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-dark-800 rounded-xl p-4 border border-dark-700 animate-pulse">
              <div className="h-12 w-12 bg-dark-700 rounded-lg mb-3" />
              <div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-dark-700 rounded w-1/2 mb-4" />
              <div className="flex justify-between">
                <div className="h-5 bg-dark-700 rounded w-20" />
                <div className="h-5 bg-dark-700 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stock Cards Grid */}
      {!isLoading && stocks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stocks.map((stock) => {
            const SectorIcon = sectorIcons[stock.sector] || Briefcase;
            const isPositive = stock.changePercent >= 0;
            
            return (
              <Link
                key={stock.symbol}
                to={`/market/${stock.symbol}`}
                className="group bg-dark-800/50 hover:bg-dark-800 rounded-xl p-4 border border-dark-700/50 hover:border-accent-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent-500/5 hover:-translate-y-1"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      isPositive 
                        ? 'bg-accent-success/20 text-accent-success' 
                        : 'bg-accent-error/20 text-accent-error'
                    }`}>
                      {stock.symbol.split('.')[0].slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{stock.symbol.split('.')[0]}</h3>
                      <p className="text-dark-400 text-xs truncate max-w-[120px]">{stock.shortName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-dark-400">
                    <SectorIcon className="w-3 h-3" />
                  </div>
                </div>

                {/* Price Info */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">₹{stock.currentPrice}</p>
                    <p className="text-dark-400 text-xs">Vol: {(stock.volume / 1000000).toFixed(2)}M</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                    isPositive 
                      ? 'bg-accent-success/20 text-accent-success' 
                      : 'bg-accent-error/20 text-accent-error'
                  }`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </div>
                </div>

                {/* Market Cap */}
                <div className="mt-3 pt-3 border-t border-dark-700/50 flex justify-between items-center text-xs">
                  <span className="text-dark-400">Market Cap</span>
                  <span className="text-white font-medium">{stock.formattedMarketCap || '₹' + (stock.marketCap / 1000000000).toFixed(2) + 'B'}</span>
                </div>

                {/* Hover indicator */}
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-center gap-1 text-accent-500 text-xs font-medium">
                    <span>View Details</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && stocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-dark-800 rounded-2xl flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-dark-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No stocks found</h3>
          <p className="text-dark-400 text-sm max-w-xs">
            Try adjusting your search or filters to find what you're looking for.
          </p>
        </div>
      )}
    </div>
  );
};

export default Market;
