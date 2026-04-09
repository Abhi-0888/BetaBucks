import express from 'express';
import { getHoldings, getSummary, getAllocation } from '../controllers/portfolio.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all portfolio routes
router.use(verifyJWT);

// Portfolio routes
router.get('/', getHoldings);
router.get('/summary', getSummary);
router.get('/allocation', getAllocation);

export default router;
