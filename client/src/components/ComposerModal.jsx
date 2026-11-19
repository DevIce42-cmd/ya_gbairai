import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ComposerModal({
  open,
  defaultType = 'CONFESSION',
  sequelSeries = null, // { id, title, nextPart }
  suggestedTags = [],
  onClose,
  onSuccess,
  onToast,
}) {
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [plotTwist, setPlotTwist] = useState('');
  const [authorAlias, setAuthorAlias] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSequel = Boolean(sequelSeries);
  const isStory = isSequel || type === 'STORYTIME';

  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    setTitle(sequelSeries ? `${sequelSeries.title} — Partie ${sequelSeries.nextPart}` : '');
    setContent('');
    setPlotTwist('');
    setSelectedTags([]);
    setCustomTag('');
    if (!sequelSeries) {
      api.getAlias().then(setAuthorAlias).catch(() => setAuthorAlias('RenardMasqué42'));
    }
  }, [open, defaultType, sequelSeries]);

  if (!open) return null;

  function toggleTag(tag) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 4) return prev;
      return [...prev, tag];
    });
  }

  async function rollAlias() {
    try {
      const alias = await api.getAlias();
      setAuthorAlias(alias);
    } catch {
      onToast('Impossible de générer un pseudo.', 'error');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSequel) {
        const part = await api.addPart(sequelSeries.id, {
          title: title.trim(),
          content: content.trim(),
          plotTwist: plotTwist.trim(),
        });
        onToast(`Partie ${part.partNumber} publiée avec succès ! 📖`);
        onSuccess(part);
      } else {
        const allTags = [...selectedTags];
        if (customTag.trim()) allTags.push(customTag.trim());
        const res = await api.createPost({
          type,
          title: title.trim(),
          content: content.trim(),
          plotTwist: plotTwist.trim(),
          authorAlias: authorAlias.trim(),
          tags: allTags,
        });
        if (res.flaggedForReview) {
          onToast('Publication envoyée en vérification modération.', 'error');
        } else {
          onToast(type === 'STORYTIME' ? 'Storytime publié ! 📖' : 'Confession balancée anonymement ! 🎭');
        }
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const maxLen = isStory ? 9000 : 1200;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-lg">
        <div className="modal-header">
          <h2>
            {isSequel
              ? `Ajouter la Partie ${sequelSeries.nextPart}`
              : "Balance ton gbairai sur Y'A GBAIRAI !"}
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {!isSequel && (
            <div className="mode-grid">
              <button
                type="button"
                className={`mode-card ${type === 'CONFESSION' ? 'active-conf' : ''}`}
                onClick={() => setType('CONFESSION')}
              >
                <span style={{ fontSize: '1.5rem' }}>🎭</span>
                <div>
                  <strong>Confession Drôle</strong>
                  <small>Courte, punchy, 100% anonyme</small>
                </div>
              </button>
              <button
                type="button"
                className={`mode-card ${type === 'STORYTIME' ? 'active-story' : ''}`}
                onClick={() => setType('STORYTIME')}
              >
                <span style={{ fontSize: '1.5rem' }}>📖</span>
                <div>
                  <strong>Storytime</strong>
                  <small>Récit immersif + suites (Partie 2…)</small>
                </div>
              </button>
            </div>
          )}

          {!isSequel && (
            <div className="form-group">
              <label>Pseudo anonyme</label>
              <div className="alias-row">
                <input
                  value={authorAlias}
                  onChange={(e) => setAuthorAlias(e.target.value)}
                  maxLength={36}
                  placeholder="Ex: RenardMasqué42"
                />
                <button type="button" className="btn btn-outline" onClick={rollAlias} title="Nouveau pseudo">
                  🎲
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>
              {isStory ? 'Titre du Storytime (obligatoire)' : 'Titre accrocheur (optionnel)'}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required={isStory}
              maxLength={120}
              placeholder={
                isStory
                  ? "Ex: Le jour où j'ai fini invité d'honneur par erreur…"
                  : 'Ex: Le micro resté allumé en visio…'
              }
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>{isStory ? 'Ton récit (80 à 9000 caractères)' : 'Ta confession (15 à 1200 caractères)'}</label>
              <span className="meta-subtle">{content.length} / {maxLen}</span>
            </div>
            <textarea
              rows={isStory ? 8 : 5}
              maxLength={maxLen}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Raconte sans filtres (les e-mails et numéros de téléphone sont bloqués automatiquement)…"
            />
          </div>

          <div className="form-group">
            <label>⚡ Plot Twist / Chute secrète (optionnel — flouté jusqu’au clic)</label>
            <textarea
              rows={2}
              maxLength={600}
              value={plotTwist}
              onChange={(e) => setPlotTwist(e.target.value)}
              placeholder="Ajoute un rebondissement final que les lecteurs révèleront en cliquant…"
            />
          </div>

          {!isSequel && (
            <div className="form-group">
              <label>Tags (jusqu’à 4)</label>
              <div className="tags-bar" style={{ marginBottom: 8 }}>
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                maxLength={24}
                placeholder="Ou ajoute un tag perso (ex: #Abidjan, #Transport)…"
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="meta-subtle">🔒 Zéro compte requis • Anti-XSS &amp; Anti-doxxing actifs</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button type="submit" disabled={submitting} className={`btn ${isStory ? 'btn-indigo' : 'btn-coral'}`}>
                {submitting ? 'Publication…' : isSequel ? 'Publier la suite' : 'Publier'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
