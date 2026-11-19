import React, { useEffect, useState } from 'react';

const EMBERS = [
  { left: '12%', delay: '0s', dur: '3.2s', size: 5, color: 'var(--coral)' },
  { left: '24%', delay: '0.4s', dur: '2.8s', size: 4, color: 'var(--amber)' },
  { left: '38%', delay: '0.2s', dur: '3.5s', size: 6, color: 'var(--violet)' },
  { left: '52%', delay: '0.6s', dur: '3.0s', size: 5, color: 'var(--coral)' },
  { left: '66%', delay: '0.1s', dur: '3.4s', size: 4, color: 'var(--indigo)' },
  { left: '78%', delay: '0.5s', dur: '2.9s', size: 6, color: 'var(--amber)' },
  { left: '88%', delay: '0.3s', dur: '3.1s', size: 5, color: 'var(--violet)' },
];

export default function IntroOverlay({ visible, onFinish }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setExiting(false);
    const exitTimer = setTimeout(() => setExiting(true), 2200);
    const doneTimer = setTimeout(() => onFinish(), 2850);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [visible, onFinish]);

  if (!visible) return null;

  function skipNow() {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onFinish(), 520);
  }

  return (
    <div
      className={`intro-stage ${exiting ? 'exiting' : ''}`}
      onClick={skipNow}
      role="presentation"
      aria-label="Bienvenue sur Y'A GBAIRAI !"
    >
      {/* Dual Neon Spotlights */}
      <div className="intro-beam intro-beam-left" />
      <div className="intro-beam intro-beam-right" />

      {/* Floating Sparks / Embers */}
      <div className="intro-embers" aria-hidden="true">
        {EMBERS.map((e, idx) => (
          <span
            key={idx}
            className="intro-ember"
            style={{
              left: e.left,
              width: e.size,
              height: e.size,
              background: e.color,
              animationDelay: e.delay,
              animationDuration: e.dur,
            }}
          />
        ))}
      </div>

      {/* Center Stage */}
      <div className="intro-center">
        <div className="intro-emblem-wrap">
          <div className="intro-halo" />
          <div className="intro-halo intro-halo-inner" />
          <div className="intro-flame">🔥</div>
        </div>

        <div className="intro-kicker">100% ANONYME • ZÉRO DJÊ • SANS FILTRE</div>

        <h1 className="intro-logo">
          <span className="intro-word-1">Y&apos;A </span>
          <span className="intro-word-2">GBAIRAI !</span>
        </h1>

        <p className="intro-tagline">
          Les vrais dossiers de Babi &amp; d&apos;ailleurs — Confessions drôles &amp; Storytimes
        </p>

        <div className="intro-progress-track">
          <div className="intro-progress-bar" />
        </div>

        <button
          type="button"
          className="intro-skip-btn"
          onClick={(e) => {
            e.stopPropagation();
            skipNow();
          }}
        >
          Entrer dans le mouvement →
        </button>
      </div>
    </div>
  );
}
