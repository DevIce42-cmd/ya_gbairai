require('../server/config/env');
const { prisma } = require('../server/db/prisma');
const {
  hashToken,
  estimateReadingTimeSec,
  computeHotScore,
  normalizeTag,
} = require('../server/utils/helpers');

const CONFESSIONS = [
  {
    title: 'Le micro ouvert en pleine visio',
    authorAlias: 'RenardMasqué42',
    hoursAgo: 2,
    views: 512,
    tags: ['#Boulot', '#Gênant'],
    content:
      "En réunion Zoom avec 40 personnes et le PDG, je pensais être en mute. J'ai lâché bien fort : « Encore une réunion qui aurait pu tenir dans un vocal de 12 secondes ». Silence total pendant 5 secondes. Le PDG a juste dit : « Bien reçu, on conclut en deux minutes ». Je prépare déjà ma valise.",
    plotTwist: "À la pause déjeuner, quatre collègues m'ont payé le café en me surnommant « Le Libérateur ».",
    reactions: { LAUGH: 48, SKULL: 31, MIND_BLOWN: 14, FIRE: 22 },
    comments: [
      { alias: 'PigeonMalin88', content: 'Tu viens de faire gagner 45 minutes à toute la boîte, héros anonyme !' },
      { alias: 'LamaNocturne19', content: 'Le PDG qui valide sans broncher, légendaire.' },
    ],
  },
  {
    title: null,
    authorAlias: 'CroissantFurtif77',
    hoursAgo: 4,
    views: 389,
    tags: ['#VieQuotidienne', '#Gênant'],
    content:
      "Ça fait 7 mois que mon voisin de palier m'appelle « Kevin ». Je m'appelle Axel. Au début j'ai pas osé le corriger par politesse, maintenant on se prête nos outils et je garde ses clés pendant ses vacances. Je suis trop loin dans le mensonge pour faire marche arrière.",
    plotTwist: null,
    reactions: { LAUGH: 62, SKULL: 27, MIND_BLOWN: 9, FIRE: 11 },
    comments: [
      { alias: 'HibouSuspect53', content: "T'as plus le choix, t'es Kevin jusqu'au prochain déménagement." },
    ],
  },
  {
    title: 'Le génie de la pâtisserie… ou presque',
    authorAlias: 'TacosMalin64',
    hoursAgo: 7,
    views: 421,
    tags: ['#Famille', '#PlotTwist'],
    content:
      "Depuis 3 ans, toute ma famille réclame « mon incroyable tarte au citron meringuée maison ». En réalité je passe chez le pâtissier à 8h du matin, je la glisse dans mon plat en céramique et je me mets un peu de farine sur le tee-shirt avant d'ouvrir la porte.",
    plotTwist: "Dimanche dernier ma tante m'a demandé la recette : j'ai improvisé des grammes au hasard en disant que le secret c'était le zeste de citron vert.",
    reactions: { LAUGH: 74, SKULL: 39, MIND_BLOWN: 21, FIRE: 19 },
    comments: [
      { alias: 'CactusTurbo31', content: 'La farine sur le tee-shirt c’est du niveau cinéma hollywoodien.' },
    ],
  },
  {
    title: null,
    authorAlias: 'KoalaCurieux28',
    hoursAgo: 10,
    views: 295,
    tags: ['#Amour', '#Gênant'],
    content:
      "Premier rendez-vous dans un resto chic. Pour impressionner mon date, je commande un plat dont je ne connais aucun mot. Le serveur m'apporte un crabe entier avec une pince en métal et un bavoir en papier géant. J'ai perdu un duel de 35 minutes contre un crustacé.",
    plotTwist: "Elle a tellement rigolé qu'on est toujours ensemble aujourd'hui et notre surnom secret c'est « Tourteau ».",
    reactions: { LAUGH: 45, SKULL: 16, MIND_BLOWN: 8, FIRE: 28 },
    comments: [],
  },
  {
    title: null,
    authorAlias: 'PingouinRebelle91',
    hoursAgo: 15,
    views: 240,
    tags: ['#VieQuotidienne', '#Insolite'],
    content:
      "Quand je suis seul chez moi et que je rate un lancer de papier dans la poubelle, je fais semblant que le stade entier me hue et je recommence jusqu'à marquer avant de saluer la foule imaginaire. J'ai 27 ans.",
    plotTwist: null,
    reactions: { LAUGH: 81, SKULL: 24, MIND_BLOWN: 5, FIRE: 15 },
    comments: [
      { alias: 'NinjaBavard14', content: 'On fait tous ça, ne laissez personne vous juger !' },
    ],
  },
];

async function upsertTags(tagNames) {
  const results = [];
  for (const raw of tagNames) {
    const parsed = normalizeTag(raw);
    if (!parsed) continue;
    const tag = await prisma.tag.upsert({
      where: { slug: parsed.slug },
      update: {},
      create: { name: parsed.name, slug: parsed.slug },
    });
    results.push({ tagId: tag.id });
  }
  return results;
}

