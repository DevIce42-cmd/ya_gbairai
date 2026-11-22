// Ergonomic touch gestures for Y'A GBAIRAI !
// Swipe-down-to-close on mobile bottom-sheet modals (drag from the handle / header).

const DISMISS_DISTANCE = 110;

export function initSheetSwipeToClose() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let card = null;
  let startY = 0;
  let deltaY = 0;
  let startTime = 0;

  const isMobileSheet = () => window.matchMedia('(max-width: 600px)').matches;

  const onTouchStart = (e) => {
    if (!isMobileSheet() || e.touches.length !== 1) return;
    const target = e.target;
    // Only start from the header / handle zone, never from buttons or scrolling content
    if (target.closest('button, a, input, textarea, select')) return;
    const header = target.closest('.modal-header');
    if (!header) return;
    const backdrop = header.closest('.modal-backdrop');
    if (!backdrop || backdrop.classList.contains('onboarding-backdrop')) return;

    card = header.closest('.modal-card');
    if (!card) return;
    startY = e.touches[0].clientY;
    deltaY = 0;
    startTime = Date.now();
    card.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    if (!card) return;
    deltaY = Math.max(0, e.touches[0].clientY - startY);
    card.style.transform = `translateY(${deltaY}px)`;
  };

  const onTouchEnd = () => {
    if (!card) return;
    const el = card;
    card = null;
    const velocity = deltaY / Math.max(1, Date.now() - startTime);
    el.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';

    if (deltaY > DISMISS_DISTANCE || (deltaY > 40 && velocity > 0.6)) {
      el.style.transform = 'translateY(100%)';
      const closeBtn = el.querySelector('.modal-header button[aria-label="Fermer"]');
      setTimeout(() => {
        el.style.transform = '';
        el.style.transition = '';
        if (closeBtn) closeBtn.click();
      }, 180);
      if (navigator.vibrate) {
        try { navigator.vibrate(8); } catch { /* ignore */ }
      }
    } else {
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 240);
    }
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true });

  return () => {
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchcancel', onTouchEnd);
  };
}
