import { indicatorPlacement, type IndicatorBox } from '../lib/nav-indicator';

type NavigationEvent = Event & { to: URL; signal: AbortSignal };

let previousBox: IndicatorBox | null = null;
let cleanup = () => {};

function initializeNavIndicator() {
  cleanup();
  const nav = document.querySelector<HTMLElement>('.site-header nav');
  const indicator = nav?.querySelector<HTMLElement>('[data-nav-indicator]');
  if (!nav || !indicator) return;

  const abort = new AbortController();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animation: Animation | null = null;
  let frame = 0;
  let disposed = false;
  let layout = '';
  let pendingNavigation: NavigationEvent | null = null;

  const refreshContrast = () => document.dispatchEvent(new Event('header-indicator:change'));
  const stopAnimation = () => {
    animation?.cancel();
    animation = null;
    delete indicator.dataset.moving;
  };

  const positionIndicator = (animate: boolean) => {
    if (disposed) return;
    const destination = pendingNavigation?.to;
    const selectedLink = destination
      ? [...nav.querySelectorAll<HTMLAnchorElement>('a[href]')].find((link) => {
        const url = new URL(link.href);
        return url.origin === destination.origin && (
          destination.pathname === url.pathname
          || destination.pathname.startsWith(`${url.pathname}/`)
        );
      })
      : nav.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    const label = selectedLink?.querySelector<HTMLElement>('.header-label');
    const labelBounds = label?.getBoundingClientRect() ?? null;
    const anchor = label?.querySelector<HTMLElement>('[data-underline-anchor]');
    const underlineBounds = labelBounds && anchor ? {
      left: labelBounds.left,
      top: anchor.getBoundingClientRect().top,
      width: labelBounds.width,
    } : null;
    const navBounds = nav.getBoundingClientRect();
    const nextLayout = [underlineBounds?.left, underlineBounds?.top, underlineBounds?.width, navBounds.left, navBounds.top].join(':');
    // Initial ResizeObserver/font notifications must not cancel an in-progress slide.
    if (!animate && nextLayout === layout && !reducedMotion.matches) return;
    layout = nextLayout;
    // A quick route change can interrupt a slide. Continue from its visible position.
    if (animation && indicator.dataset.visible) previousBox = indicator.getBoundingClientRect();
    const placement = indicatorPlacement(
      underlineBounds,
      previousBox,
      navBounds,
      animate && !reducedMotion.matches,
    );
    stopAnimation();
    nav.dataset.indicatorReady = 'true';

    if (!placement) {
      previousBox = null;
      delete indicator.dataset.visible;
      indicator.style.width = '0px';
      refreshContrast();
      return;
    }

    Object.assign(indicator.style, placement.to);
    indicator.dataset.visible = 'true';
    previousBox = placement.box;
    if (placement.from) {
      indicator.dataset.moving = 'true';
      const slide = indicator.animate([placement.from, placement.to], {
        duration: 320,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
      });
      animation = slide;
      void slide.finished.then(() => {
        if (disposed || animation !== slide) return;
        animation = null;
        delete indicator.dataset.moving;
        refreshContrast();
      }, () => {});
    }
    refreshContrast();
  };

  // Respond before Astro loads the next page or waits for the page wipe.
  // Keep aria-current on the actual page until the new document arrives.
  const beginNavigation = (event: Event) => {
    const navigation = event as NavigationEvent;
    if (navigation.defaultPrevented || navigation.signal.aborted) return;
    pendingNavigation = navigation;
    positionIndicator(true);

    const restoreIfCancelled = () => queueMicrotask(() => {
      if (disposed || pendingNavigation !== navigation) return;
      if (!navigation.signal.aborted && !navigation.defaultPrevented) return;
      pendingNavigation = null;
      positionIndicator(true);
    });
    navigation.signal.addEventListener('abort', restoreIfCancelled, { once: true, signal: abort.signal });
    // Another before-preparation listener may cancel after this one runs.
    restoreIfCancelled();
  };

  const schedule = () => {
    if (disposed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      positionIndicator(false);
    });
  };
  const options = { passive: true, signal: abort.signal };
  document.addEventListener('astro:before-preparation', beginNavigation, { signal: abort.signal });
  window.addEventListener('resize', schedule, options);
  window.addEventListener('pageshow', schedule, options);
  reducedMotion.addEventListener('change', schedule, { signal: abort.signal });
  const resize = new ResizeObserver(schedule);
  resize.observe(nav);
  for (const label of nav.querySelectorAll('.header-label')) resize.observe(label);
  void document.fonts.ready.then(schedule);

  cleanup = () => {
    if (disposed) return;
    previousBox = indicator.dataset.visible ? indicator.getBoundingClientRect() : null;
    disposed = true;
    stopAnimation();
    abort.abort();
    resize.disconnect();
    cancelAnimationFrame(frame);
  };

  positionIndicator(true);
}

initializeNavIndicator();
document.addEventListener('astro:before-swap', () => cleanup());
document.addEventListener('astro:after-swap', initializeNavIndicator);
