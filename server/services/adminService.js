const { prisma } = require('../db/prisma');
const { AppError } = require('../middlewares/errorHandler');

function getLast7DaysBuckets() {
  const days = [];
  const formatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key,
      label: formatter.format(d),
      visits: 0,
      posts: 0,
      newUsers: 0,
    });
  }
  return days;
}

async function getDashboard() {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60_000);
  const oneDayAgo = new Date(now.getTime() - 24 * 3_600_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3_600_000);

  const [
    openReports,
    flaggedPosts,
    hiddenPostsCount,
    totalUsers,
    newUsersToday,
    recentUsers,
    visits7d,
    posts7d,
    users7d,
    onlineSessions,
    uniqueSessions24h,
    uniqueSessionsAll,
    confessionsCount,
    storiesCount,
    sums,
  ] = await Promise.all([
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
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatarColor: true,
        createdAt: true,
        lastLoginAt: true,
        lastSeenAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    }),
    prisma.visitEvent.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, deviceType: true },
    }),
    prisma.post.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.visitEvent.findMany({
      where: { createdAt: { gte: fiveMinAgo } },
      distinct: ['sessionKey'],
      select: { sessionKey: true },
    }),
    prisma.visitEvent.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      distinct: ['sessionKey'],
      select: { sessionKey: true },
    }),
    prisma.visitEvent.findMany({
      distinct: ['sessionKey'],
      select: { sessionKey: true },
    }),
    prisma.post.count({ where: { type: 'CONFESSION', status: 'PUBLISHED' } }),
    prisma.post.count({ where: { type: 'STORYTIME', status: 'PUBLISHED' } }),
    prisma.post.aggregate({
      where: { status: 'PUBLISHED' },
      _sum: { reactionsCount: true, commentsCount: true, viewsCount: true },
    }),
  ]);

  const buckets = getLast7DaysBuckets();
  const byDate = new Map(buckets.map((b) => [b.date, b]));

  let mobileVisits = 0;
  let desktopVisits = 0;
  for (const v of visits7d) {
    const key = v.createdAt.toISOString().slice(0, 10);
    if (byDate.has(key)) byDate.get(key).visits += 1;
    if (v.deviceType === 'mobile') mobileVisits += 1;
    else desktopVisits += 1;
  }

  for (const p of posts7d) {
    const key = p.createdAt.toISOString().slice(0, 10);
    if (byDate.has(key)) byDate.get(key).posts += 1;
  }

  for (const u of users7d) {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (byDate.has(key)) byDate.get(key).newUsers += 1;
  }

  return {
    analytics: {
      onlineNow: onlineSessions.length,
      totalUsers,
      newUsersToday,
      uniqueVisitors24h: uniqueSessions24h.length,
      uniqueVisitorsTotal: uniqueSessionsAll.length,
      totalVisits7d: visits7d.length,
      deviceBreakdown: {
        mobile: mobileVisits,
        desktop: desktopVisits,
      },
      contentStats: {
        confessions: confessionsCount,
        stories: storiesCount,
        reactions: sums._sum.reactionsCount || 0,
        comments: sums._sum.commentsCount || 0,
        views: sums._sum.viewsCount || 0,
      },
      dailyActivity: buckets,
    },
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      avatarColor: u.avatarColor,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      lastSeenAt: u.lastSeenAt,
      postsCount: u._count.posts,
      commentsCount: u._count.comments,
    })),
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
  return prisma.post.update({
    where: { id: postId },
    data: { status },
  });
}

module.exports = {
  getDashboard,
  resolveReport,
  setPostStatus,
};
