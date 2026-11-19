import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { api } from './api';
import PostCard from './components/PostCard';
import ComposerModal from './components/ComposerModal';
import ReaderModal from './components/ReaderModal';
import ReportModal from './components/ReportModal';
import AdminPanel from './components/AdminPanel';
import IntroOverlay from './components/IntroOverlay';
import AuthModal from './components/AuthModal';

const INTRO_SEEN_KEY = 'ya_gbairai_intro_seen_v3';

export default function App() {
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem(INTRO_SEEN_KEY));
  const [theme, setTheme] = useState(() => localStorage.getItem('ya_gbairai_theme') || 'dark');
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [tab, setTab] = useState('ALL');
  const [sort, setSort] = useState('trending');
  const [activeTag, setActiveTag] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
    suggestedTags: ['#Gbairai', '#HonteDeBabi', '#Karma', '#PlotTwist', '#Goumin', '#Taff'],
    reportReasons: [],
  });

  const [composerState, setComposerState] = useState({ open: false, type: 'CONFESSION', sequelSeries: null });
  const [readerPostId, setReaderPostId] = useState(null);
  const [reportPostId, setReportPostId] = useState(null);
  const [toasts, setToasts] = useState([]);

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
          limit: 10,
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
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setComposerState((s) => ({ ...s, open: false }));
        setReaderPostId(null);
        setReportPostId(null);
        setAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Subtle ambient cursor glow on desktop
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

  // GSAP Hero entrance choreography once intro curtain lifts
  useEffect(() => {
    if (showIntro || tab === 'ADMIN' || !heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-anim',
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.75, stagger: 0.09, ease: 'power3.out' }
      );
    }, heroRef);
    return () => ctx.revert();
  }, [showIntro, tab]);

  // GSAP staggered feed cards entrance
  useEffect(() => {
    if (loading || !feedRef.current) return;
    const cards = feedRef.current.querySelectorAll('.post-card');
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 30, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' }
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

  return (
    <>
      <IntroOverlay visible={showIntro} onFinish={handleIntroFinish} />

      <div ref={cursorGlowRef} className="cursor-glow" aria-hidden="true" />

      <div className="ambient-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

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
              <span className="dot dot-all" /> Tout le mouvement
            </button>
            <button className={`nav-pill ${tab === 'CONFESSION' ? 'active' : ''}`} onClick={() => setTab('CONFESSION')}>
              <span className="dot dot-conf" /> Gbairai Drôles
            </button>
            <button className={`nav-pill ${tab === 'STORYTIME' ? 'active' : ''}`} onClick={() => setTab('STORYTIME')}>
              <span className="dot dot-story" /> Storytime
            </button>
            <button className={`nav-pill ${tab === 'ADMIN' ? 'active' : ''}`} onClick={() => setTab('ADMIN')}>
              🛡️ Modération
            </button>
          </nav>

          <div className="nav-actions">
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
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setAuthModalOpen(true)}
            >
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
                  Ici sur <strong>Y&apos;A GBAIRAI !</strong>, on dit la vérité sans montrer son visage. Tes gaffes, tes goumins et tes dossiers chauds se lisent en épisodes (Partie 1, Partie 2…). On te donne un blase anonyme en un clic !
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
            ) : posts.length === 0 ? (
              <div className="empty-hero-card">
                <div style={{ fontSize: '3.2rem', marginBottom: 10 }}>🔥</div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.35rem' }}>
                  Le maquis est encore calme ici !
                </h3>
                <p className="meta-subtle" style={{ marginBottom: 20, maxWidth: '46ch', marginInline: 'auto', fontSize: '0.92rem' }}>
                  Aucun faux bot ici : que du 100% réel ! Sois le premier à mettre le feu en versant ton premier gbairai anonyme ou ton Storytime.
                </p>
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
              </div>
            ) : (
              <>
                <div className="feed-grid" ref={feedRef}>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onReact={handleReact}
                      onOpen={setReaderPostId}
                      onTagClick={(slug) => setActiveTag(slug)}
                      onReport={setReportPostId}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>

                {hasMore && (
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
        <button className={`mobile-nav-btn ${tab === 'ADMIN' ? 'active' : ''}`} onClick={() => setTab('ADMIN')}>
          <span>🛡️</span>
          <span>Modération</span>
        </button>
      </nav>

      {/* Modals */}
      <ComposerModal
        open={composerState.open}
        defaultType={composerState.type}
        sequelSeries={composerState.sequelSeries}
        suggestedTags={meta.suggestedTags}
        onClose={() => setComposerState((s) => ({ ...s, open: false, sequelSeries: null }))}
        onSuccess={(created) => {
          loadMeta();
          loadFeed({ nextPage: 1 });
          if (composerState.sequelSeries && created?.id) {
            setReaderPostId(created.id);
          }
        }}
        onToast={showToast}
      />

      <ReaderModal
        postId={readerPostId}
        onClose={() => setReaderPostId(null)}
        onOpenPost={setReaderPostId}
        onReact={handleReact}
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
