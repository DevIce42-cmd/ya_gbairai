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
  const contentRefs = useRef([]);
  const headingRefs = useRef([]);
  const activeTlRef = useRef(null);
  const currentIdxRef = useRef(0);
  const exitingRef = useRef(false);
  const timersRef = useRef([]);
  const touchStartYRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const exitOverlay = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    clearAllTimers();
    if (activeTlRef.current) {
      activeTlRef.current.kill();
      activeTlRef.current = null;
    }

    document.body.style.overflow = '';

    if (!stageRef.current) {
      onFinish();
      return;
    }

    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      onFinish();
    };

    // Never block touches during exit animation + guarantee unmount via failsafe timer
    stageRef.current.style.pointerEvents = 'none';
    const failsafe = setTimeout(finishOnce, 720);

    gsap.killTweensOf(stageRef.current);
    gsap.to(stageRef.current, {
      yPercent: -100,
      opacity: 0.92,
      duration: 0.55,
      ease: 'power3.inOut',
      onComplete: () => {
        clearTimeout(failsafe);
        finishOnce();
      },
    });
  }, [clearAllTimers, onFinish]);

  const animateSceneContent = useCallback((index, dFactor = 1, delay = 0) => {
    const contentEl = contentRefs.current[index];
    const chars = headingRefs.current[index]?.querySelectorAll('.split-char');
    const tl = gsap.timeline();

    if (contentEl) {
      const items = contentEl.querySelectorAll('.intro-anim-item');
      gsap.killTweensOf(items);
      tl.fromTo(
        items,
        { opacity: 0.25, y: 14 * dFactor },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
        delay
      );
    }

    if (chars?.length) {
      gsap.killTweensOf(chars);
      tl.fromTo(
        chars,
        { opacity: 0.2, yPercent: 45 * dFactor },
        {
          opacity: 1,
          yPercent: 0,
          duration: 0.42,
          ease: 'power2.out',
          stagger: { each: 0.018, from: 'start' },
          clearProps: 'opacity,transform',
        },
        delay
      );
    }

    return tl;
  }, []);

  const gotoScene = useCallback((index, direction = 1, manual = false) => {
    if (exitingRef.current) return;
    if (index >= SCENES.length) {
      exitOverlay();
      return;
    }
    if (index < 0) return;

    const prevIdx = currentIdxRef.current;
    if (prevIdx === index) return;

    if (manual) {
      clearAllTimers();
      timersRef.current.push(setTimeout(() => exitOverlay(), 2800));
    }

    // Safely interrupt any previous transition so clicks/swipes are never lost
    if (activeTlRef.current) {
      activeTlRef.current.kill();
      activeTlRef.current = null;
    }

    const dFactor = direction === -1 ? -1 : 1;
    const outers = outerRefs.current;
    const inners = innerRefs.current;
    const bgs = bgRefs.current;

    outers.forEach((el, i) => {
      if (!el) return;
      if (i !== prevIdx && i !== index) {
        gsap.set(el, { autoAlpha: 0, zIndex: 0, yPercent: 0 });
      }
    });

    gsap.set(outers[prevIdx], { autoAlpha: 1, zIndex: 1, yPercent: 0 });
    gsap.set(inners[prevIdx], { yPercent: 0 });
    gsap.set(outers[index], { autoAlpha: 1, zIndex: 2 });

    const tl = gsap.timeline({
      defaults: { duration: 0.78, ease: 'power3.inOut' },
      onComplete: () => {
        if (outers[prevIdx]) gsap.set(outers[prevIdx], { autoAlpha: 0, zIndex: 0 });
        activeTlRef.current = null;
      },
    });

    tl.to(bgs[prevIdx], { yPercent: -14 * dFactor, scale: 1.06 }, 0)
      .fromTo(
        [outers[index], inners[index]],
        { yPercent: (i) => (i ? -100 * dFactor : 100 * dFactor) },
        { yPercent: 0 },
        0
      )
      .fromTo(
        bgs[index],
        { yPercent: 14 * dFactor, scale: 1.08 },
        { yPercent: 0, scale: 1 },
        0
      )
      .add(animateSceneContent(index, dFactor, 0), 0.16);

    activeTlRef.current = tl;
    currentIdxRef.current = index;
    setActiveIndex(index);
  }, [animateSceneContent, clearAllTimers, exitOverlay]);

  useEffect(() => {
    if (!visible) return undefined;

    clearAllTimers();
    if (activeTlRef.current) {
      activeTlRef.current.kill();
      activeTlRef.current = null;
    }
    exitingRef.current = false;
    currentIdxRef.current = 0;
    setActiveIndex(0);

    // Lock body scroll & Android SwipeRefresh while intro is visible
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (window.YaGbairaiNative?.setSwipeRefreshEnabled) {
      try {
        window.YaGbairaiNative.setSwipeRefreshEnabled(false);
      } catch {
        // ignore bridge error
      }
    }

    // Reset all scenes cleanly without blank flash
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

    activeTlRef.current = animateSceneContent(0, 1, 0.05);

    timersRef.current = [
      setTimeout(() => gotoScene(1, 1), 1900),
      setTimeout(() => gotoScene(2, 1), 3800),
      setTimeout(() => exitOverlay(), 5800),
    ];

    const onWheel = (e) => {
      if (exitingRef.current) return;
      if (e.deltaY > 30) gotoScene(currentIdxRef.current + 1, 1, true);
      else if (e.deltaY < -30 && currentIdxRef.current > 0) gotoScene(currentIdxRef.current - 1, -1, true);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') exitOverlay();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') gotoScene(currentIdxRef.current + 1, 1, true);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') gotoScene(currentIdxRef.current - 1, -1, true);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearAllTimers();
      if (activeTlRef.current) {
        activeTlRef.current.kill();
        activeTlRef.current = null;
      }
      document.body.style.overflow = '';
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible, animateSceneContent, clearAllTimers, gotoScene, exitOverlay]);

  if (!visible) return null;

  const progressPct = ((activeIndex + 1) / SCENES.length) * 100;

  return (
    <div
      ref={stageRef}
      className="intro-stage"
      role="dialog"
      aria-modal="true"
      aria-label="Introduction Y'A GBAIRAI !"
      onTouchStart={(e) => {
        touchStartYRef.current = e.touches?.[0]?.clientY ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartYRef.current === null) return;
        const endY = e.changedTouches?.[0]?.clientY ?? touchStartYRef.current;
        const delta = touchStartYRef.current - endY;
        touchStartYRef.current = null;
        if (delta > 40) gotoScene(currentIdxRef.current + 1, 1, true);
        else if (delta < -40 && currentIdxRef.current > 0) gotoScene(currentIdxRef.current - 1, -1, true);
      }}
    >
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
              <div ref={(el) => { contentRefs.current[idx] = el; }} className="intro-center">
                <div className="intro-emblem-wrap intro-anim-item">
                  <div className="intro-halo" />
                  <div className="intro-halo intro-halo-inner" />
                  <div className="intro-flame">{scene.badge}</div>
                </div>

                <div className="intro-kicker intro-anim-item">{scene.kicker}</div>

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

                <p className="intro-tagline intro-anim-item">{scene.subtitle}</p>
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
          <div className="intro-progress-bar intro-progress-synced" style={{ width: `${progressPct}%` }} />
        </div>

        <button type="button" className="intro-skip-btn" onClick={exitOverlay}>
          Entrer dans le mouvement →
        </button>
      </div>
    </div>
  );
}
