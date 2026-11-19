const { prisma } = require('../db/prisma');
const { AppError } = require('../middlewares/errorHandler');

async function getDashboard() {
  const [openReports, flaggedPosts, hiddenPostsCount] = await Promise.all([
    prisma.report.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            type: true,
            title: true,
            content: true,
            authorAlias: true,
            status: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.post.findMany({
      where: { status: 'FLAGGED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        authorAlias: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.post.count({ where: { status: 'HIDDEN' } }),
  ]);

  return {
    openReports,
    flaggedPosts,
    hiddenPostsCount,
  };
}

async function resolveReport(reportId, action) {
  if (!['dismiss', 'hide_post', 'restore_post'].includes(action)) {
    throw new AppError('Action invalide ("dismiss", "hide_post" ou "restore_post").', 400, 'VALIDATION_ERROR');
  }

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError('Signalement introuvable.', 404, 'REPORT_NOT_FOUND');

  if (action === 'hide_post') {
    await prisma.post.update({
      where: { id: report.postId },
      data: { status: 'HIDDEN' },
    });
  } else if (action === 'restore_post') {
    await prisma.post.update({
      where: { id: report.postId },
      data: { status: 'PUBLISHED' },
    });
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status: action === 'dismiss' ? 'DISMISSED' : 'RESOLVED' },
  });

  return updated;
}

async function setPostStatus(postId, status) {
  if (!['PUBLISHED', 'HIDDEN'].includes(status)) {
    throw new AppError('Statut invalide.', 400, 'VALIDATION_ERROR');
  }
  const post = await prisma.post.update({
    where: { id: postId },
    data: { status },
  });
  return post;
}

module.exports = {
  getDashboard,
  resolveReport,
  setPostStatus,
};
