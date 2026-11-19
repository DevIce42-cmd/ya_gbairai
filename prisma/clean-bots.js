require('../server/config/env');
const { prisma } = require('../server/db/prisma');

// Removes all seeded demo/bot posts, bot comments, bot series, and seed:* reactions
// while preserving any real user-created content.
const BOT_ALIASES = [
  'RenardMasqué42',
  'CroissantFurtif77',
  'TacosMalin64',
  'KoalaCurieux28',
  'PingouinRebelle91',
  'HibouTactique61',
  'FantômeLégendaire90',
];

const BOT_COMMENT_ALIASES = [
  'PigeonMalin88',
  'LamaNocturne19',
  'HibouSuspect53',
  'CactusTurbo31',
  'NinjaBavard14',
  'PanthèreNocturne50',
  'BaguetteDiscret33',
  'RenardMasqué42',
  'RatonCosmique73',
  'CanardSolaire22',
];

async function cleanBots() {
  const deletedReactions = await prisma.reaction.deleteMany({
    where: { actorKey: { startsWith: 'seed:' } },
  });

  const deletedComments = await prisma.comment.deleteMany({
    where: { authorAlias: { in: BOT_COMMENT_ALIASES } },
  });

  const deletedPosts = await prisma.post.deleteMany({
    where: { authorAlias: { in: BOT_ALIASES } },
  });

  // Clean up orphan StorySeries with 0 posts
  const emptySeries = await prisma.storySeries.findMany({
    where: { posts: { none: {} } },
    select: { id: true },
  });
  if (emptySeries.length > 0) {
    await prisma.storySeries.deleteMany({
      where: { id: { in: emptySeries.map((s) => s.id) } },
    });
  }

  // Clean up unused tags
  await prisma.tag.deleteMany({
    where: { posts: { none: {} } },
  });

  if (deletedPosts.count || deletedComments.count || deletedReactions.count) {
    console.log(
      `🧹 Nettoyage bots terminé : ${deletedPosts.count} posts, ${deletedComments.count} commentaires, ${deletedReactions.count} réactions supprimés.`
    );
  }
}

cleanBots()
  .catch((err) => {
    console.error('[clean-bots] erreur:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
