import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';

import { validateEnv, env } from './config/env.js';
import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.middleware.js';
import { globalLimiter } from './middleware/rateLimiter.middleware.js';

import {
  authRoutes,
  marketRoutes,
  tradeRoutes,
  portfolioRoutes,
  leaderboardRoutes,
  analyticsRoutes,
} from './routes/index.js';

import { initializeSocket } from './socket/socket.handler.js';
import { initializePriceWorker, startPriceWorker } from './workers/priceIngestion.worker.js';

// Validate environment
validateEnv();

// Connect to database
connectDB();

// Create Express app
const app = express();
const httpServer = createServer(app);

// CORS origin — accept any localhost port in dev
const allowedOrigins = env.isProduction()
  ? [env.FRONTEND_URL]
  : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize socket handlers
initializeSocket(io);

// Initialize price worker with io instance
initializePriceWorker(io);

// Start price worker after a short delay to ensure DB is connected
setTimeout(() => {
  startPriceWorker();
}, 2000);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: env.isProduction(),
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression middleware
app.use(compression());

// Rate limiting
app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NidhiKosh API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      market: '/api/market',
      trade: '/api/trade',
      portfolio: '/api/portfolio',
      leaderboard: '/api/leaderboard',
      analytics: '/api/analytics',
    },
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export { app, httpServer, io };
export default app;
