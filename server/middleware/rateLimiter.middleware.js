import rateLimit from 'express-rate-limit';

// Global rate limiter - generous for real-time trading app
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 300, // 300 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Trade rate limiter - 10 trades per minute per user
export const tradeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Too many trade requests, please wait a moment.',
  },
  keyGenerator: (req) => {
    return req.userId?.toString() || req.ip;
  },
});

// Auth rate limiter - stricter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
});

// API rate limiter - for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: {
    success: false,
    message: 'Too many API requests, please slow down.',
  },
});

export default { globalLimiter, tradeLimiter, authLimiter, apiLimiter };
