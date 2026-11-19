const { prisma } = require('../db/prisma');
const {
  generateFunnyAlias,
  hashToken,
  estimateReadingTimeSec,
  computeHotScore,
} = require('../utils/helpers');
const { AppError } = require('../middlewares/errorHandler');

function formatPost(post, reactionMap, actor) {
  const summary = reactionMap?.get(post.id) || {
    counts: { LAUGH: 0, SKULL: 0, MIND_BLOWN: 0, FIRE: 0 },
    userReactions: [],
  };

  const canManage = Boolean(
    actor?.isAdmin ||
      (actor?.user && post.userId && actor.user.id === post.userId) ||
      (actor?.guestId && post.authorTokenHash && hashToken(actor.guestId) === post.authorTokenHash)
  );

  return {
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    plotTwist: post.plotTwist,
    authorAlias: post.authorAlias,
    seriesId: post.seriesId,
    partNumber: post.partNumber,
    seriesTitle: post.series?.title || null,
    seriesPartsCount: post.series?._count?.posts || (post.seriesId ? 1 : 0),
    readingTimeSec: post.readingTimeSec,
    viewsCount: post.viewsCount,
    reactionsCount: post.reactionsCount,
    commentsCount: post.commentsCount,
    hotScore: post.hotScore,
    status: post.status,
    createdAt: post.createdAt,
    tags: (post.tags || []).map((pt) => ({ name: pt.tag.name, slug: pt.tag.slug })),
    reactions: summary.counts,
    userReactions: summary.userReactions,
    canManage,
  };
}

async function buildReactionMap(postIds, actorKey) {
  const map = new Map();
  if (!postIds.length) return map;

  for (const id of postIds) {
    map.set(id, {
      counts: { LAUGH: 0, SKULL: 0, MIND_BLOWN: 0, FIRE: 0 },
      userReactions: [],
    });
  }

  const grouped = await prisma.reaction.groupBy({
    by: ['postId', 'type'],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const entry = map.get(row.postId);
    if (entry && row.type in entry.counts) {
      entry.counts[row.type] = row._count._all;
    }
  }

  if (actorKey) {
    const mine = await prisma.reaction.findMany({
      where: { postId: { in: postIds }, actorKey },
      select: { postId: true, type: true },
    });
    for (const r of mine) {
      const entry = map.get(r.postId);
      if (entry) entry.userReactions.push(r.type);
    }
  }

  return map;
}

async function listPosts({ type, tag, search, sort = 'trending', page = 1, limit = 12 }, actor) {
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 36);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const where = { status: 'PUBLISHED' };
  if (type === 'CONFESSION' || type === 'STORYTIME') {
    where.type = type;
  }
  if (tag) {
    const slug = String(tag)
      .replace(/^#+/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    where.tags = { some: { tag: { slug } } };
  }
  if (search) {
    const q = String(search).trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
      { authorAlias: { contains: q, mode: 'insensitive' } },
    ];
  }

  const include = {
    tags: { include: { tag: true } },
    series: { select: { id: true, title: true, _count: { select: { posts: true } } } },
  };

  const total = await prisma.post.count({ where });

  let posts;
  if (sort === 'random') {
    // Fetch matching ids and shuffle for true random feed
    const allIds = await prisma.post.findMany({ where, select: { id: true } });
    for (let i = allIds.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
    }
    const chosenIds = allIds.slice(0, safeLimit).map((x) => x.id);
    const fetched = await prisma.post.findMany({
      where: { id: { in: chosenIds } },
      include,
    });
    const byId = new Map(fetched.map((p) => [p.id, p]));
    posts = chosenIds.map((id) => byId.get(id)).filter(Boolean);
  } else {
    const orderBy =
      sort === 'recent'
        ? [{ createdAt: 'desc' }]
        : [{ hotScore: 'desc' }, { createdAt: 'desc' }];

    posts = await prisma.post.findMany({
      where,
      include,
      orderBy,
      skip,
      take: safeLimit,
    });
  }

  const reactionMap = await buildReactionMap(
    posts.map((p) => p.id),
    actor?.actorKey
  );

  return {
    items: posts.map((p) => formatPost(p, reactionMap, actor)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: sort !== 'random' && skip + posts.length < total,
    },
  };
}

