const crypto = require('node:crypto');

const IVORIAN_NOUNS = [
  'Garba',
  'Alloco',
  'Gbaka',
  'Attiéké',
  'WôrôWôrô',
  'Babi',
  'Maquis',
  'Choukouya',
  'Kédjénou',
  'Gombo',
  'Tantie',
  'Tonton',
  'Renard',
  'Pigeon',
  'Fantôme',
  'Ninja',
  'Corbeau',
  'Panthère',
];

const IVORIAN_ADJECTIVES = [
  'Furtif',
  'Masqué',
  'Turbo',
  'Malin',
  'Nocturne',
  'Bavard',
  'Suspect',
  'Discret',
  'Légendaire',
  'Pimenté',
  'Chaud',
  'Tactique',
  'Curieux',
  'Cosmique',
  'Rebelle',
  'Dramatique',
];

function generateFunnyAlias() {
  const first = IVORIAN_NOUNS[Math.floor(Math.random() * IVORIAN_NOUNS.length)];
  const second = IVORIAN_ADJECTIVES[Math.floor(Math.random() * IVORIAN_ADJECTIVES.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${first}${second}${num}`;
}

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function estimateReadingTimeSec(text = '') {
  const words = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(15, Math.round((words / 210) * 60));
}

function computeHotScore({ reactionsCount = 0, commentsCount = 0, createdAt }) {
  const createdMs = createdAt ? new Date(createdAt).getTime() : Date.now();
  const ageHours = Math.max(0, (Date.now() - createdMs) / 3_600_000);
  const score = (reactionsCount * 2 + commentsCount * 3 + 1) / Math.pow(ageHours + 2, 1.4);
  return Number(score.toFixed(6));
}

function normalizeTag(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .slice(0, 24);
  if (cleaned.length < 2) return null;
  const slug = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return {
    name: `#${cleaned}`,
    slug,
  };
}

module.exports = {
  generateFunnyAlias,
  hashToken,
  estimateReadingTimeSec,
  computeHotScore,
  normalizeTag,
};
