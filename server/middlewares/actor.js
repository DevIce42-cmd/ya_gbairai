const crypto = require('node:crypto');
const { ADMIN_KEY } = require('../config/env');
const { AppError } = require('./errorHandler');

function resolveActor(req, _res, next) {
  const rawGuest = String(req.headers['x-guest-id'] || '').trim();
  const safeGuest = /^[a-zA-Z0-9_-]{8,64}$/.test(rawGuest) ? rawGuest : null;
  req.guestId = safeGuest;
  req.actorKey = safeGuest ? `guest:${safeGuest}` : `ip:${req.ip || 'anon'}`;

  const providedAdminKey = String(req.headers['x-admin-key'] || '').trim();
  if (providedAdminKey && ADMIN_KEY) {
    const a = Buffer.from(providedAdminKey);
    const b = Buffer.from(ADMIN_KEY);
    req.isAdmin = a.length === b.length && crypto.timingSafeEqual(a, b);
  } else {
    req.isAdmin = false;
  }

  next();
}

function requireAdmin(req, _res, next) {
  if (!req.isAdmin) {
    return next(new AppError('Clé de modération invalide ou manquante.', 403, 'ADMIN_FORBIDDEN'));
  }
  return next();
}

module.exports = { resolveActor, requireAdmin };
