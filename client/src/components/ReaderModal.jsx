import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { REACTIONS, formatRelativeTime, formatReadingTime, getAvatarBg } from '../utils';

export default function ReaderModal({
  postId,
  onClose,
  onOpenPost,
  onReact,
  onOpenSequel,
  onReport,
  onToast,
  onCommentAdded,
}) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [twistOpen, setTwistOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAlias, setCommentAlias] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    setTwistOpen(false);
    setProgress(0);
    api
      .getPost(postId)
      .then((data) => {
        setPost(data);
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
      })
      .catch((err) => {
        onToast(err.message, 'error');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [postId]);

  if (!postId) return null;

  function handleScroll(e) {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 100);
  }

  async function handleReactClick(type) {
    const updated = await onReact(post.id, type);
    if (updated) {
      setPost((prev) =>
        prev
          ? {
              ...prev,
              reactions: updated.reactions,
              reactionsCount: updated.reactionsCount,
              userReactions: updated.userReactions,
            }
          : prev
      );
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.addComment(post.id, {
        content: commentText.trim(),
        authorAlias: commentAlias.trim(),
      });
      setPost((prev) => ({
        ...prev,
        commentsCount: res.commentsCount,
        comments: [...(prev.comments || []), res.comment],
      }));
      setCommentText('');
      onToast('Commentaire publié 💬');
      onCommentAdded?.();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSendingComment(false);
    }
  }

  const isStory = post?.type === 'STORYTIME';

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-reader">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="modal-header">
          <div className="badges-row">
            {post ? (
              <>
                <span className={`badge-type ${post.type}`}>
                  {isStory ? '📖 Storytime' : '🎭 Confession'}
                </span>
                {isStory && post.partNumber && (
                  <span className="badge-part">Partie {post.partNumber}</span>
                )}
                <span className="meta-subtle">
                  ⏱ {formatReadingTime(post.readingTimeSec)} • 👁 {post.viewsCount} vues
                </span>
              </>
            ) : (
              <span className="meta-subtle">Chargement…</span>
            )}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="modal-body" ref={bodyRef} onScroll={handleScroll}>
          {loading || !post ? (
            <div className="skeleton" />
          ) : (
            <>
              {/* Suites / Épisodes Storytime */}
              {isStory && post.seriesId && (
                <div className="series-bar">
                  <div>
                    <div className="meta-subtle" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📚 Série Storytime
                    </div>
                    <div className="series-parts" style={{ marginTop: 6 }}>
                      {(post.seriesParts || []).map((part) => (
                        <button
                          key={part.id}
                          className={`part-btn ${part.id === post.id ? 'active' : ''}`}
                          onClick={() => part.id !== post.id && onOpenPost(part.id)}
                        >
                          Partie {part.partNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                  {post.canManage && (
                    <button
                      className="btn btn-indigo btn-sm"
                      onClick={() =>
                        onOpenSequel({
                          id: post.seriesId,
                          title: post.seriesTitle || post.title,
                          nextPart: (post.seriesParts?.length || 1) + 1,
                        })
                      }
                    >
                      + Ajouter Partie {(post.seriesParts?.length || 1) + 1}
                    </button>
                  )}
                </div>
              )}

              <div className="author-row">
                <span className="avatar-circle" style={{ background: getAvatarBg(post.authorAlias) }}>
                  {post.authorAlias.slice(0, 2).toUpperCase()}
                </span>
                <strong>{post.authorAlias}</strong>
                <span>•</span>
                <span>{formatRelativeTime(post.createdAt)}</span>
              </div>

              {post.title && <h2 className="reader-title">{post.title}</h2>}

              <div className="reader-content">{post.content}</div>

              {post.plotTwist && (
                <div
                  className={`twist-box ${twistOpen ? '' : 'blurred'}`}
                  onClick={() => !twistOpen && setTwistOpen(true)}
                >
                  <div className="twist-head">
                    <span>⚡ Plot Twist / Chute secrète</span>
                    <button
                      type="button"
                      className="twist-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTwistOpen((v) => !v);
                      }}
                    >
                      {twistOpen ? 'Masquer' : 'Révéler'}
                    </button>
                  </div>
                  <p className="twist-text">{post.plotTwist}</p>
                </div>
              )}

              <div className={`card-foot ${post.type}`}>
                <div className="react-row">
                  {REACTIONS.map((r) => {
                    const active = (post.userReactions || []).includes(r.type);
                    return (
                      <button
                        key={r.type}
                        className={`react-pill ${active ? 'active' : ''}`}
                        onClick={() => handleReactClick(r.type)}
                      >
                        <span>{r.emoji}</span>
                        <span>{post.reactions?.[r.type] || 0}</span>
                      </button>
                    );
                  })}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => onReport(post.id)}>
                  🚩 Signaler
                </button>
              </div>

              {/* Commentaires */}
              <section className="comments-wrap">
                <h3 style={{ marginTop: 0 }}>💬 Commentaires ({post.comments?.length || 0})</h3>

                <form onSubmit={handleCommentSubmit} style={{ marginBottom: 16 }}>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <input
                      value={commentAlias}
                      onChange={(e) => setCommentAlias(e.target.value)}
                      maxLength={36}
                      placeholder="Pseudo anonyme (optionnel — généré si vide)"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <textarea
                      rows={2}
                      required
                      maxLength={600}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Réagis au gbairai avec bienveillance…"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={sendingComment} className="btn btn-indigo btn-sm">
                      {sendingComment ? 'Envoi…' : 'Commenter'}
                    </button>
                  </div>
                </form>

                {post.comments?.length ? (
                  post.comments.map((c) => (
                    <div key={c.id} className="comment-card">
                      <div className="comment-meta">
                        <strong>{c.authorAlias}</strong>
                        <span>{formatRelativeTime(c.createdAt)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.92rem', whiteSpace: 'pre-line' }}>{c.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="meta-subtle">Aucun commentaire pour l’instant. Lance la discussion !</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
