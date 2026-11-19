const { AppError } = require('../middlewares/errorHandler');
const { normalizeTag } = require('../utils/helpers');

const VALID_REACTIONS = ['LAUGH', 'SKULL', 'MIND_BLOWN', 'FIRE'];

const SUGGESTED_TAGS = [
  '#Gbairai',
  '#HonteDeBabi',
  '#Karma',
  '#PlotTwist',
  '#Goumin',
  '#Taff',
  '#Maquis',
  '#Gbaka',
  '#Famille',
  '#VieDeBabi',
];

const VALID_REPORT_REASONS = [
  'Propos haineux ou harcèlement',
  'Données personnelles / Doxxing',
  'Spam ou publicité',
  'Contenu choquant / inapproprié',
  'Autre',
];

// Basic anti-doxxing & spam/inappropriate content patterns
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+\d{1,3}|0)\s*[1-9](?:[\s.-]*\d{2}){3,4}/;
const URL_SPAM_RE = /(https?:\/\/|www\.)\S+/gi;
const BANNED_TERMS = [
  'tue-toi',
  'suicide-toi',
  'va crever',
  'arnaque crypto',
  'gagnez 5000€',
  'cliquez ici',
];

function sanitizeText(input) {
  return String(input || '')
    .replace(/<[^>]*>?/gm, '') // strip HTML tags (anti-XSS)
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .trim();
}

function inspectSafety(text) {
  if (EMAIL_RE.test(text) || PHONE_RE.test(text)) {
    throw new AppError(
      'Pour protéger l’anonymat, les e-mails et numéros de téléphone sont interdits.',
      400,
      'PII_BLOCKED'
    );
  }

  const urls = text.match(URL_SPAM_RE) || [];
  if (urls.length >= 2) {
    throw new AppError('Les liens publicitaires ou multiples URLs ne sont pas autorisés.', 400, 'SPAM_BLOCKED');
  }

  const lower = text.toLowerCase();
  const flagged = BANNED_TERMS.some((term) => lower.includes(term));
  return { flagged };
}

function parseTags(rawTags) {
  const list = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === 'string'
      ? rawTags.split(/[\s,]+/)
      : [];

  const unique = new Map();
  for (const item of list) {
    const parsed = normalizeTag(item);
    if (parsed && !unique.has(parsed.slug)) {
      unique.set(parsed.slug, parsed);
    }
    if (unique.size >= 4) break;
  }
  return [...unique.values()];
}

function validateCreatePost(body) {
  const type =
    body?.type === 'STORYTIME' ? 'STORYTIME' : body?.type === 'CONFESSION' ? 'CONFESSION' : null;
  if (!type) {
    throw new AppError('Le type doit être "CONFESSION" ou "STORYTIME".', 400, 'VALIDATION_ERROR');
  }

  const title = sanitizeText(body?.title);
  const content = sanitizeText(body?.content);
  const plotTwist = sanitizeText(body?.plotTwist);
  const authorAlias = sanitizeText(body?.authorAlias);
  const tags = parseTags(body?.tags);

  // Optional quick poll ("Qui a tort ?")
  const pollEnabled = Boolean(body?.pollEnabled);
  const pollQuestion = pollEnabled ? sanitizeText(body?.pollQuestion || 'Verdict de la famille ?') : '';
  const pollOptionA = pollEnabled ? sanitizeText(body?.pollOptionA || 'Tu gères 👏') : '';
  const pollOptionB = pollEnabled ? sanitizeText(body?.pollOptionB || 'Tu as gâté 😅') : '';

  if (pollEnabled) {
    if (pollQuestion.length > 100 || pollOptionA.length < 1 || pollOptionA.length > 40 || pollOptionB.length < 1 || pollOptionB.length > 40) {
      throw new AppError('Les options du sondage doivent contenir 1 à 40 caractères.', 400, 'VALIDATION_ERROR');
    }
  }

  if (type === 'STORYTIME') {
    if (title.length < 5 || title.length > 120) {
      throw new AppError('Un Storytime doit avoir un titre entre 5 et 120 caractères.', 400, 'VALIDATION_ERROR');
    }
    if (content.length < 80 || content.length > 9000) {
      throw new AppError('Un Storytime doit contenir entre 80 et 9000 caractères.', 400, 'VALIDATION_ERROR');
    }
  } else {
    if (title.length > 100) {
      throw new AppError('Le titre optionnel ne peut dépasser 100 caractères.', 400, 'VALIDATION_ERROR');
    }
    if (content.length < 15 || content.length > 1200) {
      throw new AppError('Une confession doit contenir entre 15 et 1200 caractères.', 400, 'VALIDATION_ERROR');
    }
  }

  if (plotTwist.length > 600) {
    throw new AppError('Le bloc Plot Twist ne peut dépasser 600 caractères.', 400, 'VALIDATION_ERROR');
  }

  if (authorAlias.length > 36) {
    throw new AppError('Le pseudo ne peut dépasser 36 caractères.', 400, 'VALIDATION_ERROR');
  }

  const { flagged } = inspectSafety(`${title} ${content} ${plotTwist}`);

  return {
    type,
    title: title || null,
    content,
    plotTwist: plotTwist || null,
    pollQuestion: pollEnabled ? pollQuestion : null,
    pollOptionA: pollEnabled ? pollOptionA : null,
    pollOptionB: pollEnabled ? pollOptionB : null,
    authorAlias: authorAlias || null,
    tags,
    flagged,
  };
}

