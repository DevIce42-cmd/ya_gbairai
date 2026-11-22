// Global JavaScript Button Interactivity Engine for Y'A GBAIRAI !
// Ripple glow, radial WhatsApp-green micro-sparks, subtle Web Audio tactile pops,
// mobile haptics, spring press animation & desktop magnetic hover pull.

const SOUND_KEY = 'ya_gbairai_sfx_enabled';

const BUTTON_SELECTOR = [
  'button',
  '.btn',
  '.btn-icon',
  '.nav-pill',
  '.sort-btn',
  '.tag-chip',
  '.react-pill',
  '.read-btn',
  '.poll-opt',
  '.mobile-fab',
  '.mobile-nav-btn',
  '.figma-3d-card',
  '.figma-animated-stats-card',
  '.mini-tag',
  '.part-btn',
  '.intro-skip-btn',
  '.back-top-btn',
].join(', ');

const SPARK_SELECTOR = [
  '.btn-coral',
  '.btn-indigo',
  '.btn-whatsapp',
  '.mobile-fab',
  '.react-pill',
  '.poll-opt',
  '.figma-3d-card',
  '.figma-animated-stats-card',
  '.intro-skip-btn',
].join(', ');

const MAGNETIC_SELECTOR = '.btn-coral, .btn-indigo, .mobile-fab';

const SPARK_COLORS = ['#25D366', '#53EB8D', '#00A884', '#D9FDD3', '#FFFFFF'];

let audioCtx = null;

export function isSoundEnabled() {
  try {
    const val = localStorage.getItem(SOUND_KEY);
    return val === null ? true : val === '1';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTapSound(kind = 'tap') {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === 'cta') {
      // Crisp upbeat WhatsApp-style pop
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.065);
      gain.gain.setValueAtTime(0.065, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.095);
    } else if (kind === 'react') {
      // Playful bubble chirp for reactions & polls
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.105);
    } else {
      // Subtle soft tick for navigation & utility buttons
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(510, now + 0.04);
      gain.gain.setValueAtTime(0.038, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.055);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

function triggerHaptic(duration = 10) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignore unsupported environments
    }
  }
}

function createRipple(button, clientX, clientY) {
  const rect = button.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  // Render ripple on document.body (never mutate React-managed button children!)
  const computed = window.getComputedStyle(button);
  const clip = document.createElement('div');
  clip.className = 'fx-ripple-portal';
  clip.setAttribute('aria-hidden', 'true');
  clip.style.left = `${rect.left}px`;
  clip.style.top = `${rect.top}px`;
  clip.style.width = `${rect.width}px`;
  clip.style.height = `${rect.height}px`;
  clip.style.borderRadius = computed.borderRadius || '12px';

  const size = Math.max(rect.width, rect.height) * 2.15;
  const x = clientX ? clientX - rect.left : rect.width / 2;
  const y = clientY ? clientY - rect.top : rect.height / 2;

  const wave = document.createElement('span');
  wave.className = 'fx-ripple-wave';
  if (button.classList.contains('btn-coral') || button.classList.contains('mobile-fab')) {
    wave.classList.add('fx-ripple-dark');
  }

  wave.style.width = `${size}px`;
  wave.style.height = `${size}px`;
  wave.style.left = `${x - size / 2}px`;
  wave.style.top = `${y - size / 2}px`;

  clip.appendChild(wave);
  document.body.appendChild(clip);

  const cleanup = () => clip.remove();
  wave.addEventListener('animationend', cleanup, { once: true });
  setTimeout(cleanup, 620);
}

function spawnButtonSparks(x, y, count = 8) {
  if (typeof window === 'undefined') return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const layer = document.createElement('div');
  layer.className = 'fx-spark-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  for (let i = 0; i < count; i += 1) {
    const spark = document.createElement('span');
    spark.className = 'fx-spark';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
    const distance = 26 + Math.random() * 36;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const size = 4 + Math.random() * 4;

    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
    spark.style.setProperty('--fx-dx', `${dx.toFixed(1)}px`);
    spark.style.setProperty('--fx-dy', `${dy.toFixed(1)}px`);
    layer.appendChild(spark);
  }

  setTimeout(() => layer.remove(), 560);
}

function triggerPressBounce(button) {
  // Skip custom-transform 3D cards & keyframe-animated card so we don't override their motion
  if (
    button.classList.contains('figma-3d-card') ||
    button.classList.contains('figma-animated-stats-card')
  ) {
    return;
  }
  button.classList.remove('fx-pop');
  // Force reflow so rapid clicks re-trigger the spring pop
  void button.offsetWidth;
  button.classList.add('fx-pop');
  setTimeout(() => button.classList.remove('fx-pop'), 260);
}

export function initButtonFX() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let activeMagnetic = null;

  const onPointerDown = (e) => {
    if (e.button && e.button !== 0) return;
    const button = e.target?.closest?.(BUTTON_SELECTOR);
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;

    // Clear magnetic hover offset before press bounce so transforms don't fight
    if (activeMagnetic === button) {
      button.style.removeProperty('--mag-x');
      button.style.removeProperty('--mag-y');
      button.classList.remove('fx-magnetic-active');
      activeMagnetic = null;
    }

    const isCta = button.matches('.btn-coral, .btn-indigo, .mobile-fab, .figma-3d-card, .figma-animated-stats-card');
    const isReact = button.matches('.react-pill, .poll-opt, .btn-whatsapp');

    createRipple(button, e.clientX, e.clientY);
    triggerPressBounce(button);

    if (isCta) {
      playTapSound('cta');
      triggerHaptic(14);
    } else if (isReact) {
      playTapSound('react');
      triggerHaptic(12);
    } else {
      playTapSound('tap');
      triggerHaptic(8);
    }

    if (button.matches(SPARK_SELECTOR)) {
      const rect = button.getBoundingClientRect();
      const sx = e.clientX || rect.left + rect.width / 2;
      const sy = e.clientY || rect.top + rect.height / 2;
      spawnButtonSparks(sx, sy, isCta ? 10 : 7);
    }
  };

  // Keyboard activation (Enter / Space) also gets ripple + subtle sound
  const onKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const button = e.target?.closest?.(BUTTON_SELECTOR);
    if (!button || button.disabled) return;
    createRipple(button, 0, 0);
    triggerPressBounce(button);
    playTapSound('tap');
  };

  // Subtle magnetic hover pull on desktop primary CTAs
  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const target = e.target?.closest?.(MAGNETIC_SELECTOR);
    if (activeMagnetic && activeMagnetic !== target) {
      activeMagnetic.style.removeProperty('--mag-x');
      activeMagnetic.style.removeProperty('--mag-y');
      activeMagnetic.classList.remove('fx-magnetic-active');
      activeMagnetic = null;
    }

    if (!target || target.disabled) return;

    const rect = target.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    target.style.setProperty('--mag-x', `${(relX * 7).toFixed(2)}px`);
    target.style.setProperty('--mag-y', `${(relY * 5).toFixed(2)}px`);
    target.classList.add('fx-magnetic-active');
    activeMagnetic = target;
  };

  const resetMagnetic = () => {
    if (!activeMagnetic) return;
    activeMagnetic.style.removeProperty('--mag-x');
    activeMagnetic.style.removeProperty('--mag-y');
    activeMagnetic.classList.remove('fx-magnetic-active');
    activeMagnetic = null;
  };

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('keydown', onKeyDown, { passive: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', resetMagnetic, { passive: true });
  window.addEventListener('blur', resetMagnetic);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', resetMagnetic);
    window.removeEventListener('blur', resetMagnetic);
    resetMagnetic();
  };
}
