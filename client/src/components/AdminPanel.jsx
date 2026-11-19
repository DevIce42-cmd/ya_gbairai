import React, { useEffect, useState } from 'react';
import { api, getSavedAdminKey, setSavedAdminKey } from '../api';
import { formatRelativeTime } from '../utils';

export default function AdminPanel({ onToast, onModerationChange }) {
  const [keyInput, setKeyInput] = useState(getSavedAdminKey());
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ openReports: [], flaggedPosts: [], hiddenPostsCount: 0 });

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
      onToast(status === 'PUBLISHED' ? 'Publication approuvée et publiée.' : 'Publication masquée.');
      await loadDashboard(getSavedAdminKey());
      onModerationChange?.();
    } catch (err) {
      onToast(err.message, 'error');
    }
  }

  if (!authed) {
    return (
      <section className="admin-card" style={{ maxWidth: 480, margin: '24px auto' }}>
        <h2 style={{ marginTop: 0 }}>🛡️ Espace Modération — Y'A GBAIRAI !</h2>
        <p className="meta-subtle" style={{ marginBottom: 16 }}>
          Entrez votre clé d’administration pour consulter et traiter les publications signalées ou filtrées.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadDashboard(keyInput.trim());
          }}
        >
          <div className="form-group">
            <label>Clé de modération</label>
            <input
              type="password"
              required
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Clé ADMIN_KEY du serveur"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-indigo">
            {loading ? 'Vérification…' : 'Accéder à la modération'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>🛡️ Tableau de Modération</h2>
          <span className="meta-subtle">
            {data.openReports.length} signalement(s) ouvert(s) • {data.flaggedPosts.length} en attente • {data.hiddenPostsCount} masqué(s)
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => loadDashboard(getSavedAdminKey())}>
            ↻ Rafraîchir
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSavedAdminKey('');
              setAuthed(false);
              setKeyInput('');
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      <h3>🚩 Signalements ouverts</h3>
      {data.openReports.length === 0 ? (
        <div className="admin-card">
          <p className="meta-subtle" style={{ margin: 0 }}>Aucun signalement en attente. Tout est calme ce soir !</p>
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
                <span>
                  <strong>{rep.post.authorAlias}</strong> ({rep.post.type})
                </span>
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
          <h3 style={{ marginTop: 24 }}>⚠️ Publications interceptées par le filtre automatique</h3>
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
    </section>
  );
}
