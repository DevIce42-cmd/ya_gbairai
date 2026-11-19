const crypto = require('node:crypto');

function securityAndLogging(req, res, next) {
  const start = process.hrtime.bigint();
  req.requestId = crypto.randomBytes(6).toString('hex');

  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Guest-Id, X-Admin-Key');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  res.on('finish', () => {
    if (!req.originalUrl.startsWith('/api')) return;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`[API] ${req.requestId} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)}ms)`);
  });

  return next();
}

module.exports = { securityAndLogging };
