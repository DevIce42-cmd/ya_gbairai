import React, { useRef, useState } from 'react';
import { REACTIONS, formatRelativeTime, formatReadingTime, getAvatarBg } from '../utils';

export default function PostCard({
  post,
  isSaved,
  onToggleSave,
  onReact,
  onVotePoll,
  onOpen,
  onTagClick,
  onCopyLink,
  onShareCard,
  onReport,
  onDelete,
}) {
  const [twistRevealed, setTwistRevealed] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState(null);
  const cardRef = useRef(null);
  const isStory = post.type === 'STORYTIME';

  function handlePointerMove(e) {
    if (e.pointerType !== 'mouse' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -4;
    const ry = ((x / rect.width) - 0.5) * 4;
    cardRef.current.style.setProperty('--mx', `${x}px`);
    cardRef.current.style.setProperty('--my', `${y}px`);
    cardRef.current.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
  }

  function handlePointerLeave() {
    if (!cardRef.current) return;
    cardRef.current.style.transform = '';
  }

  function handleEmojiClick(type, emoji) {
    const isAlreadyActive = (post.userReactions || []).includes(type);
    if (!isAlreadyActive) {
      setBurstEmoji({ type, emoji, key: Date.now() });
      setTimeout(() => setBurstEmoji(null), 650);
    }
    onReact(post.id, type);
  }

  const poll = post.poll;
  const totalPoll = poll ? Math.max(0, poll.totalVotes || 0) : 0;
  const pctA = poll && totalPoll > 0 ? Math.round((poll.votesA / totalPoll) * 100) : 0;
  const pctB = poll && totalPoll > 0 ? 100 - pctA : 0;

  return (
    <article
      ref={cardRef}
      className={`post-card ${post.type}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="card-spotlight" aria-hidden="true" />

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
          <button
            className={`btn btn-ghost btn-sm ${isSaved ? 'text-amber' : ''}`}
            onClick={() => onToggleSave(post.id)}
            title={isSaved ? 'Retirer des favoris' : 'Garder en favori'}
          >
            {isSaved ? '★' : '☆'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onShareCard(post)} title="Carte Story 9:16 (WhatsApp/TikTok)">
            📸
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onCopyLink(post.id)} title="Copier le lien direct">
            🔗
          </button>
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

      {/* Quick Poll Widget */}
      {poll && (
        <div className="poll-box">
          <div className="poll-head">
            <span>📊 {poll.question}</span>
            <span className="meta-subtle">{totalPoll} vote{totalPoll > 1 ? 's' : ''}</span>
          </div>
          <div className="poll-options">
            <button
              type="button"
              className={`poll-opt ${poll.userChoice === 'A' ? 'selected' : ''}`}
              onClick={() => onVotePoll(post.id, 'A')}
            >
              <span className="poll-bar-fill fill-a" style={{ width: poll.userChoice ? `${pctA}%` : '0%' }} />
              <span className="poll-opt-text">{poll.optionA}</span>
              {poll.userChoice && <span className="poll-opt-pct">{pctA}%</span>}
            </button>
            <button
              type="button"
              className={`poll-opt ${poll.userChoice === 'B' ? 'selected' : ''}`}
              onClick={() => onVotePoll(post.id, 'B')}
            >
              <span className="poll-bar-fill fill-b" style={{ width: poll.userChoice ? `${pctB}%` : '0%' }} />
              <span className="poll-opt-text">{poll.optionB}</span>
              {poll.userChoice && <span className="poll-opt-pct">{pctB}%</span>}
            </button>
          </div>
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
