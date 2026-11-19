const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { securityAndLogging } = require('./middlewares/security');
const { createRateLimiter } = require('./middlewares/rateLimiter');
const { resolveActor } = require('./middlewares/actor');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const apiRouter = require('./routes/api');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(securityAndLogging);
  app.use(express.json({ limit: '80kb' }));

  // API v1
  app.use('/api', createRateLimiter({ windowMs: 60_000, max: 240, keyPrefix: 'global' }));
  app.use('/api', resolveActor);
  app.use('/api/v1', apiRouter);

  // Serve built React SPA from /dist
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
