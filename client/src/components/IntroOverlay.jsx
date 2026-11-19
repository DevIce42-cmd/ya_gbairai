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
  { left: '22%', delay: '0.5s', dur: '3.1s', size: 4, color: 'var(--amber)' },
  { left: '36%', delay: '0.2s', dur: '3.9s', size: 6, color: 'var(--violet)' },
  { left: '50%', delay: '0.7s', dur: '3.3s', size: 5, color: 'var(--coral)' },
  { left: '64%', delay: '0.1s', dur: '3.7s', size: 4, color: 'var(--indigo)' },
  { left: '78%', delay: '0.6s', dur: '3.2s', size: 6, color: 'var(--amber)' },
  { left: '90%', delay: '0.3s', dur: '3.5s', size: 5, color: 'var(--violet)' },
];

export default function IntroOverlay({ visible, onFinish }) {
  const stageRef = useRef(null);
  const outerRefs = useRef([]);
  const innerRefs = useRef([]);
  const bgRefs = useRef([]);
  const headingRefs = useRef([]);
  const currentIdxRef = useRef(-1);
  const animatingRef = useRef(false);
  const exitingRef = useRef(false);
  const timerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const exitOverlay = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    clearTimeout(timerRef.current);

    if (!stageRef.current) {
      onFinish();
      return;
    }

    gsap.to(stageRef.current, {
      yPercent: -100,
      duration: 0.9,
      ease: 'power4.inOut',
      onComplete: () => {
        onFinish();
      },
    });
  }, [onFinish]);

  const gotoScene = useCallback((index, direction = 1) => {
    if (exitingRef.current || animatingRef.current) return;
    if (index >= SCENES.length) {
      exitOverlay();
      return;
    }
    if (index < 0) return;

    const prevIdx = currentIdxRef.current;
    if (prevIdx === index) return;

    animatingRef.current = true;
    const dFactor = direction === -1 ? -1 : 1;

    const tl = gsap.timeline({
      defaults: { duration: 1.05, ease: 'power3.inOut' },
      onComplete: () => {
        animatingRef.current = false;
      },
    });

    const outers = outerRefs.current;
    const inners = innerRefs.current;
    const bgs = bgRefs.current;
    const headings = headingRefs.current;

    if (prevIdx >= 0 && outers[prevIdx]) {
      gsap.set(outers[prevIdx], { zIndex: 1 });
      tl.to(bgs[prevIdx], { yPercent: -18 * dFactor, scale: 1.08 }, 0)
        .set(outers[prevIdx], { autoAlpha: 0 });
    }

    gsap.set(outers[index], { autoAlpha: 1, zIndex: 2 });

    // Brian Cross PoWapLP counter-parallax outer/inner wipe
    tl.fromTo(
      [outers[index], inners[index]],
      {
        yPercent: (i) => (i ? -100 * dFactor : 100 * dFactor),
      },
      { yPercent: 0 },
      0
    ).fromTo(
      bgs[index],
      { yPercent: 18 * dFactor, scale: 1.12 },
      { yPercent: 0, scale: 1 },
      0
    );

    const chars = headings[index]?.querySelectorAll('.split-char');
    if (chars && chars.length) {
      tl.fromTo(
        chars,
        { autoAlpha: 0, yPercent: 120 * dFactor, rotateX: -40 },
        {
          autoAlpha: 1,
          yPercent: 0,
          rotateX: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: { each: 0.032, from: 'random' },
        },
        0.18
      );
    }

    currentIdxRef.current = index;
    setActiveIndex(index);
  }, [exitOverlay]);

  useEffect(() => {
    if (!visible) return;
    exitingRef.current = false;
    animatingRef.current = false;
    currentIdxRef.current = -1;

    // Reset all scenes
    outerRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { autoAlpha: 0, zIndex: 0, yPercent: 0 });
      if (innerRefs.current[i]) gsap.set(innerRefs.current[i], { yPercent: 0 });
    });
    if (stageRef.current) {
      gsap.set(stageRef.current, { yPercent: 0 });
    }

    // Play cinematic 3-scene sequence (~5.6s total)
    gotoScene(0, 1);

    const t1 = setTimeout(() => gotoScene(1, 1), 1750);
    const t2 = setTimeout(() => gotoScene(2, 1), 3550);
    timerRef.current = setTimeout(() => exitOverlay(), 5650);

    // Interactive wheel navigation (PoWapLP Observer feel)
    const onWheel = (e) => {
      if (animatingRef.current || exitingRef.current) return;
      if (e.deltaY > 20) {
        gotoScene(currentIdxRef.current + 1, 1);
      } else if (e.deltaY < -20 && currentIdxRef.current > 0) {
        gotoScene(currentIdxRef.current - 1, -1);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(timerRef.current);
      window.removeEventListener('wheel', onWheel);
    };
  }, [visible, gotoScene, exitOverlay]);

  if (!visible) return null;

  return (
    <div ref={stageRef} className="intro-stage" role="dialog" aria-label="Introduction Y'A GBAIRAI !">
      {/* Floating Embers */}
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

      {/* Continuous Wipe Sections (PoWapLP architecture) */}
      {SCENES.map((scene, idx) => (
        <section
          key={scene.id}
          ref={(el) => {
            outerRefs.current[idx] = el;
          }}
          className="intro-outer"
        >
          <div
            ref={(el) => {
              innerRefs.current[idx] = el;
            }}
            className="intro-inner"
          >
            <div
              ref={(el) => {
                bgRefs.current[idx] = el;
              }}
              className={`intro-scene-bg intro-bg-${scene.accent}`}
            >
              <div className="intro-center">
                <div className="intro-emblem-wrap">
                  <div className="intro-halo" />
                  <div className="intro-halo intro-halo-inner" />
                  <div className="intro-flame">{scene.badge}</div>
                </div>

                <div className="intro-kicker">{scene.kicker}</div>

                <h1
                  ref={(el) => {
                    headingRefs.current[idx] = el;
                  }}
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

      {/* Persistent Bottom Controls */}
      <div className="intro-hud">
        <div className="intro-dots" role="tablist" aria-label="Scènes d'introduction">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`intro-dot ${activeIndex === i ? 'active' : ''}`}
              onClick={() => gotoScene(i, i >= activeIndex ? 1 : -1)}
              aria-label={`Scène ${i + 1}`}
            />
          ))}
        </div>

        <div className="intro-progress-track">
          <div className="intro-progress-bar intro-progress-long" />
        </div>

        <button type="button" className="intro-skip-btn" onClick={exitOverlay}>
          Entrer dans le mouvement →
        </button>
      </div>
    </div>
  );
}
