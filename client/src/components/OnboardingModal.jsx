import React, { useEffect, useState } from 'react';
import { api, setAuthToken } from '../api';
import { isSoundEnabled, playTapSound, setSoundEnabled } from '../utils/buttonFX';

const PERM_CONSENT_KEY = 'ya_gbairai_permissions_v1';

function detectInitialNotificationState() {
  if (typeof window === 'undefined') return 'prompt';
  if (window.YaGbairaiNative?.hasNotificationPermission) {
    try {
      return window.YaGbairaiNative.hasNotificationPermission() ? 'granted' : 'prompt';
    } catch {
      return 'prompt';
    }
  }
  if ('Notification' in window) {
    return window.Notification.permission || 'default';
  }
  return 'unsupported';
}

export default function OnboardingModal({
  open,
  user,
  onComplete,
  onAuthSuccess,
  onSoundChange,
  onToast,
}) {
  const [step, setStep] = useState(1); // 1 = Permissions Agreement, 2 = Register / Login
  const [notifStatus, setNotifStatus] = useState(detectInitialNotificationState);
  const [audioPerm, setAudioPerm] = useState(() => isSoundEnabled());
  const [storagePerm, setStoragePerm] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [authMode, setAuthMode] = useState('register'); // register | login
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    // Listen for Android runtime permission callback from MainActivity.kt
    window.__onAndroidPermissionsResult = (granted) => {
      setNotifStatus(granted ? 'granted' : 'denied');
    };
    return () => {
      delete window.__onAndroidPermissionsResult;
    };
  }, [open]);

  if (!open) return null;

  async function requestNotificationPermission() {
    if (window.YaGbairaiNative?.requestPermissions) {
      try {
        window.YaGbairaiNative.requestPermissions();
        return;
      } catch {
        // fallback below
      }
    }
    if (typeof window !== 'undefined' && 'Notification' in window && typeof window.Notification.requestPermission === 'function') {
      try {
        // Guard against Android WebViews where Notification.requestPermission() never resolves
        const result = await Promise.race([
          Promise.resolve(window.Notification.requestPermission()),
          new Promise((resolve) => setTimeout(() => resolve('timeout'), 1000)),
        ]);
        if (result !== 'timeout') {
          setNotifStatus(result);
          if (result === 'granted') {
            onToast('Notifications activées ! 🔔');
          }
        }
      } catch {
        setNotifStatus('unsupported');
      }
    }
  }

  function handleAcceptPermissions() {
    if (!termsAccepted) {
      setErrorMsg('Coche la charte 100% anonyme pour continuer.');
      return;
    }
    setErrorMsg('');

    // Persist audio & permission choices immediately
    setSoundEnabled(audioPerm);
    if (onSoundChange) onSoundChange(audioPerm);
    if (audioPerm) playTapSound('cta');

    // Trigger notification prompt in background — NEVER block advancing to Step 2!
    if (notifStatus === 'prompt' || notifStatus === 'default') {
      requestNotificationPermission();
    }

    try {
      localStorage.setItem(
        PERM_CONSENT_KEY,
        JSON.stringify({
          acceptedAt: new Date().toISOString(),
          notifications: notifStatus,
          storage: storagePerm,
          audio: audioPerm,
        })
      );
    } catch {
      // ignore storage errors
    }

    if (user) {
      onComplete();
      return;
    }
    setStep(2);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res =
        authMode === 'register'
          ? await api.register({ username: username.trim(), email: email.trim(), password })
          : await api.login({ email: email.trim(), password });

      setAuthToken(res.token);
      onAuthSuccess(res.user);
      onToast(
        authMode === 'register'
          ? `Akwaba ${res.user.username} ! Bienvenue dans Y'A GBAIRAI ! 🔥`
          : `Bon retour ${res.user.username} ! 🔥`
      );
      setPassword('');
      onComplete();
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors de la connexion.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop onboarding-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenue sur Y'A GBAIRAI !">
      <div className="modal-card onboarding-card">
        {/* Progress Steps Header */}
        <div className="onboarding-top">
          <div className="onboarding-brand">
            <img src="/icon-192.png" alt="Y'A GBAIRAI !" className="onboarding-app-icon" />
            <div>
              <span className="onboarding-step-pill">
                {step === 1 ? 'ÉTAPE 1 / 2 • PERMISSIONS' : 'ÉTAPE 2 / 2 • TON COMPTE'}
              </span>
              <h2>Bienvenue sur Y&apos;A GBAIRAI&nbsp;!</h2>
            </div>
          </div>

          <div className="onboarding-progress" aria-hidden="true">
            <span className={`onboarding-bar ${step >= 1 ? 'active' : ''}`} />
            <span className={`onboarding-bar ${step >= 2 ? 'active' : ''}`} />
          </div>
        </div>

        <div className="modal-body">
          {step === 1 ? (
            <div className="onboarding-step">
              <p className="onboarding-lead">
                Avant d&apos;entrer dans le mouvement, valide les autorisations pour profiter de l&apos;appli à 100 % en scred.
              </p>

              <div className="perm-list">
                {/* Permission 1: Notifications */}
                <div className="perm-row">
                  <div className="perm-icon">🔔</div>
                  <div className="perm-info">
                    <strong>Notifications &amp; Épisodes</strong>
                    <span>Alertes pour les nouveaux Storytimes et le défi du soir.</span>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${notifStatus === 'granted' ? 'btn-coral' : 'btn-outline'}`}
                    onClick={requestNotificationPermission}
                    disabled={notifStatus === 'granted'}
                  >
                    {notifStatus === 'granted' ? 'Autorisé ✓' : 'Autoriser'}
                  </button>
                </div>

                {/* Permission 2: Storage & Share */}
                <div className="perm-row">
                  <div className="perm-icon">📸</div>
                  <div className="perm-info">
                    <strong>Médias &amp; Partage Story 9:16</strong>
                    <span>Enregistrer et partager tes cartes sur Statut WhatsApp &amp; TikTok.</span>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${storagePerm ? 'btn-coral' : 'btn-outline'}`}
                    onClick={() => setStoragePerm((v) => !v)}
                  >
                    {storagePerm ? 'Activé ✓' : 'Activer'}
                  </button>
                </div>

                {/* Permission 3: Audio & Haptics */}
                <div className="perm-row">
                  <div className="perm-icon">🔊</div>
                  <div className="perm-info">
                    <strong>Audio Gbaka &amp; Sons Tactiles</strong>
                    <span>Lecture vocale des Storytimes et retours interactifs sur les boutons.</span>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${audioPerm ? 'btn-coral' : 'btn-outline'}`}
                    onClick={() => setAudioPerm((v) => !v)}
                  >
                    {audioPerm ? 'Activé ✓' : 'Activer'}
                  </button>
                </div>
              </div>

              <label className="consent-check">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (e.target.checked) setErrorMsg('');
                  }}
                />
                <span>
                  J&apos;accepte la <strong>charte 100 % Anonyme</strong> : zéro numéro, zéro nom réel, zéro harcèlement — uniquement du rire et de vrais dossiers.
                </span>
              </label>

              {errorMsg && <p className="onboarding-error">{errorMsg}</p>}
            </div>
          ) : (
            <div className="onboarding-step">
              <div className="auth-switch">
                <button
                  type="button"
                  className={`auth-switch-btn ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                  }}
                >
                  Créer un compte
                </button>
                <button
                  type="button"
                  className={`auth-switch-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                  }}
                >
                  Se connecter
                </button>
              </div>

              <p className="onboarding-lead" style={{ marginBottom: 14 }}>
                🔒 Même connecté, tu publies toujours sous un <strong>blase anonyme</strong> ! Ton compte garde tes favoris et te permet de poster les épisodes 2, 3… de tes Storytimes.
              </p>

              <form onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <div className="form-group">
                    <label>Ton pseudo</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={24}
                      placeholder="Ex: BabiBoss225"
                      autoComplete="username"
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
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label>Mot de passe</label>
                  <div className="password-wrap">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="6 caractères minimum"
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm password-toggle"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? 'Masquer' : 'Afficher'}
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {errorMsg && <p className="onboarding-error">{errorMsg}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-coral btn-lg"
                  style={{ width: '100%', marginBottom: 10 }}
                >
                  {submitting
                    ? 'Patiente un peu…'
                    : authMode === 'register'
                      ? 'Créer mon compte & Entrer 🔥'
                      : 'Se connecter & Entrer 🔥'}
                </button>
              </form>

              <div className="onboarding-foot-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setErrorMsg('');
                    setStep(1);
                  }}
                >
                  ← Permissions
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    onToast('Bienvenue en mode invité anonyme ! 🎭');
                    onComplete();
                  }}
                >
                  Continuer sans compte →
                </button>
              </div>
            </div>
          )}
        </div>

        {step === 1 && (
          <div className="onboarding-footer">
            <button
              type="button"
              className="btn btn-coral btn-lg"
              style={{ width: '100%' }}
              onClick={handleAcceptPermissions}
            >
              Accepter &amp; Continuer →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
