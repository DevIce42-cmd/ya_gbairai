export const REACTIONS = [
  { type: 'LAUGH', emoji: '😂', label: 'MDR' },
  { type: 'SKULL', emoji: '💀', label: 'J’suis mort' },
  { type: 'MIND_BLOWN', emoji: '🤯', label: 'Choqué' },
  { type: 'FIRE', emoji: '🔥', label: 'Croustillant' },
];

export function formatRelativeTime(iso) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 45) return "À l'instant";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatReadingTime(sec = 30) {
  if (sec < 60) return `${sec} s`;
  return `${Math.max(1, Math.round(sec / 60))} min de lecture`;
}

export function getAvatarBg(alias = '') {
  const colors = ['#FF6B5B', '#FFB547', '#6366F1', '#A855F7', '#EC4899', '#14B8A6'];
  let h = 0;
  for (let i = 0; i < alias.length; i += 1) h = (h * 31 + alias.charCodeAt(i)) % 997;
  return colors[Math.abs(h) % colors.length];
}
