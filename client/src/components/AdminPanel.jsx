import React, { useEffect, useState } from 'react';
import { api, getSavedAdminKey, setSavedAdminKey } from '../api';
import { formatRelativeTime } from '../utils';

export default function AdminPanel({ onToast, onModerationChange }) {
  const [keyInput, setKeyInput] = useState(getSavedAdminKey());
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState('traffic'); // traffic | users | moderation
  const [data, setData] = useState({
    analytics: null,
    recentUsers: [],
    openReports: [],
    flaggedPosts: [],
    hiddenPostsCount: 0,
  });

  async function loadDashboard(keyToUse) {
    setLoading(true);
    try {
      const res = await api.getAdminDashboard(keyToUse);
      setData(res);
      setAuthed(true);
      setSavedAdminKey(keyToUse);
    } catch (err) {
      setAuthed(false);
      if (keyToUse) onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (getSavedAdminKey()) {
      loadDashboard(getSavedAdminKey());
    }
  }, []);

  async function handleResolve(reportId, action) {
    try {
      await api.resolveReport(reportId, action);
      onToast(action === 'hide_post' ? 'Publication masquée et signalement traité.' : 'Signalement classé.');
      await loadDashboard(getSavedAdminKey());
      onModerationChange?.();
    } catch (err) {
      onToast(err.message, 'error');
    }
  }

  async function handlePostStatus(postId, status) {
    try {
      await api.setPostStatus(postId, status);
      onToast(status === 'PUBLISHED' ? 'Publication approuvée.' : 'Publication masquée.');
      await loadDashboard(getSavedAdminKey());
      onModerationChange?.();
    } catch (err) {
      onToast(err.message, 'error');
    }
  }

  if (!authed) {
    return (
      <section className="admin-card" style={{ maxWidth: 480, margin: '28px auto' }}>
        <h2 style={{ marginTop: 0 }}>🛡️ Tableau de Bord Administrateur</h2>
        <p className="meta-subtle" style={{ marginBottom: 16 }}>
          Espace strictement réservé à l&apos;administrateur de <strong>Y&apos;A GBAIRAI !</strong> (statistiques de trafic, utilisateurs inscrits et modération).
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadDashboard(keyInput.trim());
          }}
        >
          <div className="form-group">
            <label>Clé Administrateur</label>
            <input
              type="password"
              required
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Entrez la clé ADMIN_KEY"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-indigo" style={{ width: '100%' }}>
            {loading ? 'Vérification…' : 'Déverrouiller le tableau de bord'}
          </button>
        </form>
      </section>
    );
  }

  const a = data.analytics || {
    onlineNow: 0,
    totalUsers: 0,
    newUsersToday: 0,
    uniqueVisitors24h: 0,
    uniqueVisitorsTotal: 0,
    totalVisits7d: 0,
    deviceBreakdown: { mobile: 0, desktop: 0 },
    contentStats: { confessions: 0, stories: 0, reactions: 0, comments: 0, views: 0 },
    dailyActivity: [],
  };

  const totalDevice = Math.max(1, a.deviceBreakdown.mobile + a.deviceBreakdown.desktop);
  const mobilePct = Math.round((a.deviceBreakdown.mobile / totalDevice) * 100);
  const desktopPct = 100 - mobilePct;
  const maxDailyVisits = Math.max(1, ...a.dailyActivity.map((d) => d.visits));

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>🛡️ Cockpit Administrateur — Y&apos;A GBAIRAI !</h2>
          <span className="meta-subtle">
            Accès privé • Trafic temps réel, membres inscrits &amp; modération
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => loadDashboard(getSavedAdminKey())}>
            ↻ Actualiser
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSavedAdminKey('');
              setAuthed(false);
              setKeyInput('');
            }}
          >
            Verrouiller
          </button>
        </div>
      </div>

      {/* Admin Sub-tabs */}
      <div className="sort-group" style={{ marginBottom: 20 }}>
        <button className={`sort-btn ${subTab === 'traffic' ? 'active' : ''}`} onClick={() => setSubTab('traffic')}>
          📊 Trafic &amp; Activité
        </button>
        <button className={`sort-btn ${subTab === 'users' ? 'active' : ''}`} onClick={() => setSubTab('users')}>
          👥 Utilisateurs ({a.totalUsers})
        </button>
        <button className={`sort-btn ${subTab === 'moderation' ? 'active' : ''}`} onClick={() => setSubTab('moderation')}>
          🚩 Modération ({data.openReports.length + data.flaggedPosts.length})
        </button>
      </div>

      {subTab === 'traffic' && (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="admin-card kpi-card">
              <span className="meta-subtle">🟢 En ligne (5 min)</span>
              <strong className="kpi-num text-coral">{a.onlineNow}</strong>
              <span className="meta-subtle">sessions actives</span>
            </div>
            <div className="admin-card kpi-card">
              <span className="meta-subtle">👥 Utilisateurs inscrits</span>
              <strong className="kpi-num text-indigo">{a.totalUsers}</strong>
              <span className="meta-subtle">+{a.newUsersToday} aujourd&apos;hui</span>
            </div>
            <div className="admin-card kpi-card">
              <span className="meta-subtle">👀 Visiteurs uniques (24h)</span>
              <strong className="kpi-num text-amber">{a.uniqueVisitors24h}</strong>
              <span className="meta-subtle">{a.uniqueVisitorsTotal} au total</span>
            </div>
            <div className="admin-card kpi-card">
              <span className="meta-subtle">📈 Visites (7 jours)</span>
              <strong className="kpi-num text-violet">{a.totalVisits7d}</strong>
              <span className="meta-subtle">{a.contentStats.views} vues de posts</span>
            </div>
          </div>

          {/* 7-Day Activity Chart */}
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>📊 Activité &amp; Trafic des 7 derniers jours</h3>
              <span className="meta-subtle">Barres Corail = Visites • Badges = Posts / Inscrits</span>
            </div>
            <div className="chart-bars">
              {a.dailyActivity.map((day) => {
                const heightPct = Math.max(8, Math.round((day.visits / maxDailyVisits) * 100));
                return (
                  <div key={day.date} className="chart-col">
                    <div className="chart-val">{day.visits}</div>
                    <div className="chart-track">
                      <div
                        className="chart-fill"
                        style={{ height: `${heightPct}%` }}
                        title={`${day.label} : ${day.visits} visites, ${day.posts} posts, ${day.newUsers} inscrits`}
                      />
                    </div>
                    <div className="chart-label">{day.label}</div>
                    <div className="chart-sub">
                      {day.posts}p • {day.newUsers}u
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device Breakdown + Content Totals */}
          <div className="feed-grid">
            <div className="admin-card">
              <h3 style={{ marginTop: 0 }}>📱 Appareils (7 jours)</h3>
              <div className="device-bar">
                <div className="device-mobile" style={{ width: `${mobilePct}%` }} />
                <div className="device-desktop" style={{ width: `${desktopPct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.86rem' }}>
                <span>📱 Mobile : <strong>{mobilePct}%</strong> ({a.deviceBreakdown.mobile})</span>
                <span>💻 Ordinateur : <strong>{desktopPct}%</strong> ({a.deviceBreakdown.desktop})</span>
              </div>
            </div>

            <div className="admin-card">
              <h3 style={{ marginTop: 0 }}>🔥 Activité Contenu</h3>
              <div className="stats-grid" style={{ marginTop: 8 }}>
                <div className="stat-box">
                  <span className="stat-val text-coral">{a.contentStats.confessions}</span>
                  <span className="stat-lbl">Gbairais</span>
                </div>
                <div className="stat-box">
                  <span className="stat-val text-indigo">{a.contentStats.stories}</span>
                  <span className="stat-lbl">Storytimes</span>
                </div>
                <div className="stat-box">
                  <span className="stat-val text-amber">{a.contentStats.reactions}</span>
                  <span className="stat-lbl">Réactions</span>
                </div>
                <div className="stat-box">
                  <span className="stat-val text-violet">{a.contentStats.comments}</span>
                  <span className="stat-lbl">Commentaires</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {subTab === 'users' && (
        <div className="admin-card" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>👥 Utilisateurs enregistrés ({data.recentUsers.length})</h3>
          {data.recentUsers.length === 0 ? (
            <p className="meta-subtle">Aucun utilisateur inscrit pour le moment.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pseudo</th>
                  <th>E-mail</th>
                  <th>Inscrit</th>
                  <th>Dernière activité</th>
                  <th>Posts / Avis</th>
                </tr>
              </thead>
              <tbody>
                {data.recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="avatar-circle" style={{ background: u.avatarColor || '#00A884', width: 26, height: 26, fontSize: '0.7rem' }}>
                          {u.username.slice(0, 2).toUpperCase()}
                        </span>
                        <strong>{u.username}</strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{formatRelativeTime(u.createdAt)}</td>
                    <td>{formatRelativeTime(u.lastSeenAt || u.lastLoginAt || u.createdAt)}</td>
                    <td>{u.postsCount} posts • {u.commentsCount} avis</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 'moderation' && (
        <>
          <h3>🚩 Signalements ouverts ({data.openReports.length})</h3>
          {data.openReports.length === 0 ? (
            <div className="admin-card">
              <p className="meta-subtle" style={{ margin: 0 }}>Aucun signalement en attente. Tout est calme !</p>
            </div>
          ) : (
            data.openReports.map((rep) => (
              <div key={rep.id} className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <strong>Motif : {rep.reason}</strong>
                  <span className="meta-subtle">{formatRelativeTime(rep.createdAt)}</span>
                </div>
                {rep.details && <p style={{ margin: '0 0 10px', fontSize: '0.88rem' }}>Détails : {rep.details}</p>}
                <div className="comment-card">
                  <div className="comment-meta">
                    <span><strong>{rep.post.authorAlias}</strong> ({rep.post.type})</span>
                    <span>Statut : {rep.post.status}</span>
                  </div>
                  {rep.post.title && <strong>{rep.post.title}</strong>}
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{rep.post.content}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-coral btn-sm" onClick={() => handleResolve(rep.id, 'hide_post')}>
                    Masquer la publication
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleResolve(rep.id, 'dismiss')}>
                    Ignorer le signalement
                  </button>
                </div>
              </div>
            ))
          )}

          {data.flaggedPosts.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>⚠️ Interceptés par le filtre automatique ({data.flaggedPosts.length})</h3>
              {data.flaggedPosts.map((post) => (
                <div key={post.id} className="admin-card">
                  <div className="comment-meta">
                    <strong>{post.authorAlias} ({post.type})</strong>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                  </div>
                  {post.title && <p style={{ fontWeight: 700, margin: '6px 0' }}>{post.title}</p>}
                  <p style={{ margin: '6px 0 12px', fontSize: '0.92rem' }}>{post.content}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-indigo btn-sm" onClick={() => handlePostStatus(post.id, 'PUBLISHED')}>
                      Approuver &amp; Publier
                    </button>
                    <button className="btn btn-coral btn-sm" onClick={() => handlePostStatus(post.id, 'HIDDEN')}>
                      Masquer définitivement
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
