const adminService = require('../services/adminService');

async function getDashboard(_req, res, next) {
  try {
    const data = await adminService.getDashboard();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function resolveReport(req, res, next) {
  try {
    const data = await adminService.resolveReport(req.params.id, req.body?.action);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function setPostStatus(req, res, next) {
  try {
    const data = await adminService.setPostStatus(req.params.id, req.body?.status);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  resolveReport,
  setPostStatus,
};