async function seedReactionsAndComments(postId, reactions, comments, hoursAgo) {
  for (const [type, count] of Object.entries(reactions)) {
    for (let i = 0; i < count; i += 1) {
      await prisma.reaction.create({
        data: {
          postId,
          actorKey: `seed:${postId}:${type}:${i}`,
          type,
        },
      });
    }
  }

  for (let i = 0; i < comments.length; i += 1) {
    const c = comments[i];
    await prisma.comment.create({
      data: {
        postId,
        authorAlias: c.alias,
        content: c.content,
        createdAt: new Date(Date.now() - Math.max(0.2, hoursAgo - 0.5 - i * 0.3) * 3_600_000),
      },
    });
  }
}

async function main() {
  const existingCount = await prisma.post.count();
  if (existingCount > 0) {
    console.log('Base déjà peuplée, seed ignoré.');
    return;
  }

  // 1. Seed Confessions
  for (const item of CONFESSIONS) {
    const createdAt = new Date(Date.now() - item.hoursAgo * 3_600_000);
    const totalReactions = Object.values(item.reactions).reduce((a, b) => a + b, 0);
    const totalComments = item.comments.length;
    const tagConnect = await upsertTags(item.tags);

    const post = await prisma.post.create({
      data: {
        type: 'CONFESSION',
        title: item.title,
        content: item.content,
        plotTwist: item.plotTwist,
        authorAlias: item.authorAlias,
        readingTimeSec: estimateReadingTimeSec(`${item.title || ''} ${item.content}`),
        viewsCount: item.views,
        reactionsCount: totalReactions,
        commentsCount: totalComments,
        hotScore: computeHotScore({
          reactionsCount: totalReactions,
          commentsCount: totalComments,
          createdAt,
        }),
        createdAt,
        tags: { create: tagConnect },
      },
    });

    await seedReactionsAndComments(post.id, item.reactions, item.comments, item.hoursAgo);
  }

  // 2. Seed Multi-Part Storytime (Partie 1 + Partie 2)
  const series1 = await prisma.storySeries.create({
    data: {
      title: "Le voisin qui volait mes colis… jusqu'au karma connecté",
      authorTokenHash: hashToken('seed-series-1'),
    },
  });

  const s1Tags = await upsertTags(['#Karma', '#PlotTwist', '#VieQuotidienne']);

  const part1Date = new Date(Date.now() - 8 * 3_600_000);
  const p1Reactions = { LAUGH: 64, SKULL: 29, MIND_BLOWN: 47, FIRE: 85 };
  const p1Comments = [
    { alias: 'PanthèreNocturne50', content: 'Je veux la Partie 2 TOUT DE SUITE !!' },
    { alias: 'BaguetteDiscret33', content: 'Le culot de Gérard en peignoir, j’ai crié.' },
  ];
  const p1TotalR = Object.values(p1Reactions).reduce((a, b) => a + b, 0);

  const part1 = await prisma.post.create({
    data: {
      type: 'STORYTIME',
      title: "Le voisin qui volait mes colis… jusqu'au karma connecté",
      content:
        "Dans mon immeuble, un voisin du rez-de-chaussée — appelons-le Gérard — avait une spécialité bien rodée : il récupérait les colis des autres quand le livreur passait, puis jurait la main sur le cœur qu'il n'avait jamais rien reçu.\n\nEn novembre, je commande une lampe design connectée en promo que je traquais depuis des mois. Le suivi affiche : « Remis en main propre à votre voisin M. G. ». Je descends poliment. Gérard ouvre en peignoir, regarde mon écran et me répond sans cligner des yeux : « Le livreur a dû se tromper d'immeuble, j'ai rien signé ».\n\nPendant trois mois, impossible de prouver quoi que ce soit. Jusqu'à un vendredi soir pluvieux où, en rentrant tard, je passe devant sa fenêtre dont les rideaux étaient entrouverts…\n\nPosée fièrement sur sa table basse, allumée en jaune chaud : MA lampe vert sauge, avec encore le petit autocollant de série sur le pied. Mais Gérard ignorait un détail crucial : j'avais encore le code Bluetooth et l'application dans mon téléphone.",
      plotTwist: null,
      authorAlias: 'HibouTactique61',
      authorTokenHash: hashToken('seed-series-1'),
      seriesId: series1.id,
      partNumber: 1,
      readingTimeSec: 95,
      viewsCount: 920,
      reactionsCount: p1TotalR,
      commentsCount: p1Comments.length,
      hotScore: computeHotScore({ reactionsCount: p1TotalR, commentsCount: p1Comments.length, createdAt: part1Date }),
      createdAt: part1Date,
      tags: { create: s1Tags },
    },
  });
  await seedReactionsAndComments(part1.id, p1Reactions, p1Comments, 8);

  const part2Date = new Date(Date.now() - 3 * 3_600_000);
  const p2Reactions = { LAUGH: 118, SKULL: 52, MIND_BLOWN: 61, FIRE: 134 };
  const p2Comments = [
    { alias: 'RenardMasqué42', content: 'Le mode stroboscope rose fluo pendant le JT, c’est de l’art contemporain.' },
    { alias: 'RatonCosmique73', content: 'La revanche la plus propre et légale de l’histoire d’Internet !' },
  ];
  const p2TotalR = Object.values(p2Reactions).reduce((a, b) => a + b, 0);

  const part2 = await prisma.post.create({
    data: {
      type: 'STORYTIME',
      title: 'La revanche Bluetooth — Partie 2 (Le dénouement)',
      content:
        "Suite à vos réactions sur la Partie 1, voici la fin de l'opération !\n\nLe lendemain soir, je m'installe tranquillement sur mon balcon juste au-dessus du salon de Gérard. J'ouvre l'application de la lampe, je lance la recherche Bluetooth… CONNEXION RÉUSSIE. Un grand sourire apparaît sur mon visage.\n\nJ'attends 20h05, pile quand il regarde son journal télévisé. J'active le mode « Disco Stroboscope Rose Fluo » à 100% de luminosité pendant 8 secondes, puis je repasse en lumière normale. J'entends juste un gros « MAIS QU'EST-CE QUE C'EST QUE CE TRUC ?! » monter du rez-de-chaussée.\n\nLe soir suivant, même heure : je fais clignoter la lampe en morse lentement en rouge rubis. Le troisième soir, je la passe en bleu glacé toutes les deux minutes.",
      plotTwist:
        "Le quatrième matin en ouvrant ma porte, la lampe était posée proprement sur mon paillasson, dépoussiérée, avec un post-it : « Finalement le livreur vient de me la déposer, bonne journée ». Je n'ai plus jamais perdu un seul colis.",
      authorAlias: 'HibouTactique61',
      authorTokenHash: hashToken('seed-series-1'),
      seriesId: series1.id,
      partNumber: 2,
      readingTimeSec: 85,
      viewsCount: 1140,
      reactionsCount: p2TotalR,
      commentsCount: p2Comments.length,
      hotScore: computeHotScore({ reactionsCount: p2TotalR, commentsCount: p2Comments.length, createdAt: part2Date }),
      createdAt: part2Date,
      tags: { create: s1Tags },
    },
  });
  await seedReactionsAndComments(part2.id, p2Reactions, p2Comments, 3);

  // 3. Another Storytime (Standalone Partie 1)
  const series2 = await prisma.storySeries.create({
    data: {
      title: "Invité d'honneur à un mariage où je ne connaissais personne",
      authorTokenHash: hashToken('seed-series-2'),
    },
  });
  const s2Tags = await upsertTags(['#Soirée', '#PlotTwist', '#Insolite']);
  const s2Date = new Date(Date.now() - 5 * 3_600_000);
  const s2Reactions = { LAUGH: 93, SKULL: 28, MIND_BLOWN: 54, FIRE: 79 };
  const s2Comments = [
    { alias: 'CanardSolaire22', content: 'Répondre « un peu des deux » avec un aplomb pareil, respect total.' },
  ];
  const s2TotalR = Object.values(s2Reactions).reduce((a, b) => a + b, 0);

  const story2 = await prisma.post.create({
    data: {
      type: 'STORYTIME',
      title: "Comment j'ai fini invité d'honneur à un mariage où je ne connaissais personne",
      content:
        "Samedi d'août, je dois rejoindre mon pote Bastien pour l'anniversaire de sa cousine dans un domaine chic. J'arrive en costume bleu marine avec une bouteille de champagne et 25 minutes de retard.\n\nJe tombe sur 120 invités élégants, des guirlandes lumineuses et un groupe de jazz. Je pose ma bouteille sur la table des cadeaux, je prends une coupe et un monsieur très chaleureux me demande : « Vous êtes plutôt du côté de Claire ou de Thomas ? ». Persuadé qu'il parle d'un couple d'amis de Bastien, je souris et je réponds avec 100% d'assurance : « Un peu des deux, on s'est rencontrés en festival il y a trois ans ! ».\n\nCinq minutes plus tard, SMS de Bastien : « T'es où mec ? On est au resto japonais en centre-ville ! ». Je m'étais trompé d'adresse sur le GPS… mais le photographe m'avait déjà attrapé pour la photo officielle des « amis proches du marié ».",
      plotTwist:
        "Au dessert, j'ai tout avoué à Thomas le marié. Il a tellement ri qu'il a pris le micro pour raconter l'histoire à toute la salle — et deux ans plus tard, on part encore en vacances ensemble.",
      authorAlias: 'FantômeLégendaire90',
      authorTokenHash: hashToken('seed-series-2'),
      seriesId: series2.id,
      partNumber: 1,
      readingTimeSec: 110,
      viewsCount: 780,
      reactionsCount: s2TotalR,
      commentsCount: s2Comments.length,
      hotScore: computeHotScore({ reactionsCount: s2TotalR, commentsCount: s2Comments.length, createdAt: s2Date }),
      createdAt: s2Date,
      tags: { create: s2Tags },
    },
  });
  await seedReactionsAndComments(story2.id, s2Reactions, s2Comments, 5);

  console.log("✅ Base Y'A GBAIRAI ! peuplée avec succès (Confessions + Storytimes avec suites).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
