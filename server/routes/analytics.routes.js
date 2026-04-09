import express from 'express';
import { 
  getPnLChart, 
  getTradeStats, 
  getSectorPerformance 
} from '../controllers/analytics.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all analytics routes
router.use(verifyJWT);

// Analytics routes
router.get('/pnl', getPnLChart);
router.get('/trades', getTradeStats);
router.get('/sectors', getSectorPerformance);

export default router;
