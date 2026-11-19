const { AppError } = require('./errorHandler');

function createRateLimiter({ windowMs = 60_000, max = 60, keyPrefix = 'api' } = {}) {
  const store = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, list] of store.entries()) {
      const valid = list.filter((t) => now - t < windowMs);
      if (valid.length === 0) store.delete(k);
      else store.set(k, valid);
    }
  }, Math.max(windowMs, 30_000));

  if (typeof cleanup.unref === 'function') cleanup.unref();

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
      const retrySec = Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return next(
        new AppError(`Doucement ! Trop de requêtes. Réessayez dans ${retrySec}s.`, 429, 'RATE_LIMITED')
      );
    }

    hits.push(now);
    store.set(key, hits);
    return next();
  };
}

module.exports = { createRateLimiter };
