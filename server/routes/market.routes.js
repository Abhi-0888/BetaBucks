import express from 'express';
import { 
  getStocks, 
  getStockDetail, 
  getStockHistory, 
  searchStocks,
  getNifty50,
  getSectors,
  getMarketStatus,
  getMarketSnapshot,
  getSectorHeatmap,
  getVyuhaMovers,
  getMarketBreadth,
  forceSnapshotCapture,
} from '../controllers/market.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public market data routes
router.get('/stocks', getStocks);
router.get('/stocks/:symbol', getStockDetail);
router.get('/stocks/:symbol/history', getStockHistory);
router.get('/search', searchStocks);
router.get('/nifty50', getNifty50);
router.get('/sectors', getSectors);

// NidhiKosh — Living Dashboard routes
router.get('/status', getMarketStatus);
router.get('/snapshot', getMarketSnapshot);
router.get('/heatmap', getSectorHeatmap);
router.get('/movers', getVyuhaMovers);
router.get('/breadth', getMarketBreadth);
router.post('/snapshot/capture', forceSnapshotCapture);

export default router;
