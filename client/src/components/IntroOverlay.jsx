import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const SCENES = [
  {
    id: 'scene-1',
    kicker: 'MINUIT À BABI • CONFIDENCES',
    title: 'CHUT...',
    subtitle: 'Tu as un dossier chaud ou une honte que personne ne connaît ?',
    accent: 'coral',
    badge: '🤫',
  },
  {
    id: 'scene-2',
    kicker: '100% EN SCRED • ZÉRO DJÊ',
    title: 'ON VERSE TOUT',
    subtitle: 'Gbairais drôles en scred & Storytimes en épisodes (Partie 1, Partie 2…)',
    accent: 'indigo',
    badge: '🎭',
  },
  {
    id: 'scene-3',
    kicker: 'LE REPÈRE OFFICIEL • SANS FILTRE',
    title: "Y'A GBAIRAI !",
    subtitle: "Les vrais dossiers de Babi & d'ailleurs — Prépare-toi à rire fort.",
    accent: 'brand',
    badge: '🔥',
  },
];

const EMBERS = [
  { left: '10%', delay: '0s', dur: '3.6s', size: 5, color: 'var(--coral)' },
  { left: '24%', delay: '0.5s', dur: '3.1s', size: 4, color: 'var(--amber)' },
  { left: '38%', delay: '0.2s', dur: '3.9s', size: 6, color: 'var(--violet)' },
  { left: '54%', delay: '0.7s', dur: '3.3s', size: 5, color: 'var(--coral)' },
  { left: '70%', delay: '0.1s', dur: '3.7s', size: 4, color: 'var(--indigo)' },
  { left: '84%', delay: '0.6s', dur: '3.2s', size: 6, color: 'var(--amber)' },
];

