import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many authentication attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1'
});

export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1'
});
