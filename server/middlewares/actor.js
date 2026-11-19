const crypto = require('node:crypto');
const { ADMIN_KEY } = require('../config/env');
const { verifyToken } = require('../utils/authToken');
const { prisma } = require('../db/prisma');
const { AppError } = require('./errorHandler');

async function resolveActor(req, _res, next) {
  try {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7).trim());
      if (payload?.sub) {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatarColor: true,
            createdAt: true,
          },
        });
        if (user) {
          req.user = user;
        }
      }
    }

    const rawGuest = String(req.headers['x-guest-id'] || '').trim();
    const safeGuest = /^[a-zA-Z0-9_-]{8,64}$/.test(rawGuest) ? rawGuest : null;
    req.guestId = safeGuest;
    req.actorKey = req.user
      ? `user:${req.user.id}`
      : safeGuest
        ? `guest:${safeGuest}`
        : `ip:${req.ip || 'anon'}`;

    const providedAdminKey = String(req.headers['x-admin-key'] || '').trim();
    let keyMatch = false;
    if (providedAdminKey && ADMIN_KEY) {
      const a = Buffer.from(providedAdminKey);
      const b = Buffer.from(ADMIN_KEY);
      keyMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    req.isAdmin = Boolean(keyMatch || req.user?.role === 'ADMIN');
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, _res, next) {
  if (!req.isAdmin) {
    return next(new AppError('Accès réservé à l’administrateur. Clé invalide ou manquante.', 403, 'ADMIN_FORBIDDEN'));
  }
  return next();
}

module.exports = { resolveActor, requireAdmin };
