// 7 Défis du Soir en jargon ivoirien (rotation automatique par jour de la semaine)
const DAILY_PROMPTS = [
  {
    tag: '#Gbaka',
    badge: 'DÉFI DU DIMANCHE',
    question: "Raconte ta pire honte ou scène drôle dans un gbaka, wôrô-wôrô ou taxi !",
    hint: 'Ex: Le jour où j’ai oublié mon djê dans le gbaka…',
    type: 'CONFESSION',
  },
  {
    tag: '#Taff',
    badge: 'DÉFI DU LUNDI',
    question: "Quelle est la plus grosse gaffe que tu as faite au boulot ou en cours sans te faire attraper ?",
    hint: 'Ex: Le mail envoyé à la mauvaise personne…',
    type: 'CONFESSION',
  },
  {
    tag: '#Goumin',
    badge: 'DÉFI DU MARDI',
    question: "Raconte ton pire date ou un goumin qui te fait mourir de rire aujourd'hui !",
    hint: 'Ex: Premier rendez-vous au resto qui a tourné en film…',
    type: 'STORYTIME',
  },
  {
    tag: '#Famille',
    badge: 'DÉFI DU MERCREDI',
    question: "Quel est le plus gros mensonge que tu as sorti à tes parents (ou à ta tante) et qui a marché ?",
    hint: 'Ex: Comment j’ai caché une bêtise pendant 3 ans…',
    type: 'CONFESSION',
  },
  {
    tag: '#Karma',
    badge: 'DÉFI DU JEUDI',
    question: "La fois où le karma instantané a frappé en direct devant tes yeux !",
    hint: 'Ex: Il a voulu faire le malin et 2 secondes après…',
    type: 'STORYTIME',
  },
  {
    tag: '#Maquis',
    badge: 'DÉFI DU VENDREDI',
    question: "Ta soirée la plus imprévue ou légendaire à Babi ou ailleurs !",
    hint: 'Ex: On devait juste sortir 1 heure et on a fini à…',
    type: 'STORYTIME',
  },
  {
    tag: '#HonteDeBabi',
    badge: 'DÉFI DU SAMEDI',
    question: "Avoue un secret drôle ou une habitude bizarre que personne ne soupçonne chez toi !",
    hint: 'Ex: Quand je suis seul chez moi je fais…',
    type: 'CONFESSION',
  },
];

export function getTodayPrompt() {
  const day = new Date().getDay(); // 0..6
  return DAILY_PROMPTS[day] || DAILY_PROMPTS[0];
}

export function shareOnWhatsApp(post) {
  const link = `${window.location.origin}/?post=${encodeURIComponent(post.id)}`;
  const snippet = (post.title || post.content || '').slice(0, 110).trim();
  const text = `🔥 Y'A GBAIRAI ! Regarde ce dossier de fou :\n« ${snippet}${snippet.length >= 110 ? '…' : ''} »\n\nLis la suite & réagis en scred ici 👇\n${link}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export function launchConfettiBurst() {
  const colors = ['#25D366', '#00A884', '#53EB8D', '#D9FDD3', '#128C7E'];
  const container = document.createElement('div');
  container.className = 'confetti-layer';
  document.body.appendChild(container);

  for (let i = 0; i < 36; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${45 + (Math.random() - 0.5) * 30}%`;
    piece.style.top = '45%';
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--dx', `${(Math.random() - 0.5) * 420}px`);
    piece.style.setProperty('--dy', `${-160 - Math.random() * 260}px`);
    piece.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 1200);
}