export default function IntroOverlay({ visible, onFinish }) {
  const stageRef = useRef(null);
  const outerRefs = useRef([]);
  const innerRefs = useRef([]);
  const bgRefs = useRef([]);
  const headingRefs = useRef([]);
  const currentIdxRef = useRef(0);
  const animatingRef = useRef(false);
  const exitingRef = useRef(false);
  const timersRef = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [runKey, setRunKey] = useState(0);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const exitOverlay = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    clearAllTimers();

    if (!stageRef.current) {
      onFinish();
      return;
    }

    gsap.to(stageRef.current, {
      yPercent: -100,
      duration: 0.85,
      ease: 'power4.inOut',
      onComplete: () => {
        onFinish();
      },
    });
  }, [clearAllTimers, onFinish]);

  const gotoScene = useCallback((index, direction = 1, manual = false) => {
    if (exitingRef.current || animatingRef.current) return;
    if (index >= SCENES.length) {
      exitOverlay();
      return;
    }
    if (index < 0) return;

    const prevIdx = currentIdxRef.current;
    if (prevIdx === index) return;

    if (manual) {
      clearAllTimers();
      timersRef.current.push(setTimeout(() => exitOverlay(), 2600));
    }

    animatingRef.current = true;
    const dFactor = direction === -1 ? -1 : 1;

    const outers = outerRefs.current;
    const inners = innerRefs.current;
    const bgs = bgRefs.current;
    const headings = headingRefs.current;

    const tl = gsap.timeline({
      defaults: { duration: 1.0, ease: 'power3.inOut' },
      onComplete: () => {
        if (outers[prevIdx]) gsap.set(outers[prevIdx], { autoAlpha: 0, zIndex: 0 });
        animatingRef.current = false;
      },
    });

    gsap.set(outers[prevIdx], { zIndex: 1 });
    gsap.set(outers[index], { autoAlpha: 1, zIndex: 2 });

    tl.to(bgs[prevIdx], { yPercent: -16 * dFactor, scale: 1.08 }, 0)
      .fromTo(
        [outers[index], inners[index]],
        { yPercent: (i) => (i ? -100 * dFactor : 100 * dFactor) },
        { yPercent: 0 },
        0
      )
      .fromTo(
        bgs[index],
        { yPercent: 16 * dFactor, scale: 1.1 },
        { yPercent: 0, scale: 1 },
        0
      );

    const chars = headings[index]?.querySelectorAll('.split-char');
    if (chars?.length) {
      tl.fromTo(
        chars,
        { autoAlpha: 0, yPercent: 110 * dFactor },
        {
          autoAlpha: 1,
          yPercent: 0,
          duration: 0.75,
          ease: 'power3.out',
          stagger: { each: 0.03, from: 'start' },
        },
        0.2
      );
    }

    currentIdxRef.current = index;
    setActiveIndex(index);
  }, [clearAllTimers, exitOverlay]);

  useEffect(() => {
    if (!visible) return;
    clearAllTimers();
    exitingRef.current = false;
    animatingRef.current = false;
    currentIdxRef.current = 0;
    setActiveIndex(0);
    setRunKey((k) => k + 1);

    // Show Scene 0 cleanly without blank flash
    outerRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.killTweensOf([el, innerRefs.current[i], bgRefs.current[i]]);
      gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 0, yPercent: 0 });
      if (innerRefs.current[i]) gsap.set(innerRefs.current[i], { yPercent: 0 });
      if (bgRefs.current[i]) gsap.set(bgRefs.current[i], { yPercent: 0, scale: 1 });
    });

    if (stageRef.current) {
      gsap.killTweensOf(stageRef.current);
      gsap.set(stageRef.current, { yPercent: 0, opacity: 1 });
    }

    const firstChars = headingRefs.current[0]?.querySelectorAll('.split-char');
    if (firstChars?.length) {
      gsap.fromTo(
        firstChars,
        { autoAlpha: 0, yPercent: 90 },
        { autoAlpha: 1, yPercent: 0, duration: 0.75, ease: 'power3.out', stagger: 0.04 }
      );
    }

    timersRef.current = [
      setTimeout(() => gotoScene(1, 1), 1850),
      setTimeout(() => gotoScene(2, 1), 3750),
      setTimeout(() => exitOverlay(), 5800),
    ];

    const onWheel = (e) => {
      if (animatingRef.current || exitingRef.current) return;
      if (e.deltaY > 25) gotoScene(currentIdxRef.current + 1, 1, true);
      else if (e.deltaY < -25 && currentIdxRef.current > 0) gotoScene(currentIdxRef.current - 1, -1, true);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      clearAllTimers();
      window.removeEventListener('wheel', onWheel);
    };
  }, [visible, clearAllTimers, gotoScene, exitOverlay]);

  if (!visible) return null;

  return (
    <div ref={stageRef} className="intro-stage" role="dialog" aria-label="Introduction Y'A GBAIRAI !">
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

      {SCENES.map((scene, idx) => (
        <section
          key={scene.id}
          ref={(el) => { outerRefs.current[idx] = el; }}
          className="intro-outer"
        >
          <div ref={(el) => { innerRefs.current[idx] = el; }} className="intro-inner">
            <div ref={(el) => { bgRefs.current[idx] = el; }} className={`intro-scene-bg intro-bg-${scene.accent}`}>
              <div className="intro-center">
                <div className="intro-emblem-wrap">
                  <div className="intro-halo" />
                  <div className="intro-halo intro-halo-inner" />
                  <div className="intro-flame">{scene.badge}</div>
                </div>

                <div className="intro-kicker">{scene.kicker}</div>

                <h1
                  ref={(el) => { headingRefs.current[idx] = el; }}
                  className={`intro-logo ${scene.accent === 'brand' ? 'intro-logo-brand' : ''}`}
                >
                  {scene.title.split('').map((ch, cIdx) => (
                    <span key={cIdx} className="split-char">
                      {ch === ' ' ? '\u00A0' : ch}
                    </span>
                  ))}
                </h1>

                <p className="intro-tagline">{scene.subtitle}</p>
              </div>
            </div>
          </div>
        </section>
      ))}

      <div className="intro-hud">
        <div className="intro-dots" role="tablist" aria-label="Scènes d'introduction">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`intro-dot ${activeIndex === i ? 'active' : ''}`}
              onClick={() => gotoScene(i, i >= activeIndex ? 1 : -1, true)}
              aria-label={`Scène ${i + 1}`}
            />
          ))}
        </div>

        <div className="intro-progress-track">
          <div key={runKey} className="intro-progress-bar intro-progress-long" />
        </div>

        <button type="button" className="intro-skip-btn" onClick={exitOverlay}>
          Entrer dans le mouvement →
        </button>
      </div>
    </div>
  );
}
