import express from 'express';
import { 
  getStocks, 
  getStockDetail, 
  getStockHistory, 
  searchStocks,
  getNifty50,
  getSectors 
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

export default router;
