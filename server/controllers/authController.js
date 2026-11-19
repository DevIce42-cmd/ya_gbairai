const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const data = await authService.register(req.body || {});
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body || {});
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  res.json({ ok: true, data: { user: req.user || null } });
}

async function trackVisit(req, res, next) {
  try {
    const data = await authService.recordVisit({
      sessionKey: req.actorKey,
      userId: req.user?.id || null,
      path: req.body?.path || '/',
      userAgent: req.headers['user-agent'] || '',
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  me,
  trackVisit,
};
