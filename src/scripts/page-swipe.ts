import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';

const centered = 'translate3d(0, 0, 0)';
const directions = [
  { name: 'left', enter: 'translate3d(-105%, 0, 0)', exit: 'translate3d(105%, 0, 0)' },
  { name: 'right', enter: 'translate3d(105%, 0, 0)', exit: 'translate3d(-105%, 0, 0)' },
  { name: 'top', enter: 'translate3d(0, -105%, 0)', exit: 'translate3d(0, 105%, 0)' },
  { name: 'bottom', enter: 'translate3d(0, 105%, 0)', exit: 'translate3d(0, -105%, 0)' },
];
const primarySections = ['/projekte', '/studio', '/leistungen'];

const primarySectionIndex = (pathname: string) => primarySections.findIndex((section) => (
  pathname === section || pathname.startsWith(`${section}/`)
));

const primaryNavigationDirection = (from: URL, to: URL) => {
  const fromIndex = primarySectionIndex(from.pathname);
  const toIndex = primarySectionIndex(to.pathname);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;
  // Direction names describe the edge the overlay starts from. An underline
  // moving right therefore needs the overlay that enters from the left.
  return toIndex > fromIndex ? directions[0] : directions[1];
};

const projectDetailNavigationDirection = (from: URL, to: URL) => (
  from.pathname !== to.pathname && to.pathname.startsWith('/projekte/') ? directions[3] : null
);

const serviceHierarchyNavigationDirection = (from: URL, to: URL) => {
  const entersDetail = from.pathname === '/leistungen' && to.pathname.startsWith('/leistungen/');
  if (entersDetail) return directions[0];
  const returnsToOverview = from.pathname.startsWith('/leistungen/') && to.pathname === '/leistungen';
  return returnsToOverview ? directions[1] : null;
};

const homeNavigationDirection = (to: URL) => to.pathname === '/' ? directions[2] : null;

const takeIndicatorNavigationDirection = (doc: Document) => {
  const travel = doc.documentElement.dataset.headerIndicatorTravel;
  delete doc.documentElement.dataset.headerIndicatorTravel;
  if (travel === 'right') return directions[0];
  if (travel === 'left') return directions[1];
  return null;
};

interface Swipe {
  overlay: HTMLElement;
  direction: typeof directions[number];
  signal: AbortSignal;
  phase: 'covering' | 'covered' | 'swapped' | 'revealing';
  animation?: Animation;
  viewTransition?: ViewTransition;
  cancelHold?: () => void;
  onAbort: () => void;
}

