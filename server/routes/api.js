const express = require('express');
const postController = require('../controllers/postController');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/actor');
const { createRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 15, keyPrefix: 'write' });
const reactLimiter = createRateLimiter({ windowMs: 60_000, max: 90, keyPrefix: 'react' });

// Health & Meta
router.get('/health', (_req, res) => {
  res.json({ ok: true, service: "Y'A GBAIRAI !", status: 'healthy', timestamp: new Date().toISOString() });
});
router.get('/meta', postController.getMeta);
router.get('/alias', postController.getAlias);

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

// Mini Admin / Moderation
router.get('/admin/dashboard', requireAdmin, adminController.getDashboard);
router.patch('/admin/reports/:id', requireAdmin, adminController.resolveReport);
router.patch('/admin/posts/:id/status', requireAdmin, adminController.setPostStatus);

module.exports = router;
