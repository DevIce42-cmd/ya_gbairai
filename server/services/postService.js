const { prisma } = require('../db/prisma');
const {
  generateFunnyAlias,
  hashToken,
  estimateReadingTimeSec,
  computeHotScore,
} = require('../utils/helpers');
const { AppError } = require('../middlewares/errorHandler');

function formatPost(post, reactionMap, pollMap, actor) {
  const summary = reactionMap?.get(post.id) || {
    counts: { LAUGH: 0, SKULL: 0, MIND_BLOWN: 0, FIRE: 0 },
    userReactions: [],
  };

  const pollSummary = post.pollOptionA && post.pollOptionB
    ? {
        question: post.pollQuestion || 'Verdict de la famille ?',
        optionA: post.pollOptionA,
        optionB: post.pollOptionB,
        ...(pollMap?.get(post.id) || { votesA: 0, votesB: 0, totalVotes: 0, userChoice: null }),
      }
    : null;

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
    poll: pollSummary,
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

async function buildPollMap(postIds, actorKey) {
  const map = new Map();
  if (!postIds.length) return map;

  for (const id of postIds) {
    map.set(id, { votesA: 0, votesB: 0, totalVotes: 0, userChoice: null });
  }

  const grouped = await prisma.pollVote.groupBy({
    by: ['postId', 'choice'],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const entry = map.get(row.postId);
    if (!entry) continue;
    if (row.choice === 'A') entry.votesA = row._count._all;
    if (row.choice === 'B') entry.votesB = row._count._all;
    entry.totalVotes = entry.votesA + entry.votesB;
  }

  if (actorKey) {
    const mine = await prisma.pollVote.findMany({
      where: { postId: { in: postIds }, actorKey },
      select: { postId: true, choice: true },
    });
    for (const v of mine) {
      const entry = map.get(v.postId);
      if (entry) entry.userChoice = v.choice;
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

  const postIds = posts.map((p) => p.id);
  const [reactionMap, pollMap] = await Promise.all([
    buildReactionMap(postIds, actor?.actorKey),
    buildPollMap(postIds, actor?.actorKey),
  ]);

  return {
    items: posts.map((p) => formatPost(p, reactionMap, pollMap, actor)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: sort !== 'random' && skip + posts.length < total,
    },
  };
}

async function getRandomPost({ type, excludeId }, actor) {
  const where = { status: 'PUBLISHED' };
  if (type === 'CONFESSION' || type === 'STORYTIME') where.type = type;
  if (excludeId) where.id = { not: excludeId };

  const ids = await prisma.post.findMany({ where, select: { id: true } });
  if (!ids.length) {
    throw new AppError('Aucun dossier disponible pour la roulette pour le moment !', 404, 'EMPTY_FEED');
  }

  const picked = ids[Math.floor(Math.random() * ids.length)];
  const post = await prisma.post.findUnique({
    where: { id: picked.id },
    include: {
      tags: { include: { tag: true } },
      series: { select: { id: true, title: true, _count: { select: { posts: true } } } },
    },
  });

  const [reactionMap, pollMap] = await Promise.all([
    buildReactionMap([post.id], actor?.actorKey),
    buildPollMap([post.id], actor?.actorKey),
  ]);
  return formatPost(post, reactionMap, pollMap, actor);
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
        orderBy: [{ likesCount: 'desc' }, { createdAt: 'asc' }],
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

  const commentIds = post.comments.map((c) => c.id);
  const [reactionMap, pollMap, myCommentLikes] = await Promise.all([
    buildReactionMap([post.id], actor?.actorKey),
    buildPollMap([post.id], actor?.actorKey),
    actor?.actorKey && commentIds.length
      ? prisma.commentLike.findMany({
          where: { commentId: { in: commentIds }, actorKey: actor.actorKey },
          select: { commentId: true },
        })
      : Promise.resolve([]),
  ]);

  const likedSet = new Set(myCommentLikes.map((l) => l.commentId));
  const commentsWithLike = post.comments.map((c) => ({
    ...c,
    likedByMe: likedSet.has(c.id),
  }));

  return {
    ...formatPost(post, reactionMap, pollMap, actor),
    seriesParts: post.series?.posts || [],
    comments: commentsWithLike,
  };
}

async function createPost(data, actor) {
  const authorAlias = data.authorAlias || generateFunnyAlias();
  const authorTokenHash = actor?.guestId ? hashToken(actor.guestId) : null;
  const readingTimeSec = estimateReadingTimeSec(`${data.title || ''} ${data.content} ${data.plotTwist || ''}`);
  const now = new Date();
  const hotScore = computeHotScore({ reactionsCount: 0, commentsCount: 0, createdAt: now });
  const status = data.flagged ? 'FLAGGED' : 'PUBLISHED';

  const tagConnect = [];
  for (const t of data.tags || []) {
    const tagRecord = await prisma.tag.upsert({
      where: { slug: t.slug },
      update: {},
      create: { name: t.name, slug: t.slug },
    });
    tagConnect.push({ tagId: tagRecord.id });
  }

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
      pollQuestion: data.pollQuestion,
      pollOptionA: data.pollOptionA,
      pollOptionB: data.pollOptionB,
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

  const [reactionMap, pollMap] = await Promise.all([
    buildReactionMap([created.id], actor?.actorKey),
    buildPollMap([created.id], actor?.actorKey),
  ]);

  return {
    post: formatPost(created, reactionMap, pollMap, actor),
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

  const firstPart = series.posts[0];
  const isOwner =
    actor?.isAdmin ||
    (actor?.user && firstPart.userId && actor.user.id === firstPart.userId) ||
    (actor?.guestId && hashToken(actor.guestId) === series.authorTokenHash);

  if (!isOwner) {
    throw new AppError(
      'Seul l’auteur original peut ajouter un épisode à ce Storytime.',
      403,
      'FORBIDDEN'
    );
  }

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
      userId: firstPart.userId || actor?.user?.id || null,
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

  const [reactionMap, pollMap] = await Promise.all([
    buildReactionMap([created.id], actor?.actorKey),
    buildPollMap([created.id], actor?.actorKey),
  ]);
  return formatPost(created, reactionMap, pollMap, actor);
}

async function toggleReaction(postId, type, actor) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED' } });
  if (!post) throw new AppError('Publication introuvable.', 404, 'POST_NOT_FOUND');

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

    if (hadSame) return false;

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

async function votePoll(postId, choice, actor) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED' } });
  if (!post || !post.pollOptionA || !post.pollOptionB) {
    throw new AppError('Aucun sondage actif sur cette publication.', 404, 'POLL_NOT_FOUND');
  }

  await prisma.pollVote.upsert({
    where: {
      postId_actorKey: { postId, actorKey: actor.actorKey },
    },
    update: { choice },
    create: { postId, actorKey: actor.actorKey, choice },
  });

  const pollMap = await buildPollMap([postId], actor.actorKey);
  const counts = pollMap.get(postId);
  return {
    question: post.pollQuestion || 'Verdict de la famille ?',
    optionA: post.pollOptionA,
    optionB: post.pollOptionB,
    ...counts,
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

  if (data.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: data.parentId, postId, status: 'PUBLISHED' },
    });
    if (!parent) {
      throw new AppError('Commentaire parent introuvable.', 404, 'PARENT_NOT_FOUND');
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      parentId: data.parentId || null,
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

  return {
    comment: { ...comment, likedByMe: false },
    commentsCount,
  };
}

async function toggleCommentLike(commentId, actor) {
  const comment = await prisma.comment.findFirst({ where: { id: commentId, status: 'PUBLISHED' } });
  if (!comment) throw new AppError('Commentaire introuvable.', 404, 'COMMENT_NOT_FOUND');

  const existing = await prisma.commentLike.findUnique({
    where: {
      commentId_actorKey: { commentId, actorKey: actor.actorKey },
    },
  });

  let liked;
  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.commentLike.create({
      data: { commentId, actorKey: actor.actorKey },
    });
    liked = true;
  }

  const likesCount = await prisma.commentLike.count({ where: { commentId } });
  await prisma.comment.update({ where: { id: commentId }, data: { likesCount } });

  return { commentId, liked, likesCount };
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
    (actor?.user && post.userId && actor.user.id === post.userId) ||
    (actor?.guestId && post.authorTokenHash && hashToken(actor.guestId) === post.authorTokenHash);

  if (!canDelete) {
    throw new AppError('Action non autorisée.', 403, 'FORBIDDEN');
  }

  await prisma.post.delete({ where: { id: postId } });
  return { deleted: true, id: postId };
}

async function getMeta() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000);

  const [confessionsCount, storiesCount, sums, popularTags, weeklyTop] = await Promise.all([
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
    prisma.post.findFirst({
      where: { status: 'PUBLISHED', createdAt: { gte: sevenDaysAgo } },
      orderBy: [{ reactionsCount: 'desc' }, { commentsCount: 'desc' }, { viewsCount: 'desc' }],
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        authorAlias: true,
        reactionsCount: true,
        commentsCount: true,
        viewsCount: true,
      },
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
    popularTags: popularTags
      .filter((t) => t._count.posts > 0)
      .map((t) => ({
        name: t.name,
        slug: t.slug,
        count: t._count.posts,
      })),
    weeklyTopPost: weeklyTop || null,
    suggestedAlias: generateFunnyAlias(),
  };
}

module.exports = {
  listPosts,
  getRandomPost,
  getPostById,
  createPost,
  addPartToSeries,
  toggleReaction,
  votePoll,
  addComment,
  toggleCommentLike,
  reportPost,
  deletePost,
  getMeta,
};