/** One live overlay owns the wipe; browser snapshots must not replay it. */
export function initializePageSwipe(doc = document, host = window) {
  const swipeWindow = host as Window & { studioSchatziSwipeCleanup?: () => void };
  swipeWindow.studioSchatziSwipeCleanup?.();
  const reducedMotion = host.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let active: Swipe | null = null;

  const clearOverlay = (overlay: HTMLElement | null) => {
    overlay?.getAnimations().forEach((animation) => animation.cancel());
    if (overlay) {
      overlay.style.transform = directions[0].enter;
      delete overlay.dataset.swipeDirection;
      delete overlay.dataset.swipeCovered;
      delete overlay.dataset.swipeRevealed;
    }
    delete doc.documentElement.dataset.swipePhase;
    delete doc.documentElement.dataset.swipeDirection;
    doc.documentElement.dataset.swipeReady = 'true';
  };
  const reset = () => {
    const previous = active;
    active = null;
    previous?.signal.removeEventListener('abort', previous.onAbort);
    previous?.animation?.cancel();
    previous?.cancelHold?.();
    clearOverlay(previous?.overlay ?? doc.querySelector<HTMLElement>('.page-swipe'));
  };
  const current = (swipe: Swipe) => active === swipe && !swipe.signal.aborted;
  const phase = (swipe: Swipe, value: Swipe['phase']) => {
    swipe.phase = value;
    doc.documentElement.dataset.swipePhase = value;
    doc.documentElement.dataset.swipeDirection = swipe.direction.name;
    doc.documentElement.dataset.swipeReady = 'true';
  };
  const animate = async (swipe: Swipe, from: string, to: string, duration: number, easing: string) => {
    const animation = swipe.overlay.animate([{ transform: from }, { transform: to }], {
      duration, easing, fill: 'both',
    });
    swipe.animation = animation;
    try { await animation.finished; } catch { return false; }
    if (!current(swipe) || swipe.animation !== animation) return false;
    swipe.overlay.style.transform = to;
    swipe.animation = undefined;
    animation.cancel();
    return true;
  };
  const hold = (swipe: Swipe) => new Promise<void>((resolve) => {
    const timer = host.setTimeout(() => { swipe.cancelHold = undefined; resolve(); }, 90);
    swipe.cancelHold = () => { host.clearTimeout(timer); resolve(); };
  });

  const beforePreparation = (event: TransitionBeforePreparationEvent) => {
    reset();
    const overlay = doc.querySelector<HTMLElement>('.page-swipe');
    if (!overlay || reducedMotion.matches || event.signal.aborted) return;
    const load = event.loader;
    event.loader = async () => {
      if (event.signal.aborted || reducedMotion.matches) return load();
      // Astro invokes the loader after every before-preparation listener. Read
      // here so a remounted underline listener can publish its travel first.
      const indicatorDirection = takeIndicatorNavigationDirection(doc);
      const navigationDirection = homeNavigationDirection(event.to)
        ?? projectDetailNavigationDirection(event.from, event.to)
        ?? indicatorDirection
        ?? serviceHierarchyNavigationDirection(event.from, event.to)
        ?? primaryNavigationDirection(event.from, event.to);
      const swipe: Swipe = {
        overlay, direction: navigationDirection ?? directions[Math.floor(Math.random() * directions.length)],
        signal: event.signal, phase: 'covering', onAbort: () => { if (active === swipe) reset(); },
      };
      active = swipe;
      swipe.signal.addEventListener('abort', swipe.onAbort, { once: true });
      overlay.dataset.swipeDirection = swipe.direction.name;
      overlay.style.transform = swipe.direction.enter;
      phase(swipe, 'covering');
      try {
        await Promise.all([
          load(),
          animate(swipe, swipe.direction.enter, centered, 560, 'cubic-bezier(.4, 0, .2, 1)'),
        ]);
        if (!current(swipe)) return;
        if (event.defaultPrevented) { reset(); return; }
        phase(swipe, 'covered');
        overlay.dataset.swipeCovered = 'true';
        await hold(swipe);
      } catch (error) {
        if (active === swipe) reset();
        throw error;
      }
    };
  };
  const beforeSwap = (event: TransitionBeforeSwapEvent) => {
    // Disabling CSS fades does not remove the native snapshot layer or render pause.
    // Skipping intentionally rejects ready; consume that expected cancellation.
    void event.viewTransition.ready.catch(() => {});
    event.viewTransition.skipTransition();
    if (active?.signal === event.signal) active.viewTransition = event.viewTransition;
  };
  const afterSwap = () => {
    const swipe = active;
    if (!swipe || !current(swipe) || swipe.phase !== 'covered') return;
    phase(swipe, 'swapped');
    // after-swap runs while native rendering is paused. Reveal only after it resumes.
    const finished = swipe.viewTransition?.finished ?? Promise.resolve();
    void finished.then(async () => {
      if (!current(swipe)) return;
      if (reducedMotion.matches) { reset(); return; }
      phase(swipe, 'revealing');
      await animate(swipe, centered, swipe.direction.exit, 680, 'cubic-bezier(.2, .65, .35, 1)');
      if (current(swipe)) reset();
    }).catch(() => { if (active === swipe) reset(); });
  };

  reset();
  doc.addEventListener('astro:before-preparation', beforePreparation, options);
  doc.addEventListener('astro:before-swap', beforeSwap, options);
  doc.addEventListener('astro:after-swap', afterSwap, options);
  host.addEventListener('pagehide', reset, options);
  host.addEventListener('pageshow', reset, options);
  reducedMotion.addEventListener('change', reset, options);
  const cleanup = () => { listeners.abort(); reset(); };
  swipeWindow.studioSchatziSwipeCleanup = cleanup;
  return cleanup;
}
