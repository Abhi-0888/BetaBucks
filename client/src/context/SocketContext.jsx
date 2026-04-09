import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.jsx';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);
  const { user, isAuthenticated } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
      
      // Authenticate if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        socket.emit('authenticate', { token });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    // Authentication response
    socket.on('authenticated', (data) => {
      console.log('✅ Socket authenticated:', data);
    });

    socket.on('auth_error', (error) => {
      console.error('❌ Socket auth error:', error);
    });

    // Market status
    socket.on('market_status', (status) => {
      setMarketStatus(status);
    });

    // Trade confirmations
    socket.on('trade_confirmed', (data) => {
      const { type, symbol, qty, pnl } = data;
      const message = type === 'BUY' 
        ? `Bought ${qty} shares of ${symbol}`
        : `Sold ${qty} shares of ${symbol}${pnl ? ` (P&L: ${pnl > 0 ? '+' : ''}₹${pnl.toFixed(2)})` : ''}`;
      
      toast.success(message, {
        icon: type === 'BUY' ? '🟢' : pnl > 0 ? '💰' : '🔴',
      });
    });

    socket.on('trade_error', (error) => {
      toast.error(error.message || 'Trade failed');
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('authenticated');
      socket.off('auth_error');
      socket.off('market_status');
      socket.off('trade_confirmed');
      socket.off('trade_error');
    };
  }, [socket]);

  // Re-authenticate when user changes
  useEffect(() => {
    if (socket && isConnected && isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token) {
        socket.emit('authenticate', { token });
      }
    }
  }, [socket, isConnected, isAuthenticated, user]);

  // Subscribe to stock updates
  const subscribeToStock = useCallback((symbol) => {
    if (socket) {
      socket.emit('subscribe_stock', { symbol });
    }
  }, [socket]);

  const unsubscribeFromStock = useCallback((symbol) => {
    if (socket) {
      socket.emit('unsubscribe_stock', { symbol });
    }
  }, [socket]);

  // Subscribe to leaderboard
  const subscribeToLeaderboard = useCallback(() => {
    if (socket) {
      socket.emit('subscribe_leaderboard');
    }
  }, [socket]);

  const value = {
    socket,
    isConnected,
    marketStatus,
    subscribeToStock,
    unsubscribeFromStock,
    subscribeToLeaderboard,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
