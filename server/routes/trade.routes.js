import express from 'express';
import { buyStock, sellStock, getTradeHistory } from '../controllers/trade.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validate.middleware.js';
import { tradeLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Apply auth middleware to all trade routes
router.use(verifyJWT);

// Trade routes with rate limiting
router.post('/buy', tradeLimiter, validate(schemas.tradeOrder), buyStock);
router.post('/sell', tradeLimiter, validate(schemas.tradeOrder), sellStock);
router.get('/history', getTradeHistory);

export default router;
