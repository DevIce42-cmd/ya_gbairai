import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { REACTIONS, formatRelativeTime, formatReadingTime, getAvatarBg } from '../utils';
import { shareOnWhatsApp } from '../utils/dailyPrompts';

export default function ReaderModal({
  postId,
  onClose,
  onOpenPost,
  onReact,
  onVotePoll,
  onCopyLink,
  onShareCard,
  onOpenSequel,
  onReport,
  onToast,
  onCommentAdded,
}) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [twistOpen, setTwistOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [commentText, setCommentText] = useState('');
  const [commentAlias, setCommentAlias] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, authorAlias }
  const [sendingComment, setSendingComment] = useState(false);
  const bodyRef = useRef(null);

  function stopAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  useEffect(() => {
    stopAudio();
    if (!postId) return;
    setLoading(true);
    setTwistOpen(false);
    setReplyTo(null);
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

    return () => stopAudio();
  }, [postId]);

  if (!postId) return null;

  function toggleAudio() {
    if (!('speechSynthesis' in window) || !post) {
      onToast('Lecture audio non supportée sur ce navigateur.', 'error');
      return;
    }
    if (speaking) {
      stopAudio();
      return;
    }
    window.speechSynthesis.cancel();
    const text = `${post.title ? post.title + '. ' : ''}${post.content}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 1.02;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }

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

  async function handlePollClick(choice) {
    const updatedPoll = await onVotePoll(post.id, choice);
    if (updatedPoll) {
      setPost((prev) => (prev ? { ...prev, poll: updatedPoll } : prev));
    }
  }

  async function handleLikeComment(commentId) {
    try {
      const res = await api.toggleCommentLike(commentId);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: (prev.comments || []).map((c) =>
                c.id === commentId ? { ...c, likesCount: res.likesCount, likedByMe: res.liked } : c
              ),
            }
          : prev
      );
    } catch (err) {
      onToast(err.message, 'error');
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
        parentId: replyTo?.id || null,
      });
      setPost((prev) => ({
        ...prev,
        commentsCount: res.commentsCount,
        comments: [...(prev.comments || []), res.comment],
      }));
      setCommentText('');
      setReplyTo(null);
      onToast('Ton avis est passé propre ! 💬');
      onCommentAdded?.();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSendingComment(false);
    }
  }

  const isStory = post?.type === 'STORYTIME';
  const topComments = (post?.comments || []).filter((c) => !c.parentId);
  const repliesByParent = new Map();
  (post?.comments || [])
    .filter((c) => c.parentId)
    .forEach((c) => {
      if (!repliesByParent.has(c.parentId)) repliesByParent.set(c.parentId, []);
      repliesByParent.get(c.parentId).push(c);
    });

  const poll = post?.poll;
  const totalPoll = poll ? Math.max(0, poll.totalVotes || 0) : 0;
  const pctA = poll && totalPoll > 0 ? Math.round((poll.votesA / totalPoll) * 100) : 0;
  const pctB = poll && totalPoll > 0 ? 100 - pctA : 0;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopAudio();
          onClose();
        }
      }}
    >
      <div className="modal-card modal-reader">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="modal-header">
          <div className="badges-row">
            {post ? (
              <>
                <span className={`badge-type ${post.type}`}>
                  {isStory ? '📖 Storytime' : '🎭 Gbairai Drôle'}
                </span>
                {isStory && post.partNumber && (
                  <span className="badge-part">Épisode {post.partNumber}</span>
                )}
                <span className="meta-subtle">
                  ⏱ {formatReadingTime(post.readingTimeSec)} • 👁 {post.viewsCount} vues
                </span>
              </>
            ) : (
              <span className="meta-subtle">Ça charge le dossier…</span>
            )}
          </div>
          <button
            className="btn-icon"
            onClick={() => {
              stopAudio();
              onClose();
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="modal-body" ref={bodyRef} onScroll={handleScroll}>
          {loading || !post ? (
            <div className="skeleton" />
          ) : (
            <>
              {/* Action toolbar: Audio TTS + Story Card + WhatsApp + Link + Font Size */}
              <div className="reader-toolbar">
                <button
                  type="button"
                  className={`btn btn-sm ${speaking ? 'btn-coral' : 'btn-outline'}`}
                  onClick={toggleAudio}
                >
                  {speaking ? '⏹ Arrêter audio' : '🎧 Écouter'}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => onShareCard(post)}>
                  📸 Carte Story 9:16
                </button>
                <button type="button" className="btn btn-whatsapp btn-sm" onClick={() => shareOnWhatsApp(post)}>
                  💬 WhatsApp
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => onCopyLink(post.id)}>
                  🔗 Lien
                </button>
                <div className="font-size-group">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setFontScale((s) => Math.max(0.85, Number((s - 0.1).toFixed(2))))}
                    title="Réduire le texte"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setFontScale((s) => Math.min(1.4, Number((s + 0.1).toFixed(2))))}
                    title="Agrandir le texte"
                  >
                    A+
                  </button>
                </div>
              </div>

              {isStory && post.seriesId && (
                <div className="series-bar">
                  <div>
                    <div className="meta-subtle" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📚 Tous les épisodes du dossier
                    </div>
                    <div className="series-parts" style={{ marginTop: 6 }}>
                      {(post.seriesParts || []).map((part) => (
                        <button
                          key={part.id}
                          className={`part-btn ${part.id === post.id ? 'active' : ''}`}
                          onClick={() => part.id !== post.id && onOpenPost(part.id)}
                        >
                          Épisode {part.partNumber}
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
                      + Ajouter Épisode {(post.seriesParts?.length || 1) + 1}
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

              <div className="reader-content" style={{ fontSize: `${(1.04 * fontScale).toFixed(2)}rem` }}>
                {post.content}
              </div>

              {post.plotTwist && (
                <div
                  className={`twist-box ${twistOpen ? '' : 'blurred'}`}
                  onClick={() => !twistOpen && setTwistOpen(true)}
                >
                  <div className="twist-head">
                    <span>⚡ Le vrai Kpata (Plot Twist)</span>
                    <button
                      type="button"
                      className="twist-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTwistOpen((v) => !v);
                      }}
                    >
                      {twistOpen ? 'Cacher' : 'Voir le kpata'}
                    </button>
                  </div>
                  <p className="twist-text">{post.plotTwist}</p>
                </div>
              )}

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
                      onClick={() => handlePollClick('A')}
                    >
                      <span className="poll-bar-fill fill-a" style={{ width: poll.userChoice ? `${pctA}%` : '0%' }} />
                      <span className="poll-opt-text">{poll.optionA}</span>
                      {poll.userChoice && <span className="poll-opt-pct">{pctA}%</span>}
                    </button>
                    <button
                      type="button"
                      className={`poll-opt ${poll.userChoice === 'B' ? 'selected' : ''}`}
                      onClick={() => handlePollClick('B')}
                    >
                      <span className="poll-bar-fill fill-b" style={{ width: poll.userChoice ? `${pctB}%` : '0%' }} />
                      <span className="poll-opt-text">{poll.optionB}</span>
                      {poll.userChoice && <span className="poll-opt-pct">{pctB}%</span>}
                    </button>
                  </div>
                </div>
              )}

              <div className={`card-foot ${post.type}`}>
                <div className="react-row" title="Une seule réaction possible à la fois">
                  {REACTIONS.map((r) => {
                    const active = (post.userReactions || []).includes(r.type);
                    return (
                      <button
                        key={r.type}
                        className={`react-pill ${active ? 'active' : ''}`}
                        onClick={() => handleReactClick(r.type)}
                        title={r.label}
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

              {/* Threaded Comments */}
              <section className="comments-wrap">
                <h3 style={{ marginTop: 0 }}>💬 Les avis de la famille ({post.comments?.length || 0})</h3>

                <form onSubmit={handleCommentSubmit} style={{ marginBottom: 16 }}>
                  {replyTo && (
                    <div className="reply-banner">
                      <span>↩ En réponse à <strong>{replyTo.authorAlias}</strong></span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplyTo(null)}>
                        ✕ Annuler
                      </button>
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <input
                      value={commentAlias}
                      onChange={(e) => setCommentAlias(e.target.value)}
                      maxLength={36}
                      placeholder="Ton blase (optionnel — généré si tu laisses vide)"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <textarea
                      rows={2}
                      required
                      maxLength={600}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={replyTo ? `Répondre à ${replyTo.authorAlias}…` : 'Dis ce que tu en penses proprement…'}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={sendingComment} className="btn btn-indigo btn-sm">
                      {sendingComment ? 'Envoi…' : replyTo ? 'Envoyer la réponse' : 'Laisser mon avis'}
                    </button>
                  </div>
                </form>

                {topComments.length ? (
                  topComments.map((c) => {
                    const replies = repliesByParent.get(c.id) || [];
                    return (
                      <div key={c.id} className="comment-thread">
                        <div className="comment-card">
                          <div className="comment-meta">
                            <strong>{c.authorAlias}</strong>
                            <span>{formatRelativeTime(c.createdAt)}</span>
                          </div>
                          <p style={{ margin: '0 0 8px', fontSize: '0.92rem', whiteSpace: 'pre-line' }}>{c.content}</p>
                          <div className="comment-actions">
                            <button
                              type="button"
                              className={`comment-action-btn ${c.likedByMe ? 'liked' : ''}`}
                              onClick={() => handleLikeComment(c.id)}
                            >
                              {c.likedByMe ? '❤️' : '🤍'} {c.likesCount || 0}
                            </button>
                            <button
                              type="button"
                              className="comment-action-btn"
                              onClick={() => setReplyTo({ id: c.id, authorAlias: c.authorAlias })}
                            >
                              ↩ Répondre
                            </button>
                          </div>
                        </div>

                        {replies.length > 0 && (
                          <div className="comment-replies">
                            {replies.map((rep) => (
                              <div key={rep.id} className="comment-card reply-card">
                                <div className="comment-meta">
                                  <strong>{rep.authorAlias}</strong>
                                  <span>{formatRelativeTime(rep.createdAt)}</span>
                                </div>
                                <p style={{ margin: '0 0 8px', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{rep.content}</p>
                                <div className="comment-actions">
                                  <button
                                    type="button"
                                    className={`comment-action-btn ${rep.likedByMe ? 'liked' : ''}`}
                                    onClick={() => handleLikeComment(rep.id)}
                                  >
                                    {rep.likedByMe ? '❤️' : '🤍'} {rep.likesCount || 0}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="meta-subtle">Personne n&apos;a encore parlé ici. Sois le premier à donner ton avis !</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
