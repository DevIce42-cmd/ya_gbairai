import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { formatRelativeTime, getAvatarBg } from '../utils';

export default function RouletteModal({ open, onClose, onOpenPost, onToast }) {
  const [post, setPost] = useState(null);
  const [spinning, setSpinning] = useState(false);

  async function spin(excludeId = '') {
    setSpinning(true);
    try {
      const next = await api.getRandomPost('', excludeId);
      setTimeout(() => {
        setPost(next);
        setSpinning(false);
      }, 360);
    } catch (err) {
      setSpinning(false);
      onToast(err.message, 'error');
      if (!post) onClose();
    }
  }

  useEffect(() => {
    if (open) spin();
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-lg">
        <div className="modal-header">
          <h2>🎲 Roulette Gbangban — Dossier au hasard</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div className={`roulette-card ${spinning ? 'spinning' : ''} ${post?.type || ''}`}>
            {!post || spinning ? (
              <div style={{ padding: '48px 16px' }}>
                <div style={{ fontSize: '3.2rem', marginBottom: 10 }}>🎲</div>
                <p className="meta-subtle">La roulette tourne pour toi…</p>
              </div>
            ) : (
              <div style={{ textAlign: 'left' }}>
                <div className="badges-row" style={{ marginBottom: 12 }}>
                  <span className={`badge-type ${post.type}`}>
                    {post.type === 'STORYTIME' ? '📖 Storytime' : '🎭 Gbairai Drôle'}
                  </span>
                  <span className="meta-subtle">{formatRelativeTime(post.createdAt)}</span>
                </div>

                <div className="author-row">
                  <span className="avatar-circle" style={{ background: getAvatarBg(post.authorAlias) }}>
                    {post.authorAlias.slice(0, 2).toUpperCase()}
                  </span>
                  <strong>{post.authorAlias}</strong>
                </div>

                {post.title && <h3 className="card-title">{post.title}</h3>}
                <p className="card-body clamped">{post.content}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-coral"
              disabled={spinning}
              onClick={() => spin(post?.id || '')}
            >
              🎲 Tirer un autre dossier
            </button>
            {post && !spinning && (
              <button
                type="button"
                className="btn btn-indigo"
                onClick={() => {
                  const id = post.id;
                  onClose();
                  onOpenPost(id);
                }}
              >
                📖 Ouvrir en grand
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
