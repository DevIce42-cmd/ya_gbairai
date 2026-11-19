import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ComposerModal({
  open,
  defaultType = 'CONFESSION',
  sequelSeries = null,
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
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('Verdict de la famille ?');
  const [pollOptionA, setPollOptionA] = useState('Tu gères 👏');
  const [pollOptionB, setPollOptionB] = useState('Tu as gâté 😅');
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
    setPollEnabled(false);
    setPollQuestion('Verdict de la famille ?');
    setPollOptionA('Tu gères 👏');
    setPollOptionB('Tu as gâté 😅');
    if (!sequelSeries) {
      api.getAlias().then(setAuthorAlias).catch(() => setAuthorAlias('GarbaFurtif225'));
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
      onToast('Impossible de générer un blase.', 'error');
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
        onToast(`Épisode ${part.partNumber} versé dans le mouvement ! 📖🔥`);
        onSuccess(part);
      } else {
        const allTags = [...selectedTags];
        if (customTag.trim()) allTags.push(customTag.trim());
        const res = await api.createPost({
          type,
          title: title.trim(),
          content: content.trim(),
          plotTwist: plotTwist.trim(),
          pollEnabled,
          pollQuestion: pollQuestion.trim(),
          pollOptionA: pollOptionA.trim(),
          pollOptionB: pollOptionB.trim(),
          authorAlias: authorAlias.trim(),
          tags: allTags,
        });
        if (res.flaggedForReview) {
          onToast('Ton dossier passe vite fait en vérif modération.', 'error');
        } else {
          onToast(type === 'STORYTIME' ? 'Ton Storytime est en feu ! 📖🔥' : 'Ton gbairai est sorti en scred ! 🎭🔥');
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
              ? `Balance l'Épisode ${sequelSeries.nextPart} !`
              : "Verse ton gbairai sur Y'A GBAIRAI !"}
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
                  <strong>Gbairai Drôle</strong>
                  <small>Court, pimenté, 100% en scred</small>
                </div>
              </button>
              <button
                type="button"
                className={`mode-card ${type === 'STORYTIME' ? 'active-story' : ''}`}
                onClick={() => setType('STORYTIME')}
              >
                <span style={{ fontSize: '1.5rem' }}>📖</span>
                <div>
                  <strong>Storytime (Épisodes)</strong>
                  <small>Long dossier + suites (Partie 2…)</small>
                </div>
              </button>
            </div>
          )}

          {!isSequel && (
            <div className="form-group">
              <label>Ton blase anonyme (personne ne te connaît)</label>
              <div className="alias-row">
                <input
                  value={authorAlias}
                  onChange={(e) => setAuthorAlias(e.target.value)}
                  maxLength={36}
                  placeholder="Ex: GarbaFurtif225"
                />
                <button type="button" className="btn btn-outline" onClick={rollAlias} title="Changer de blase">
                  🎲
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>
              {isStory ? 'Titre du Storytime (obligatoire)' : 'Petit titre (optionnel)'}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required={isStory}
              maxLength={120}
              placeholder={
                isStory
                  ? "Ex: Le jour où mon gbaka m'a déposé au mariage d'un inconnu…"
                  : 'Ex: La honte que j’ai prise devant mon boss…'
              }
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>{isStory ? 'Raconte tout le dossier (80 à 9000 car.)' : 'Verse ton gbairai (15 à 1200 car.)'}</label>
              <span className="meta-subtle">{content.length} / {maxLen}</span>
            </div>
            <textarea
              rows={isStory ? 8 : 5}
              maxLength={maxLen}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Parle vrai, sans citer de vrais numéros ni d'e-mails (bloqués automatiquement pour ta sécurité)…"
            />
          </div>

          <div className="form-group">
            <label>⚡ Le vrai Kpata / Plot Twist (optionnel — flouté jusqu’au clic)</label>
            <textarea
              rows={2}
              maxLength={600}
              value={plotTwist}
              onChange={(e) => setPlotTwist(e.target.value)}
              placeholder="Garde la chute finale cachée pour surprendre tout le monde…"
            />
          </div>

          {/* Optional Quick Poll */}
          {!isSequel && (
            <div className="form-group poll-composer">
              <label className="poll-check-label">
                <input
                  type="checkbox"
                  checked={pollEnabled}
                  onChange={(e) => setPollEnabled(e.target.checked)}
                />
                <span>📊 Activer un sondage rapide (« Qui a tort ? »)</span>
              </label>

              {pollEnabled && (
                <div className="poll-composer-fields">
                  <input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    maxLength={100}
                    placeholder="Question du sondage…"
                  />
                  <div className="mode-grid" style={{ marginBottom: 0 }}>
                    <input
                      value={pollOptionA}
                      onChange={(e) => setPollOptionA(e.target.value)}
                      maxLength={40}
                      placeholder="Option 1"
                    />
                    <input
                      value={pollOptionB}
                      onChange={(e) => setPollOptionB(e.target.value)}
                      maxLength={40}
                      placeholder="Option 2"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!isSequel && (
            <div className="form-group">
              <label>Tags du mouvement (jusqu’à 4)</label>
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
                placeholder="Ou écris ton propre tag (ex: #Yopougon, #Cocody, #Dja)…"
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="meta-subtle">🔒 100% en scred • Zéro compte • Zéro djê</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Laisser tomber</button>
              <button type="submit" disabled={submitting} className={`btn ${isStory ? 'btn-indigo' : 'btn-coral'}`}>
                {submitting ? 'Envoi en cours…' : isSequel ? 'Verser la suite' : 'Balancer le gbairai'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
