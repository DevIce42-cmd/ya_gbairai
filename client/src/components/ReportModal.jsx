import React, { useState } from 'react';
import { api } from '../api';

export default function ReportModal({ postId, reasons = [], onClose, onToast }) {
  const [reason, setReason] = useState(reasons[0] || 'Contenu choquant / inapproprié');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!postId) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.reportPost(postId, { reason, details: details.trim() });
      onToast('Signalement envoyé à la modération. Merci !');
      setDetails('');
      onClose();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-sm">
        <div className="modal-header">
          <h2>Signaler une publication</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Motif</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Précisions (optionnel)</label>
            <textarea
              rows={3}
              maxLength={400}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Donnez un bref contexte à l'équipe de modération…"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={submitting} className="btn btn-coral">
              {submitting ? 'Envoi…' : 'Signaler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
