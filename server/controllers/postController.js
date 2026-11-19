const postService = require('../services/postService');
const {
  SUGGESTED_TAGS,
  VALID_REPORT_REASONS,
  validateCreatePost,
  validateAddPart,
  validateComment,
  validateReaction,
  validateReport,
} = require('../validators/contentValidator');
const { generateFunnyAlias } = require('../utils/helpers');

async function listPosts(req, res, next) {
  try {
    const data = await postService.listPosts(
      {
        type: req.query.type,
        tag: req.query.tag,
        search: req.query.search,
        sort: req.query.sort,
        page: req.query.page,
        limit: req.query.limit,
      },
      req
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPost(req, res, next) {
  try {
    const data = await postService.getPostById(req.params.id, req);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const validated = validateCreatePost(req.body);
    const result = await postService.createPost(validated, req);
    res.status(201).json({
      ok: true,
      data: result.post,
      flaggedForReview: result.flaggedForReview,
    });
  } catch (err) {
    next(err);
  }
}

async function addPart(req, res, next) {
  try {
    const validated = validateAddPart(req.body);
    const part = await postService.addPartToSeries(req.params.seriesId, validated, req);
    res.status(201).json({ ok: true, data: part });
  } catch (err) {
    next(err);
  }
}

async function toggleReaction(req, res, next) {
  try {
    const { type } = validateReaction(req.body);
    const data = await postService.toggleReaction(req.params.id, type, req);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const validated = validateComment(req.body);
    const data = await postService.addComment(req.params.id, validated, req);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function reportPost(req, res, next) {
  try {
    const validated = validateReport(req.body);
    const report = await postService.reportPost(req.params.id, validated, req);
    res.status(201).json({ ok: true, data: { id: report.id, status: report.status } });
  } catch (err) {
    next(err);
  }
}

async function deletePost(req, res, next) {
  try {
    const data = await postService.deletePost(req.params.id, req);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function getMeta(_req, res, next) {
  try {
    const meta = await postService.getMeta();
    res.json({
      ok: true,
      data: {
        ...meta,
        suggestedTags: SUGGESTED_TAGS,
        reportReasons: VALID_REPORT_REASONS,
      },
    });
  } catch (err) {
    next(err);
  }
}

function getAlias(_req, res) {
  res.json({ ok: true, data: { alias: generateFunnyAlias() } });
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  addPart,
  toggleReaction,
  addComment,
  reportPost,
  deletePost,
  getMeta,
  getAlias,
};
