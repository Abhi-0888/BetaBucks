import express from 'express';
import { register, login, getMe, updateProfile, resetBalance } from '../controllers/auth.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validate.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', authLimiter, validate(schemas.register), register);
router.post('/login', authLimiter, validate(schemas.login), login);

// Protected routes
router.get('/me', verifyJWT, getMe);
router.put('/profile', verifyJWT, validate(schemas.updateProfile), updateProfile);
router.put('/reset-balance', verifyJWT, resetBalance);

export default router;
