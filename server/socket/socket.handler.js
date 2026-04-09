import { verifyJWT } from '../middleware/auth.middleware.js';
import { updateLeaderboard } from '../services/leaderboard.service.js';
import { Stock } from '../models/index.js';

let io = null;
let leaderboardInterval = null;

// Initialize socket handlers
export const initializeSocket = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Authenticate socket connection
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;
        if (!token) {
          socket.emit('auth_error', { message: 'No token provided' });
          return;
        }

        // Verify token and get user
        const jwt = (await import('jsonwebtoken')).default;
        const env = (await import('../config/env.js')).default;
        
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const { User } = await import('../models/index.js');
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
          socket.emit('auth_error', { message: 'Invalid or inactive user' });
          return;
        }

        // Join user's personal room for private updates
        socket.join(user._id.toString());
        socket.userId = user._id.toString();
        socket.user = user;
        
        socket.emit('authenticated', {
          success: true,
          userId: user._id,
          name: user.name,
        });

        console.log(`✅ User authenticated: ${user.name} (${socket.id})`);
        
        // Send market status
        sendMarketStatus(socket);
        
      } catch (error) {
        console.error('Socket auth error:', error.message);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    // Subscribe to specific stock updates (higher priority)
    socket.on('subscribe_stock', (data) => {
      const { symbol } = data;
      if (symbol) {
        socket.join(`stock:${symbol}`);
        console.log(`📊 ${socket.id} subscribed to ${symbol}`);
      }
    });

    // Unsubscribe from stock updates
    socket.on('unsubscribe_stock', (data) => {
      const { symbol } = data;
      if (symbol) {
        socket.leave(`stock:${symbol}`);
        console.log(`📊 ${socket.id} unsubscribed from ${symbol}`);
      }
    });

    // Join leaderboard room
    socket.on('subscribe_leaderboard', () => {
      socket.join('leaderboard');
      console.log(`🏆 ${socket.id} subscribed to leaderboard`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // Start leaderboard updates (every 60 seconds)
  startLeaderboardUpdates();

  console.log('✅ Socket.io handlers initialized');
};

// Send market status (NSE hours: 9:15 AM - 3:30 PM IST)
const sendMarketStatus = (socket) => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hour = istTime.getHours();
  const minute = istTime.getMinutes();
  const currentTime = hour * 60 + minute;
  
  // Market open: 9:15 = 555 minutes, close: 15:30 = 930 minutes
  const isWeekday = istTime.getDay() >= 1 && istTime.getDay() <= 5;
  const isMarketHours = currentTime >= 555 && currentTime <= 930;
  const isOpen = isWeekday && isMarketHours;

  const status = {
    isOpen,
    opensAt: '09:15',
    closesAt: '15:30',
    timezone: 'IST (GMT+5:30)',
    message: isOpen 
      ? 'Market is open' 
      : isWeekday 
        ? (currentTime < 555 ? 'Market opens at 9:15 AM IST' : 'Market closed for the day')
        : 'Market closed (Weekend)',
  };

  socket.emit('market_status', status);
};

// Start leaderboard periodic updates
const startLeaderboardUpdates = () => {
  if (leaderboardInterval) {
    clearInterval(leaderboardInterval);
  }

  // Update immediately
  broadcastLeaderboard();

  // Then every 60 seconds
  leaderboardInterval = setInterval(broadcastLeaderboard, 60000);
  console.log('🏆 Leaderboard updates started (60s interval)');
};

// Broadcast leaderboard to all clients
const broadcastLeaderboard = async () => {
  try {
    const leaderboard = await updateLeaderboard();
    
    if (io && leaderboard.length > 0) {
      io.emit('leaderboard_update', leaderboard);
      console.log(`🏆 Leaderboard broadcasted: ${leaderboard.length} top users`);
    }
  } catch (error) {
    console.error('Error broadcasting leaderboard:', error.message);
  }
};

// Emit portfolio update to specific user
export const emitPortfolioUpdate = (userId, data) => {
  if (io) {
    io.to(userId.toString()).emit('portfolio_update', data);
  }
};

// Emit trade confirmation to specific user
export const emitTradeConfirmation = (userId, data) => {
  if (io) {
    io.to(userId.toString()).emit('trade_confirmed', data);
  }
};

// Emit trade error to specific user
export const emitTradeError = (userId, data) => {
  if (io) {
    io.to(userId.toString()).emit('trade_error', data);
  }
};

// Emit price update (called from price worker)
export const emitPriceUpdate = (data) => {
  if (io) {
    io.emit('price_update', data);
    // Also emit to specific stock room
    io.to(`stock:${data.symbol}`).emit('price_update_priority', data);
  }
};

// Stop all socket intervals
export const stopSocketIntervals = () => {
  if (leaderboardInterval) {
    clearInterval(leaderboardInterval);
    leaderboardInterval = null;
  }
};

export default {
  initializeSocket,
  emitPortfolioUpdate,
  emitTradeConfirmation,
  emitTradeError,
  emitPriceUpdate,
  stopSocketIntervals,
};
