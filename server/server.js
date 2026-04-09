import { httpServer } from './app.js';
import env from './config/env.js';

const PORT = env.PORT;

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║           🚀 NIDHIKOSH SERVER RUNNING 🚀                 ║
║                                                          ║
║   📡 WebSocket + REST API Server                         ║
║   🌐 Environment: ${env.NODE_ENV.toUpperCase().padEnd(36)} ║
║   🔌 Port: ${PORT.toString().padEnd(44)} ║
║   🗄️  MongoDB: ${env.MONGO_URI.substring(0, 30).padEnd(42)}... ║
║                                                          ║
║   📊 Market Data: Yahoo Finance (NSE India)               ║
║   ⏱️  Price Updates: Every 15 seconds                    ║
║   🏆 Leaderboard: Every 60 seconds                       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error(err.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('🔌 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('🔌 HTTP server closed');
    process.exit(0);
  });
});
