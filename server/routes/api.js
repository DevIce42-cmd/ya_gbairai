const express = require('express');
const postController = require('../controllers/postController');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/actor');
const { createRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 15, keyPrefix: 'write' });
const reactLimiter = createRateLimiter({ windowMs: 60_000, max: 90, keyPrefix: 'react' });
const authLimiter = createRateLimiter({ windowMs: 60_000, max: 15, keyPrefix: 'auth' });

// Health, Meta & Traffic Tracking
router.get('/health', (_req, res) => {
  res.json({ ok: true, service: "Y'A GBAIRAI !", status: 'healthy', timestamp: new Date().toISOString() });
});
router.get('/meta', postController.getMeta);
router.get('/alias', postController.getAlias);
router.post('/track', authController.trackVisit);

// User Auth (Registration & Login)
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);
router.get('/auth/me', authController.me);

// Posts & Storytime Series
router.get('/posts', postController.listPosts);
router.get('/posts/:id', postController.getPost);
router.post('/posts', writeLimiter, postController.createPost);
router.delete('/posts/:id', postController.deletePost);
router.post('/series/:seriesId/parts', writeLimiter, postController.addPart);

// Engagement
router.post('/posts/:id/reactions', reactLimiter, postController.toggleReaction);
router.post('/posts/:id/comments', writeLimiter, postController.addComment);
router.post('/posts/:id/report', writeLimiter, postController.reportPost);

// Admin-Only Dashboard (Traffic, Users & Moderation)
router.get('/admin/dashboard', requireAdmin, adminController.getDashboard);
router.patch('/admin/reports/:id', requireAdmin, adminController.resolveReport);
router.patch('/admin/posts/:id/status', requireAdmin, adminController.setPostStatus);

module.exports = router;
