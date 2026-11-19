const { prisma } = require('../db/prisma');
const { hashPassword, verifyPassword, signToken } = require('../utils/authToken');
const { AppError } = require('../middlewares/errorHandler');

const AVATAR_COLORS = ['#FF6B5B', '#FFB547', '#6366F1', '#A855F7', '#EC4899', '#14B8A6'];

// In-memory throttle to avoid spamming VisitEvent rows within 60s for the same session+path
const recentVisits = new Map();

async function register({ username, email, password }) {
  const cleanUsername = String(username || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  if (cleanUsername.length < 3 || cleanUsername.length > 24 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    throw new AppError(
      'Le pseudo doit contenir 3 à 24 caractères (lettres, chiffres, _, ., -).',
      400,
      'VALIDATION_ERROR'
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new AppError('Adresse e-mail invalide.', 400, 'VALIDATION_ERROR');
  }
  if (rawPassword.length < 6) {
    throw new AppError('Le mot de passe doit contenir au moins 6 caractères.', 400, 'VALIDATION_ERROR');
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingEmail) {
    throw new AppError('Cet e-mail est déjà enregistré. Connecte-toi !', 409, 'EMAIL_EXISTS');
  }

  const existingUser = await prisma.user.findFirst({
    where: { username: { equals: cleanUsername, mode: 'insensitive' } },
  });
  if (existingUser) {
    throw new AppError('Ce pseudo est déjà pris, choisis un autre blase !', 409, 'USERNAME_EXISTS');
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hashPassword(rawPassword),
      role: 'USER',
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      lastLoginAt: now,
      lastSeenAt: now,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      avatarColor: true,
      createdAt: true,
    },
  });

  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

async function login({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  const found = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (!found || !verifyPassword(rawPassword, found.passwordHash)) {
    throw new AppError('E-mail ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: found.id },
    data: { lastLoginAt: now, lastSeenAt: now },
  });

  const user = {
    id: found.id,
    username: found.username,
    email: found.email,
    role: found.role,
    avatarColor: found.avatarColor,
    createdAt: found.createdAt,
  };

  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

async function recordVisit({ sessionKey, userId, path = '/', userAgent = '' }) {
  const cleanPath = String(path || '/').slice(0, 80);
  const throttleKey = `${sessionKey}:${cleanPath}`;
  const nowMs = Date.now();
  const lastMs = recentVisits.get(throttleKey) || 0;

  // Periodic cleanup
  if (recentVisits.size > 5000) {
    recentVisits.clear();
  }

  if (userId) {
    await prisma.user
      .update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
  }

  if (nowMs - lastMs < 60_000) {
    return { tracked: false };
  }
  recentVisits.set(throttleKey, nowMs);

  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(String(userAgent));
  await prisma.visitEvent.create({
    data: {
      sessionKey: String(sessionKey || 'anon').slice(0, 80),
      userId: userId || null,
      path: cleanPath,
      deviceType: isMobile ? 'mobile' : 'desktop',
    },
  });

  return { tracked: true };
}

module.exports = {
  register,
  login,
  recordVisit,
};