async function getPostById(id, actor, { countView = true } = {}) {
  const post = await prisma.post.findFirst({
    where: { id, status: 'PUBLISHED' },
    include: {
      tags: { include: { tag: true } },
      series: {
        include: {
          posts: {
            where: { status: 'PUBLISHED' },
            orderBy: { partNumber: 'asc' },
            select: {
              id: true,
              title: true,
              partNumber: true,
              readingTimeSec: true,
              createdAt: true,
            },
          },
          _count: { select: { posts: true } },
        },
      },
      comments: {
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!post) {
    throw new AppError('Publication introuvable.', 404, 'POST_NOT_FOUND');
  }

  if (countView) {
    await prisma.post.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });
    post.viewsCount += 1;
  }

  const reactionMap = await buildReactionMap([post.id], actor?.actorKey);
  return {
    ...formatPost(post, reactionMap, actor),
    seriesParts: post.series?.posts || [],
    comments: post.comments,
  };
}

async function createPost(data, actor) {
  const authorAlias = data.authorAlias || generateFunnyAlias();
  const authorTokenHash = actor?.guestId ? hashToken(actor.guestId) : null;
  const readingTimeSec = estimateReadingTimeSec(`${data.title || ''} ${data.content} ${data.plotTwist || ''}`);
  const now = new Date();
  const hotScore = computeHotScore({ reactionsCount: 0, commentsCount: 0, createdAt: now });
  const status = data.flagged ? 'FLAGGED' : 'PUBLISHED';

  // Ensure tags exist
  const tagConnect = [];
  for (const t of data.tags || []) {
    const tagRecord = await prisma.tag.upsert({
      where: { slug: t.slug },
      update: {},
      create: { name: t.name, slug: t.slug },
    });
    tagConnect.push({ tagId: tagRecord.id });
  }

  // If STORYTIME, automatically create a StorySeries so the author can add Partie 2, Partie 3...
  let seriesId = null;
  let partNumber = null;
  if (data.type === 'STORYTIME') {
    const series = await prisma.storySeries.create({
      data: {
        title: data.title,
        authorTokenHash: authorTokenHash || hashToken(actor?.actorKey || 'anon'),
      },
    });
    seriesId = series.id;
    partNumber = 1;
  }

  const created = await prisma.post.create({
    data: {
      type: data.type,
      title: data.title,
      content: data.content,
      plotTwist: data.plotTwist,
      authorAlias,
      authorTokenHash,
      userId: actor?.user?.id || null,
      seriesId,
      partNumber,
      readingTimeSec,
      hotScore,
      status,
      tags: { create: tagConnect },
    },
    include: {
      tags: { include: { tag: true } },
      series: { select: { id: true, title: true, _count: { select: { posts: true } } } },
    },
  });

  if (data.flagged) {
    await prisma.report.create({
      data: {
        postId: created.id,
        reason: 'Filtre automatique anti-abus',
        details: 'Contenu mis en attente de modération par le filtre automatique.',
        reporterKey: 'system:auto-filter',
      },
    });
  }

  const reactionMap = await buildReactionMap([created.id], actor?.actorKey);
  return {
    post: formatPost(created, reactionMap, actor),
    flaggedForReview: data.flagged,
  };
}

async function addPartToSeries(seriesId, data, actor) {
  const series = await prisma.storySeries.findUnique({
    where: { id: seriesId },
    include: {
      posts: {
        orderBy: { partNumber: 'asc' },
        include: { tags: true },
      },
    },
  });

  if (!series || !series.posts.length) {
    throw new AppError('Série Storytime introuvable.', 404, 'SERIES_NOT_FOUND');
  }

  const isOwner =
    actor?.isAdmin ||
    (actor?.guestId && hashToken(actor.guestId) === series.authorTokenHash);

  if (!isOwner) {
    throw new AppError(
      'Seul l’auteur original (depuis le même navigateur) peut ajouter une suite à ce Storytime.',
      403,
      'FORBIDDEN'
    );
  }

  const firstPart = series.posts[0];
  const nextPartNumber = Math.max(...series.posts.map((p) => p.partNumber || 1)) + 1;
  const title = data.title || `${series.title} — Partie ${nextPartNumber}`;
  const readingTimeSec = estimateReadingTimeSec(`${title} ${data.content} ${data.plotTwist || ''}`);
  const hotScore = computeHotScore({ reactionsCount: 0, commentsCount: 0, createdAt: new Date() });

  const created = await prisma.post.create({
    data: {
      type: 'STORYTIME',
      title,
      content: data.content,
      plotTwist: data.plotTwist,
      authorAlias: firstPart.authorAlias,
      authorTokenHash: firstPart.authorTokenHash,
      seriesId: series.id,
      partNumber: nextPartNumber,
      readingTimeSec,
      hotScore,
      status: data.flagged ? 'FLAGGED' : 'PUBLISHED',
      tags: {
        create: firstPart.tags.map((t) => ({ tagId: t.tagId })),
      },
    },
    include: {
      tags: { include: { tag: true } },
      series: { select: { id: true, title: true, _count: { select: { posts: true } } } },
    },
  });

  const reactionMap = await buildReactionMap([created.id], actor?.actorKey);
  return formatPost(created, reactionMap, actor);
}

async function toggleReaction(postId, type, actor) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED' } });
  if (!post) throw new AppError('Publication introuvable.', 404, 'POST_NOT_FOUND');

  // Exclusive single reaction per user per post:
  // clicking the same emoji removes it; clicking another replaces the previous one.
  const active = await prisma.$transaction(async (tx) => {
    const existingAll = await tx.reaction.findMany({
      where: { postId, actorKey: actor.actorKey },
    });

    const hadSame = existingAll.some((r) => r.type === type);

    if (existingAll.length > 0) {
      await tx.reaction.deleteMany({
        where: { postId, actorKey: actor.actorKey },
      });
    }

    if (hadSame) {
      return false;
    }

    await tx.reaction.create({
      data: { postId, actorKey: actor.actorKey, type },
    });
    return true;
  });

  const totalReactions = await prisma.reaction.count({ where: { postId } });
  const hotScore = computeHotScore({
    reactionsCount: totalReactions,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
  });

  await prisma.post.update({
    where: { id: postId },
    data: { reactionsCount: totalReactions, hotScore },
  });

  const reactionMap = await buildReactionMap([postId], actor.actorKey);
  const summary = reactionMap.get(postId);

  return {
    active,
    type,
    reactions: summary.counts,
    reactionsCount: totalReactions,
    userReactions: summary.userReactions,
  };
}

