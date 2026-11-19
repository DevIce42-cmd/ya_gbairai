import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import PostCard from './components/PostCard';
import ComposerModal from './components/ComposerModal';
import ReaderModal from './components/ReaderModal';
import ReportModal from './components/ReportModal';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('ya_gbairai_theme') || 'dark');
  const [tab, setTab] = useState('ALL'); // ALL | CONFESSION | STORYTIME | ADMIN
  const [sort, setSort] = useState('trending'); // trending | recent | random
  const [activeTag, setActiveTag] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const [meta, setMeta] = useState({
    stats: { confessions: 0, stories: 0, reactions: 0, comments: 0, views: 0 },
    popularTags: [],
    suggestedTags: ['#Gênant', '#Karma', '#PlotTwist', '#VieQuotidienne'],
    reportReasons: [],
  });

  const [composerState, setComposerState] = useState({ open: false, type: 'CONFESSION', sequelSeries: null });
  const [readerPostId, setReaderPostId] = useState(null);
  const [reportPostId, setReportPostId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Theme sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ya_gbairai_theme', theme);
  }, [theme]);

  // Search debounce
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
  }, [loadMeta]);

  useEffect(() => {
    loadFeed({ nextPage: 1, append: false });
  }, [loadFeed]);

  // Escape closes modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setComposerState((s) => ({ ...s, open: false }));
        setReaderPostId(null);
        setReportPostId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    if (!window.confirm('Supprimer définitivement cette publication ?')) return;
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('Publication supprimée.');
      loadMeta();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <>
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
              <span className="brand-sub">Confessions &amp; Storytimes</span>
            </span>
          </button>

          <nav className="nav-pills" aria-label="Navigation principale">
            <button className={`nav-pill ${tab === 'ALL' ? 'active' : ''}`} onClick={() => setTab('ALL')}>
              <span className="dot dot-all" /> Tout
            </button>
            <button className={`nav-pill ${tab === 'CONFESSION' ? 'active' : ''}`} onClick={() => setTab('CONFESSION')}>
              <span className="dot dot-conf" /> Confessions
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
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Basculer Dark / Light Mode"
              aria-label="Changer de thème"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              className="btn btn-coral btn-sm"
              onClick={() => setComposerState({ open: true, type: tab === 'STORYTIME' ? 'STORYTIME' : 'CONFESSION', sequelSeries: null })}
            >
              + Publier
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
            <section className="hero">
              <div>
                <div className="hero-eyebrow">
                  <span className="live-dot" />
                  <span>Confidences tard le soir • 100% Anonyme • Zéro compte requis</span>
                </div>
                <h1>
                  Balance ta <span className="text-coral">confession drôle</span> ou raconte ton meilleur{' '}
                  <span className="text-indigo">Storytime</span>.
                </h1>
                <p className="hero-desc">
                  Sur <strong>Y&apos;A GBAIRAI !</strong>, les gaffes deviennent des légendes et les histoires vraies se lisent en épisodes (Partie 1, Partie 2…). Pseudo anonyme généré en un clic.
                </p>
                <div className="hero-cta">
                  <button
                    className="btn btn-coral btn-lg"
                    onClick={() => setComposerState({ open: true, type: 'CONFESSION', sequelSeries: null })}
                  >
                    🎭 Confesser un secret
                  </button>
                  <button
                    className="btn btn-indigo btn-lg"
                    onClick={() => setComposerState({ open: true, type: 'STORYTIME', sequelSeries: null })}
                  >
                    📖 Lancer un Storytime
                  </button>
                </div>
              </div>

              <div className="stats-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.86rem' }}>En direct ce soir</strong>
                  <span className="badge-type CONFESSION">LIVE</span>
                </div>
                <div className="stats-grid">
                  <div className="stat-box">
                    <span className="stat-val text-coral">{meta.stats.confessions}</span>
                    <span className="stat-lbl">Confessions</span>
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
                    <span className="stat-lbl">Commentaires</span>
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
                  placeholder="Rechercher un gbairai, un plot twist, un pseudo…"
                />
              </div>

              <div className="sort-group">
                <button className={`sort-btn ${sort === 'trending' ? 'active' : ''}`} onClick={() => setSort('trending')}>
                  🔥 Tendances
                </button>
                <button className={`sort-btn ${sort === 'recent' ? 'active' : ''}`} onClick={() => setSort('recent')}>
                  ⚡ Récents
                </button>
                <button
                  className={`sort-btn ${sort === 'random' ? 'active' : ''}`}
                  onClick={() => {
                    if (sort === 'random') loadFeed({ nextPage: 1 });
                    else setSort('random');
                  }}
                >
                  🎲 Aléatoire
                </button>
              </div>
            </section>

            {/* Tags Bar */}
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

            {/* Feed */}
            {loading ? (
              <div className="feed-grid">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="skeleton" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="admin-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
                <div style={{ fontSize: '2.6rem', marginBottom: 8 }}>🫣</div>
                <h3 style={{ margin: '0 0 8px' }}>Aucun gbairai trouvé ici</h3>
                <p className="meta-subtle" style={{ marginBottom: 16 }}>
                  Changez de filtre ou soyez le premier à lancer l&apos;ambiance !
                </p>
                <button
                  className="btn btn-coral"
                  onClick={() => setComposerState({ open: true, type: 'CONFESSION', sequelSeries: null })}
                >
                  Publier maintenant
                </button>
              </div>
            ) : (
              <>
                <div className="feed-grid">
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
                      Charger plus de gbairais
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
          <span>Confessions</span>
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
