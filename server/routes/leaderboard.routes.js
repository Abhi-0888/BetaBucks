import express from 'express';
import { getTopLeaderboard, getMyRank, getRankHistory } from '../controllers/leaderboard.controller.js';
import { verifyJWT, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route - anyone can see leaderboard
router.get('/', getTopLeaderboard);

// Protected routes
router.get('/me', verifyJWT, getMyRank);
router.get('/history', verifyJWT, getRankHistory);

export default router;