function validateAddPart(body) {
  const title = sanitizeText(body?.title);
  const content = sanitizeText(body?.content);
  const plotTwist = sanitizeText(body?.plotTwist);

  if (title.length > 120) {
    throw new AppError('Le titre de la suite ne peut dépasser 120 caractères.', 400, 'VALIDATION_ERROR');
  }
  if (content.length < 60 || content.length > 9000) {
    throw new AppError('Une suite doit contenir entre 60 et 9000 caractères.', 400, 'VALIDATION_ERROR');
  }

  const { flagged } = inspectSafety(`${title} ${content} ${plotTwist}`);
  return {
    title: title || null,
    content,
    plotTwist: plotTwist || null,
    flagged,
  };
}

function validateComment(body) {
  const content = sanitizeText(body?.content);
  const authorAlias = sanitizeText(body?.authorAlias);
  const parentId = body?.parentId ? sanitizeText(body.parentId) : null;

  if (content.length < 2 || content.length > 600) {
    throw new AppError('Le commentaire doit contenir entre 2 et 600 caractères.', 400, 'VALIDATION_ERROR');
  }
  if (authorAlias.length > 36) {
    throw new AppError('Le pseudo ne peut dépasser 36 caractères.', 400, 'VALIDATION_ERROR');
  }

  const { flagged } = inspectSafety(content);
  return { content, authorAlias: authorAlias || null, parentId, flagged };
}

function validatePollVote(body) {
  const choice = String(body?.choice || '').toUpperCase();
  if (choice !== 'A' && choice !== 'B') {
    throw new AppError('Choix de vote invalide ("A" ou "B").', 400, 'VALIDATION_ERROR');
  }
  return { choice };
}

function validateReaction(body) {
  const type = String(body?.type || '').toUpperCase();
  if (!VALID_REACTIONS.includes(type)) {
    throw new AppError(`Réaction invalide. Options : ${VALID_REACTIONS.join(', ')}`, 400, 'VALIDATION_ERROR');
  }
  return { type };
}

function validateReport(body) {
  const reason = sanitizeText(body?.reason);
  const details = sanitizeText(body?.details);
  if (!VALID_REPORT_REASONS.includes(reason)) {
    throw new AppError('Motif de signalement invalide.', 400, 'VALIDATION_ERROR');
  }
  if (details.length > 400) {
    throw new AppError('Les détails ne peuvent dépasser 400 caractères.', 400, 'VALIDATION_ERROR');
  }
  return { reason, details: details || null };
}

module.exports = {
  VALID_REACTIONS,
  SUGGESTED_TAGS,
  VALID_REPORT_REASONS,
  validateCreatePost,
  validateAddPart,
  validateComment,
  validatePollVote,
  validateReaction,
  validateReport,
};