async function addComment(postId, data, actor) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED' } });
  if (!post) throw new AppError('Publication introuvable.', 404, 'POST_NOT_FOUND');

  if (data.flagged) {
    throw new AppError(
      'Ce commentaire contient des termes bloqués par notre filtre de modération.',
      400,
      'CONTENT_BLOCKED'
    );
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      userId: actor?.user?.id || null,
      authorAlias: data.authorAlias || generateFunnyAlias(),
      content: data.content,
    },
  });

  const commentsCount = await prisma.comment.count({
    where: { postId, status: 'PUBLISHED' },
  });
  const hotScore = computeHotScore({
    reactionsCount: post.reactionsCount,
    commentsCount,
    createdAt: post.createdAt,
  });

  await prisma.post.update({
    where: { id: postId },
    data: { commentsCount, hotScore },
  });

  return { comment, commentsCount };
}

async function reportPost(postId, { reason, details }, actor) {
  const post = await prisma.post.findFirst({ where: { id: postId } });
  if (!post) throw new AppError('Publication introuvable.', 404, 'POST_NOT_FOUND');

  return prisma.report.create({
    data: {
      postId,
      reason,
      details,
      reporterKey: actor.actorKey,
    },
  });
}

async function deletePost(postId, actor) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError('Publication introuvable.', 404, 'POST_NOT_FOUND');

  const canDelete =
    actor?.isAdmin ||
    (actor?.guestId && post.authorTokenHash && hashToken(actor.guestId) === post.authorTokenHash);

  if (!canDelete) {
    throw new AppError('Action non autorisée.', 403, 'FORBIDDEN');
  }

  await prisma.post.delete({ where: { id: postId } });
  return { deleted: true, id: postId };
}

async function getMeta() {
  const [confessionsCount, storiesCount, sums, popularTags] = await Promise.all([
    prisma.post.count({ where: { type: 'CONFESSION', status: 'PUBLISHED' } }),
    prisma.post.count({ where: { type: 'STORYTIME', status: 'PUBLISHED' } }),
    prisma.post.aggregate({
      where: { status: 'PUBLISHED' },
      _sum: { reactionsCount: true, commentsCount: true, viewsCount: true },
    }),
    prisma.tag.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { posts: { _count: 'desc' } },
      take: 12,
    }),
  ]);

  return {
    stats: {
      confessions: confessionsCount,
      stories: storiesCount,
      reactions: sums._sum.reactionsCount || 0,
      comments: sums._sum.commentsCount || 0,
      views: sums._sum.viewsCount || 0,
    },
    popularTags: popularTags.map((t) => ({
      name: t.name,
      slug: t.slug,
      count: t._count.posts,
    })),
    suggestedAlias: generateFunnyAlias(),
  };
}

module.exports = {
  listPosts,
  getPostById,
  createPost,
  addPartToSeries,
  toggleReaction,
  addComment,
  reportPost,
  deletePost,
  getMeta,
};
