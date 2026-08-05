import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many authentication attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});
