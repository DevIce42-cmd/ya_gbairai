import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { api } from './api';
import { generateAndShareStoryCard } from './utils/storyCardGenerator';
import { getTodayPrompt, launchConfettiBurst } from './utils/dailyPrompts';
import PostCard from './components/PostCard';
import ComposerModal from './components/ComposerModal';
import ReaderModal from './components/ReaderModal';
import ReportModal from './components/ReportModal';
import AdminPanel from './components/AdminPanel';
import IntroOverlay from './components/IntroOverlay';
import AuthModal from './components/AuthModal';
import RouletteModal from './components/RouletteModal';
import FigmaStudioShowcase from './components/FigmaStudioShowcase';

const INTRO_SEEN_KEY = 'ya_gbairai_intro_seen_v3';
const SAVED_POSTS_KEY = 'ya_gbairai_saved_posts';
const ANDROID_APK_URL =
  'https://github.com/DevIce42-cmd/ya_gbairai/releases/latest/download/ya-gbairai-android.apk';
const IS_ANDROID_APP =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('YaGbairaiAndroid');

function getInitialPostFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('post') || null;
}

export default function App() {
  const initialSharedPost = getInitialPostFromUrl();
  const [showIntro, setShowIntro] = useState(
    () => !initialSharedPost && !sessionStorage.getItem(INTRO_SEEN_KEY)
  );
  const [theme, setTheme] = useState(() => localStorage.getItem('ya_gbairai_theme') || 'dark');
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  const [tab, setTab] = useState('ALL'); // ALL | CONFESSION | STORYTIME | SAVED | ADMIN
  const [sort, setSort] = useState('trending');
  const [activeTag, setActiveTag] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [savedIds, setSavedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const heroRef = useRef(null);
  const feedRef = useRef(null);
  const cursorGlowRef = useRef(null);

  const [meta, setMeta] = useState({
    stats: { confessions: 0, stories: 0, reactions: 0, comments: 0, views: 0 },
    popularTags: [],
    weeklyTopPost: null,
    suggestedTags: ['#Gbairai', '#HonteDeBabi', '#Karma', '#PlotTwist', '#Goumin', '#Taff'],
    reportReasons: [],
  });

  const [composerState, setComposerState] = useState({
    open: false,
    type: 'CONFESSION',
    initialTag: '',
    initialHint: '',
    sequelSeries: null,
  });
  const [readerPostId, setReaderPostId] = useState(initialSharedPost);
  const [reportPostId, setReportPostId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [scrollPct, setScrollPct] = useState(0);
  const [showBackTop, setShowBackTop] = useState(false);

  const todayPrompt = getTodayPrompt();

  const handleIntroFinish = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    setShowIntro(false);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // PWA beforeinstallprompt listener
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast("Y'A GBAIRAI ! installé sur ton écran d'accueil 📲🔥");
    }
    setInstallPrompt(null);
  }

  // Open / close reader + keep ?post=ID URL clean
  const openPost = useCallback((id) => {
    setReaderPostId(id);
    if (id) {
      const url = new URL(window.location.href);
      url.searchParams.set('post', id);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const closePost = useCallback(() => {
    setReaderPostId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('post')) {
      url.searchParams.delete('post');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  function toggleSave(postId) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        showToast('Retiré de tes favoris');
      } else {
        next.add(postId);
        showToast('Gardé dans tes favoris ⭐');
      }
      localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  async function handleCopyLink(postId) {
    const link = `${window.location.origin}/?post=${encodeURIComponent(postId)}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Lien direct copié ! Balance-le sur WhatsApp 🔗');
    } catch {
      showToast(link);
    }
  }

  async function handleShareCard(post) {
    try {
      showToast('Création de ta carte Story 9:16… 📸');
      const result = await generateAndShareStoryCard(post);
      showToast(
        result === 'shared'
          ? 'Carte Story partagée ! 🔥'
          : 'Carte Story 9:16 téléchargée ! Prête pour ton statut WhatsApp / TikTok 🔥'
      );
    } catch {
      showToast('Impossible de générer la carte image.', 'error');
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ya_gbairai_theme', theme);
  }, [theme]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  const loadMeta = useCallback(async () => {
    try {
      const m = await api.getMeta();
      setMeta(m);
    } catch {
      // ignore initial error
    }
  }, []);

  const loadFeed = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      if (tab === 'ADMIN') return;
      if (!append) setLoading(true);
      try {
        const res = await api.listPosts({
          type: tab === 'CONFESSION' || tab === 'STORYTIME' ? tab : '',
          tag: activeTag,
          search: debouncedSearch,
          sort,
          page: nextPage,
          limit: tab === 'SAVED' ? 36 : 10,
        });
        setPosts((prev) => (append ? [...prev, ...res.items] : res.items));
        setPage(nextPage);
        setHasMore(Boolean(res.pagination?.hasMore));
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [tab, activeTag, debouncedSearch, sort, showToast]
  );

  useEffect(() => {
    loadMeta();
    api.me().then(setUser).catch(() => setUser(null));
    api.trackVisit('/');
    const heartbeat = setInterval(() => api.trackVisit(`/${tab.toLowerCase()}`), 180_000);
    return () => clearInterval(heartbeat);
  }, [loadMeta]);

  useEffect(() => {
    if (tab !== 'ADMIN') {
      api.trackVisit(`/${tab.toLowerCase()}`);
    }
  }, [tab]);

  useEffect(() => {
    loadFeed({ nextPage: 1, append: false });
  }, [loadFeed]);

  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY || 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? Math.min(100, (top / max) * 100) : 0);
      setShowBackTop(top > 420);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setComposerState((s) => ({ ...s, open: false }));
        closePost();
        setReportPostId(null);
        setAuthModalOpen(false);
        setRouletteOpen(false);
      } else if (
        (e.key === 'n' || e.key === 'N') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
        !readerPostId &&
        !authModalOpen &&
        !rouletteOpen
      ) {
        setComposerState({ open: true, type: 'CONFESSION', initialTag: '', initialHint: '', sequelSeries: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePost, readerPostId, authModalOpen, rouletteOpen]);

  useEffect(() => {
    const onMove = (e) => {
      if (!cursorGlowRef.current || e.pointerType !== 'mouse') return;
      gsap.to(cursorGlowRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.55,
        ease: 'power2.out',
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    if (showIntro || tab === 'ADMIN' || !heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-anim',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    }, heroRef);
    return () => ctx.revert();
  }, [showIntro, tab]);

  useEffect(() => {
    if (loading || !feedRef.current) return;
    const cards = feedRef.current.querySelectorAll('.post-card');
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 28, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.055, ease: 'power3.out', clearProps: 'transform,opacity' }
    );
  }, [posts, loading, tab]);

  async function handleReact(postId, type) {
    try {
      const updated = await api.toggleReaction(postId, type);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactions: updated.reactions,
                reactionsCount: updated.reactionsCount,
                userReactions: updated.userReactions,
              }
            : p
        )
      );
      loadMeta();
      return updated;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    }
  }

  async function handleVotePoll(postId, choice) {
    try {
      const updatedPoll = await api.votePoll(postId, choice);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, poll: updatedPoll } : p))
      );
      showToast('Vote enregistré ! 📊');
      return updatedPoll;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    }
  }

  async function handleDelete(postId) {
    if (!window.confirm('Tu veux vraiment gazer ce post définitivement ?')) return;
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('Dossier effacé propre !');
      loadMeta();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const visiblePosts =
    tab === 'SAVED' ? posts.filter((p) => savedIds.has(p.id)) : posts;

  return (
    <>
      <IntroOverlay visible={showIntro} onFinish={handleIntroFinish} />

      <div ref={cursorGlowRef} className="cursor-glow" aria-hidden="true" />

      <div className="ambient-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Top Page Scroll Progress Bar */}
      <div className="page-scroll-bar" style={{ width: `${scrollPct}%` }} aria-hidden="true" />

      {/* Top Navigation */}
      <header className="navbar">
        <div className="container navbar-inner">
          <button
            className="brand"
            onClick={() => {
              setTab('ALL');
              setActiveTag('');
              setSearch('');
            }}
          >
            <span className="brand-badge">🔥</span>
            <span>
              <span className="brand-title">
                Y&apos;A <span className="accent">GBAIRAI !</span>
              </span>
              <span className="brand-sub">Les vrais dossiers de Babi</span>
            </span>
          </button>

          <nav className="nav-pills" aria-label="Navigation principale">
            <button className={`nav-pill ${tab === 'ALL' ? 'active' : ''}`} onClick={() => setTab('ALL')}>
              <span className="dot dot-all" /> Tout
            </button>
            <button className={`nav-pill ${tab === 'CONFESSION' ? 'active' : ''}`} onClick={() => setTab('CONFESSION')}>
              <span className="dot dot-conf" /> Gbairai
            </button>
            <button className={`nav-pill ${tab === 'STORYTIME' ? 'active' : ''}`} onClick={() => setTab('STORYTIME')}>
              <span className="dot dot-story" /> Storytime
            </button>
            <button className={`nav-pill ${tab === 'SAVED' ? 'active' : ''}`} onClick={() => setTab('SAVED')}>
              ⭐ Favoris ({savedIds.size})
            </button>
            <button className={`nav-pill ${tab === 'ADMIN' ? 'active' : ''}`} onClick={() => setTab('ADMIN')}>
              🛡️ Admin
            </button>
          </nav>

          <div className="nav-actions">
            {installPrompt && (
              <button className="btn btn-indigo btn-sm" onClick={handleInstallApp} title="Installer sur ton téléphone">
                📲 App
              </button>
            )}
            <button
              className="btn-icon"
              onClick={() => setRouletteOpen(true)}
              title="Roulette Gbangban (dossier au hasard)"
              aria-label="Roulette Gbangban"
            >
              🎲
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowIntro(true)}
              title="Rejouer l'animation d'entrée"
              aria-label="Rejouer l'intro"
            >
              ✨
            </button>
            <button
              className="btn-icon"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Changer de mode (Nuit / Jour)"
              aria-label="Changer de thème"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setAuthModalOpen(true)}>
              {user ? `👤 ${user.username}` : 'Connexion'}
            </button>
            <button
              className="btn btn-coral btn-sm"
              onClick={() => setComposerState({ open: true, type: tab === 'STORYTIME' ? 'STORYTIME' : 'CONFESSION', sequelSeries: null })}
            >
              + Verser
            </button>
          </div>
        </div>
      </header>

      {/* Live Community Vibe Marquee */}
      <div className="vibe-marquee" aria-hidden="true">
        <div className="vibe-track">
          <span>🔥 100% EN SCRED • ZÉRO DJÊ</span>
          <span>🎭 GBAIRAI DRÔLES SANS FILTRE</span>
          <span>📖 STORYTIMES EN ÉPISODES</span>
          <span>🎧 MODE AUDIO DANS LE GBAKA</span>
          <span>📸 CARTE STORY 9:16 WHATSAPP &amp; TIKTOK</span>
          <span>🤖 VRAIE APP ANDROID GRATUITE</span>
          <span>🔥 100% EN SCRED • ZÉRO DJÊ</span>
          <span>🎭 GBAIRAI DRÔLES SANS FILTRE</span>
          <span>📖 STORYTIMES EN ÉPISODES</span>
          <span>🎧 MODE AUDIO DANS LE GBAKA</span>
          <span>📸 CARTE STORY 9:16 WHATSAPP &amp; TIKTOK</span>
          <span>🤖 VRAIE APP ANDROID GRATUITE</span>
        </div>
      </div>

      <main className="container main-wrap">
        {tab === 'ADMIN' ? (
          <AdminPanel
            onToast={showToast}
            onModerationChange={() => {
              loadMeta();
              loadFeed({ nextPage: 1 });
            }}
          />
        ) : (
          <>
            {/* Hero */}
            <section className="hero" ref={heroRef}>
              <div>
                <div className="hero-eyebrow hero-anim">
                  <span className="live-dot" />
                  <span>Gbangban tard le soir • 100% En Scred • Zéro compte</span>
                </div>
                <h1 className="hero-anim">
                  Viens verser ton <span className="text-coral">gbairai drôle</span> ou raconte ton meilleur{' '}
                  <span className="text-indigo">Storytime</span>.
                </h1>
                <p className="hero-desc hero-anim">
                  Ici sur <strong>Y&apos;A GBAIRAI !</strong>, on dit la vérité sans montrer son visage. Tes gaffes, tes goumins et tes dossiers chauds se lisent en épisodes, s&apos;écoutent en audio et se partagent en Carte Story 9:16 !
                </p>
                <div className="hero-cta hero-anim">
                  <button
                    className="btn btn-coral btn-lg"
                    onClick={() => setComposerState({ open: true, type: 'CONFESSION', sequelSeries: null })}
                  >
                    🎭 Verser un gbairai
                  </button>
                  <button
                    className="btn btn-indigo btn-lg"
                    onClick={() => setComposerState({ open: true, type: 'STORYTIME', sequelSeries: null })}
                  >
                    📖 Lancer un Storytime
                  </button>
                  <button className="btn btn-outline btn-lg" onClick={() => setRouletteOpen(true)}>
                    🎲 Roulette
                  </button>
                  {!IS_ANDROID_APP && (
                    <a
                      className="btn btn-outline btn-lg"
                      href={ANDROID_APK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      🤖 App Android (.apk)
                    </a>
                  )}
                </div>
              </div>

              <div className="stats-panel hero-anim">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.86rem' }}>Le mouvement en direct</strong>
                  <span className="badge-type CONFESSION">EN FEU</span>
                </div>
                <div className="stats-grid">
                  <div className="stat-box">
                    <span className="stat-val text-coral">{meta.stats.confessions}</span>
                    <span className="stat-lbl">Gbairais</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val text-indigo">{meta.stats.stories}</span>
                    <span className="stat-lbl">Storytimes</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val text-amber">{meta.stats.reactions}</span>
                    <span className="stat-lbl">Réactions</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val text-violet">{meta.stats.comments}</span>
                    <span className="stat-lbl">Avis</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Figma Prototype 3D, Shaders & Keyframes Studio Section */}
            {tab === 'ALL' && (
              <FigmaStudioShowcase
                stats={meta.stats}
                onLaunchPrototype={() => setShowIntro(true)}
                onSelectUniverse={(targetTab) => {
                  setTab(targetTab);
                  window.scrollTo({ top: 360, behavior: 'smooth' });
                }}
                onOpenComposer={() =>
                  setComposerState({
                    open: true,
                    type: 'CONFESSION',
                    initialTag: '',
                    initialHint: '',
                    sequelSeries: null,
                  })
                }
              />
            )}

            {/* Daily Challenge Prompt ("Le Sujet Chaud du Jour") */}
            {tab !== 'SAVED' && (
              <section className="daily-prompt-card">
                <div className="daily-prompt-left">
                  <div className="badges-row" style={{ marginBottom: 6 }}>
                    <span className="daily-badge">🔥 {todayPrompt.badge}</span>
                    <span className="mini-tag">{todayPrompt.tag}</span>
                  </div>
                  <p className="daily-question">{todayPrompt.question}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-coral btn-sm"
                  onClick={() =>
                    setComposerState({
                      open: true,
                      type: todayPrompt.type,
                      initialTag: todayPrompt.tag,
                      initialHint: todayPrompt.hint,
                      sequelSeries: null,
                    })
                  }
                >
                  🎭 Répondre au défi
                </button>
              </section>
            )}

            {/* Weekly Top Crown Banner */}
            {meta.weeklyTopPost && tab !== 'SAVED' && (
              <section className="weekly-crown-card" onClick={() => openPost(meta.weeklyTopPost.id)}>
                <div className="weekly-crown-badge">🏆 LE GBAIRAI DE LA SEMAINE</div>
                <div className="weekly-crown-body">
                  <div>
                    <strong className="weekly-crown-title">
                      {meta.weeklyTopPost.title || meta.weeklyTopPost.content.slice(0, 90) + '…'}
                    </strong>
                    <span className="meta-subtle" style={{ display: 'block', marginTop: 4 }}>
                      Par {meta.weeklyTopPost.authorAlias} • 🔥 {meta.weeklyTopPost.reactionsCount} réactions • 💬 {meta.weeklyTopPost.commentsCount} avis • 👁 {meta.weeklyTopPost.viewsCount} vues
                    </span>
                  </div>
                  <button type="button" className="btn btn-coral btn-sm">
                    Lire le top dossier →
                  </button>
                </div>
              </section>
            )}

            {/* Controls */}
            <section className="controls-row">
              <div className="search-wrap">
                <span>🔍</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Fouiller un gbairai, un kpata, un blase…"
                />
              </div>

              <div className="sort-group">
                <button className={`sort-btn ${sort === 'trending' ? 'active' : ''}`} onClick={() => setSort('trending')}>
                  🔥 En feu
                </button>
                <button className={`sort-btn ${sort === 'recent' ? 'active' : ''}`} onClick={() => setSort('recent')}>
                  ⚡ Frais du jour
                </button>
                <button
                  className={`sort-btn ${sort === 'random' ? 'active' : ''}`}
                  onClick={() => {
                    if (sort === 'random') loadFeed({ nextPage: 1 });
                    else setSort('random');
                  }}
                >
                  🎲 Au hasard
                </button>
              </div>
            </section>

            {/* Tags Bar */}
            {meta.popularTags.length > 0 && (
              <div className="tags-bar">
                <button className={`tag-chip ${activeTag === '' ? 'active' : ''}`} onClick={() => setActiveTag('')}>
                  Tous les tags
                </button>
                {meta.popularTags.map((t) => (
                  <button
                    key={t.slug}
                    className={`tag-chip ${activeTag === t.slug ? 'active' : ''}`}
                    onClick={() => setActiveTag((cur) => (cur === t.slug ? '' : t.slug))}
                  >
                    {t.name} ({t.count})
                  </button>
                ))}
              </div>
            )}

            {/* Feed */}
            {loading ? (
              <div className="feed-grid">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="skeleton" />
                ))}
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="empty-hero-card">
                <div style={{ fontSize: '3.2rem', marginBottom: 10 }}>
                  {tab === 'SAVED' ? '⭐' : '🔥'}
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.35rem' }}>
                  {tab === 'SAVED' ? 'Aucun dossier sauvegardé' : 'Le maquis est encore calme ici !'}
                </h3>
                <p className="meta-subtle" style={{ marginBottom: 20, maxWidth: '46ch', marginInline: 'auto', fontSize: '0.92rem' }}>
                  {tab === 'SAVED'
                    ? 'Clique sur l’étoile ☆ d’un gbairai ou d’un Storytime pour le garder ici et suivre la suite.'
                    : 'Aucun faux bot ici : que du 100% réel ! Sois le premier à mettre le feu en versant ton premier gbairai anonyme ou ton Storytime.'}
                </p>
                {tab !== 'SAVED' && (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-coral"
                      onClick={() => setComposerState({ open: true, type: 'CONFESSION', sequelSeries: null })}
                    >
                      🎭 Verser le 1er gbairai
                    </button>
                    <button
                      className="btn btn-indigo"
                      onClick={() => setComposerState({ open: true, type: 'STORYTIME', sequelSeries: null })}
                    >
                      📖 Lancer le 1er Storytime
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="feed-grid" ref={feedRef}>
                  {visiblePosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      isSaved={savedIds.has(post.id)}
                      onToggleSave={toggleSave}
                      onReact={handleReact}
                      onVotePoll={handleVotePoll}
                      onOpen={openPost}
                      onTagClick={(slug) => setActiveTag(slug)}
                      onCopyLink={handleCopyLink}
                      onShareCard={handleShareCard}
                      onReport={setReportPostId}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>

                {hasMore && tab !== 'SAVED' && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
                    <button className="btn btn-outline" onClick={() => loadFeed({ nextPage: page + 1, append: true })}>
                      Voir plus de gbairais
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Branded Footer */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="brand-badge" style={{ width: 32, height: 32, fontSize: '0.95rem' }}>🔥</span>
            <div>
              <strong>Y&apos;A GBAIRAI !</strong>
              <span className="meta-subtle" style={{ display: 'block' }}>
                Confessions Anonymes Drôles &amp; Storytimes • 100% en scred
              </span>
            </div>
          </div>
          <div className="footer-links">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowIntro(true)}>✨ Rejouer l&apos;intro</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRouletteOpen(true)}>🎲 Roulette</button>
            {!IS_ANDROID_APP && (
              <a className="btn btn-outline btn-sm" href={ANDROID_APK_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                🤖 Télécharger .APK
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* Mobile Floating Quick-Publish FAB */}
      {tab !== 'ADMIN' && (
        <button
          type="button"
          className="mobile-fab"
          onClick={() =>
            setComposerState({
              open: true,
              type: tab === 'STORYTIME' ? 'STORYTIME' : 'CONFESSION',
              initialTag: '',
              initialHint: '',
              sequelSeries: null,
            })
          }
          aria-label="Publier un gbairai"
          title="Verser un gbairai (Raccourci: N)"
        >
          +
        </button>
      )}

      {/* Back to top */}
      {showBackTop && (
        <button
          type="button"
          className="back-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Remonter en haut"
          title="Remonter en haut"
        >
          ↑
        </button>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        <button className={`mobile-nav-btn ${tab === 'ALL' ? 'active' : ''}`} onClick={() => setTab('ALL')}>
          <span>🔥</span>
          <span>Tout</span>
        </button>
        <button className={`mobile-nav-btn ${tab === 'CONFESSION' ? 'active' : ''}`} onClick={() => setTab('CONFESSION')}>
          <span>🎭</span>
          <span>Gbairai</span>
        </button>
        <button className={`mobile-nav-btn ${tab === 'STORYTIME' ? 'active' : ''}`} onClick={() => setTab('STORYTIME')}>
          <span>📖</span>
          <span>Storytime</span>
        </button>
        <button className={`mobile-nav-btn ${tab === 'SAVED' ? 'active' : ''}`} onClick={() => setTab('SAVED')}>
          <span>⭐</span>
          <span>Favoris</span>
        </button>
        <button className={`mobile-nav-btn ${tab === 'ADMIN' ? 'active' : ''}`} onClick={() => setTab('ADMIN')}>
          <span>🛡️</span>
          <span>Admin</span>
        </button>
      </nav>

      {/* Modals */}
      <ComposerModal
        open={composerState.open}
        defaultType={composerState.type}
        initialTag={composerState.initialTag}
        initialHint={composerState.initialHint}
        sequelSeries={composerState.sequelSeries}
        suggestedTags={meta.suggestedTags}
        onClose={() =>
          setComposerState((s) => ({ ...s, open: false, initialTag: '', initialHint: '', sequelSeries: null }))
        }
        onSuccess={(created) => {
          launchConfettiBurst();
          loadMeta();
          loadFeed({ nextPage: 1 });
          if (composerState.sequelSeries && created?.id) {
            openPost(created.id);
          }
        }}
        onToast={showToast}
      />

      <ReaderModal
        postId={readerPostId}
        onClose={closePost}
        onOpenPost={openPost}
        onReact={handleReact}
        onVotePoll={handleVotePoll}
        onCopyLink={handleCopyLink}
        onShareCard={handleShareCard}
        onOpenSequel={(series) => {
          setComposerState({ open: true, type: 'STORYTIME', sequelSeries: series });
        }}
        onReport={setReportPostId}
        onToast={showToast}
        onCommentAdded={() => {
          loadMeta();
          loadFeed({ nextPage: 1 });
        }}
      />

      <RouletteModal
        open={rouletteOpen}
        onClose={() => setRouletteOpen(false)}
        onOpenPost={openPost}
        onToast={showToast}
      />

      <ReportModal
        postId={reportPostId}
        reasons={meta.reportReasons}
        onClose={() => setReportPostId(null)}
        onToast={showToast}
      />

      <AuthModal
        open={authModalOpen}
        user={user}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(u) => {
          setUser(u);
          loadFeed({ nextPage: 1 });
        }}
        onLogout={() => {
          setUser(null);
          loadFeed({ nextPage: 1 });
        }}
        onToast={showToast}
      />

      {/* Toasts */}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.type === 'error' ? 'error' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
