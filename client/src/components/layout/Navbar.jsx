import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  Trophy, 
  History,
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { formatINR } from '../../utils/formatters.js';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { marketStatus, isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/market', label: 'Market', icon: TrendingUp },
    { path: '/portfolio', label: 'Portfolio', icon: Wallet },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/history', label: 'History', icon: History },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-800/95 backdrop-blur-lg border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #facc15 0%, #ff9933 100%)' }}>
              <TrendingUp className="w-5 h-5 text-dark-900" />
            </div>
            <span className="text-xl font-bold gradient-text">NidhiKosh</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'text-primary-400 bg-primary-500/10' 
                      : 'text-dark-500 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Section - Balance & User */}
          <div className="flex items-center gap-4">
            {/* Market Status */}
            {marketStatus && (
              <div className="hidden lg:flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-profit animate-pulse' : 'bg-loss'}`} />
                <span className={marketStatus.isOpen ? 'text-profit' : 'text-loss'}>
                  {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
                </span>
              </div>
            )}

            {/* Balance */}
            <div className="hidden sm:block text-right">
              <p className="text-xs text-dark-500">Balance</p>
              <p className="text-sm font-semibold text-white">
                {formatINR(user?.virtualBalance || 0)}
              </p>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary-400" />
              </div>
              <span className="hidden sm:block text-sm font-medium text-white">
                {user?.name?.split(' ')[0]}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-dark-500 hover:text-loss transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-dark-500 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-dark-800 border-t border-dark-700">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'text-primary-400 bg-primary-500/10' 
                      : 'text-dark-500 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
