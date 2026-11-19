import React, { useState } from 'react';
import { REACTIONS, formatRelativeTime, formatReadingTime, getAvatarBg } from '../utils';

export default function PostCard({ post, onReact, onOpen, onTagClick, onReport, onDelete }) {
  const [twistRevealed, setTwistRevealed] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState(null);
  const isStory = post.type === 'STORYTIME';

  function handleEmojiClick(type, emoji) {
    const isAlreadyActive = (post.userReactions || []).includes(type);
    if (!isAlreadyActive) {
      setBurstEmoji({ type, emoji, key: Date.now() });
      setTimeout(() => setBurstEmoji(null), 650);
    }
    onReact(post.id, type);
  }

  return (
    <article className={`post-card ${post.type}`}>
      <div className="card-head">
        <div className="badges-row">
          <span className={`badge-type ${post.type}`}>
            {isStory ? '📖 Storytime' : '🎭 Gbairai Drôle'}
          </span>
          {isStory && post.partNumber && (
            <span className="badge-part">
              Épisode {post.partNumber}
              {post.seriesPartsCount > 1 ? ` / ${post.seriesPartsCount}` : ''}
            </span>
          )}
          {isStory && <span className="meta-subtle">⏱ {formatReadingTime(post.readingTimeSec)}</span>}
        </div>
        <div className="badges-row">
          <button className="btn btn-ghost btn-sm" onClick={() => onReport(post.id)} title="Signaler ce dossier">
            🚩
          </button>
          {post.canManage && (
            <button className="btn btn-ghost btn-sm" onClick={() => onDelete(post.id)} title="Effacer mon post">
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="author-row">
        <span className="avatar-circle" style={{ background: getAvatarBg(post.authorAlias) }}>
          {post.authorAlias.slice(0, 2).toUpperCase()}
        </span>
        <strong>{post.authorAlias}</strong>
        <span>•</span>
        <span>{formatRelativeTime(post.createdAt)}</span>
        <span>•</span>
        <span>👁 {post.viewsCount}</span>
      </div>

      {post.title && (
        <h3 className="card-title" onClick={() => onOpen(post.id)}>
          {post.title}
        </h3>
      )}

      <p className={`card-body ${isStory ? 'clamped' : ''}`}>{post.content}</p>

      {post.plotTwist && (
        <div
          className={`twist-box ${twistRevealed ? '' : 'blurred'}`}
          onClick={() => !twistRevealed && setTwistRevealed(true)}
        >
          <div className="twist-head">
            <span>⚡ Le vrai Kpata (Plot Twist)</span>
            <button
              type="button"
              className="twist-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setTwistRevealed((v) => !v);
              }}
            >
              {twistRevealed ? 'Cacher' : 'Voir le kpata'}
            </button>
          </div>
          <p className="twist-text">{post.plotTwist}</p>
        </div>
      )}

      {post.tags?.length > 0 && (
        <div className="card-tags">
          {post.tags.map((t) => (
            <button key={t.slug} className="mini-tag" onClick={() => onTagClick(t.slug)}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="card-foot">
        <div className="react-row" title="Une seule réaction possible par dossier">
          {REACTIONS.map((r) => {
            const active = (post.userReactions || []).includes(r.type);
            return (
              <button
                key={r.type}
                className={`react-pill ${active ? 'active' : ''}`}
                onClick={() => handleEmojiClick(r.type, r.emoji)}
                title={r.label}
              >
                {burstEmoji?.type === r.type && (
                  <span key={burstEmoji.key} className="emoji-burst">
                    {burstEmoji.emoji}
                  </span>
                )}
                <span>{r.emoji}</span>
                <span>{post.reactions?.[r.type] || 0}</span>
              </button>
            );
          })}
        </div>

        <button className="read-btn" onClick={() => onOpen(post.id)}>
          {isStory ? 'Lire tout le dossier' : 'Gbairai / Avis'} ({post.commentsCount || 0})
        </button>
      </div>
    </article>
  );
}
