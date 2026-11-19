import React, { useState } from 'react';
import { api, setAuthToken } from '../api';

export default function AuthModal({ open, user, onClose, onAuthSuccess, onLogout, onToast }) {
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res =
        mode === 'register'
          ? await api.register({ username: username.trim(), email: email.trim(), password })
          : await api.login({ email: email.trim(), password });

      setAuthToken(res.token);
      onAuthSuccess(res.user);
      onToast(
        mode === 'register'
          ? `Akwaba ${res.user.username} ! Ton compte est prêt 🔥`
          : `Bon retour ${res.user.username} ! 🔥`
      );
      setPassword('');
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
          <h2>{user ? 'Mon Compte' : 'Rejoins le mouvement'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="modal-body">
          {user ? (
            <div>
              <div className="author-row" style={{ marginBottom: 14 }}>
                <span className="avatar-circle" style={{ background: user.avatarColor || '#FF6B5B', width: 42, height: 42, fontSize: '1rem' }}>
                  {user.username.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>{user.username}</strong>
                  <span className="meta-subtle">{user.email}</span>
                </div>
              </div>
              <p className="meta-subtle" style={{ marginBottom: 18 }}>
                🔒 Même connecté, tu peux continuer à verser tes gbairais sous un blase anonyme en scred à chaque post !
              </p>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%' }}
                onClick={() => {
                  setAuthToken('');
                  onLogout();
                  onClose();
                  onToast('Déconnecté proprement.');
                }}
              >
                Se déconnecter
              </button>
            </div>
          ) : (
            <>
              <div className="auth-switch">
                <button
                  type="button"
                  className={`auth-switch-btn ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  className={`auth-switch-btn ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => setMode('register')}
                >
                  Créer un compte
                </button>
              </div>

              <p className="meta-subtle" style={{ marginBottom: 14 }}>
                Crée ton compte pour garder tes dossiers et ajouter des épisodes à tes Storytimes depuis n&apos;importe quel appareil (tout en restant anonyme sur tes posts).
              </p>

              <form onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div className="form-group">
                    <label>Pseudo</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={24}
                      placeholder="Ex: BabiBoss225"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Adresse e-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="toi@exemple.com"
                  />
                </div>

                <div className="form-group">
                  <label>Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="6 caractères minimum"
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn btn-coral" style={{ width: '100%' }}>
                  {submitting
                    ? 'Patiente un peu…'
                    : mode === 'register'
                      ? 'Créer mon compte'
                      : 'Se connecter'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
