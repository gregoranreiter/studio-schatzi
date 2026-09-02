import { indicatorPlacement, type IndicatorBox } from '../lib/nav-indicator';

type NavigationEvent = Event & { to: URL; signal: AbortSignal };

let previousBox: IndicatorBox | null = null;
let previousServicesLabelBox: DOMRect | null = null;
let previousMenuWasStandard = false;
let servicesMovedOnSource = false;
let servicesReturningToOverview = false;
let previousBreadcrumbGhost: HTMLElement | null = null;
let servicesLabelAnimation: Animation | null = null;
let sourceMenuAnimations: Animation[] = [];
let menuMorphAnimations: Animation[] = [];
let cleanup = () => {};

const resetNavigationMemory = () => {
  previousBox = null;
  previousServicesLabelBox = null;
  previousMenuWasStandard = false;
  servicesMovedOnSource = false;
  servicesReturningToOverview = false;
  previousBreadcrumbGhost = null;
};

const publishIndicatorTravel = (distance: number) => {
  if (Math.abs(distance) < .5) return;
  document.documentElement.dataset.headerIndicatorTravel = distance > 0 ? 'right' : 'left';
};

function initializeNavIndicator() {
  cleanup();
  const nav = document.querySelector<HTMLElement>('.site-header nav');
  const indicator = nav?.querySelector<HTMLElement>('[data-nav-indicator]');
  if (!nav || !indicator) return;

  const abort = new AbortController();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animation: Animation | null = null;
  let frame = 0;
  let sourceFollowFrame = 0;
  let disposed = false;
  let layout = '';
  let pendingNavigation: NavigationEvent | null = null;

  const servicesLabel = () => {
    // Animate the flex item: transforms do not affect the inline label span.
    const preferred = nav.querySelector<HTMLElement>('.nav-services-back');
    const fallback = nav.querySelector<HTMLElement>('a[href="/leistungen"]');
    const label = preferred && typeof preferred.getBoundingClientRect === 'function' ? preferred : fallback;
    return label && typeof label.getBoundingClientRect === 'function' ? label : null;
  };

  const label = servicesLabel();
  const from = previousServicesLabelBox;
  previousServicesLabelBox = null;
  const movedOnSource = servicesMovedOnSource;
  servicesMovedOnSource = false;
  const returningToOverview = servicesReturningToOverview;
  servicesReturningToOverview = false;
  const to = label?.getBoundingClientRect();
  const labelMovement = label && from && to ? {
    label,
    x: from.left - to.left,
    y: from.top - to.top,
  } : null;
  const ghost = nav.querySelector<HTMLElement>('.nav-standard-ghost');
  const breadcrumb = nav.querySelector<HTMLElement>('.nav-service-breadcrumb');
  const standardPages = nav.querySelector<HTMLElement>('.nav-pages:not(.nav-pages--service-detail)');
  const returnGhost = returningToOverview ? previousBreadcrumbGhost : null;
  previousBreadcrumbGhost = null;
  const morphFromStandard = previousMenuWasStandard
    && !movedOnSource
    && !!labelMovement
    && !!ghost
    && typeof ghost.querySelectorAll === 'function'
    && !!breadcrumb
    && !reducedMotion.matches;
  // The source page already moved "Leistungen" and hid its siblings; reveal only
  // the new breadcrumb pieces after the covered swap instead of popping them in.
  const completeSourceMorph = previousMenuWasStandard
    && movedOnSource
    && !!breadcrumb
    && !reducedMotion.matches;
  const morphToStandard = returningToOverview
    && !!labelMovement
    && !!standardPages
    && !!returnGhost
    && !reducedMotion.matches;
  previousMenuWasStandard = false;
  let returnIncoming: HTMLElement[] = [];
  let indicatorEnabled = !(morphFromStandard || movedOnSource || morphToStandard);
  const zeroWidthClip = (_item: HTMLElement) => 'inset(0 100% 0 0)';

  const clearMenuMorph = () => {
    menuMorphAnimations.forEach((item) => item.cancel());
    menuMorphAnimations = [];
    servicesLabelAnimation?.cancel();
    servicesLabelAnimation = null;
    if (labelMovement) labelMovement.label.style.transform = '';
    if (ghost) {
      ghost.style.visibility = '';
      ghost.querySelector<HTMLElement>('a[href="/leistungen"]')?.style.removeProperty('visibility');
    }
    breadcrumb?.querySelector<HTMLElement>('.nav-service-separator')?.style.removeProperty('clip-path');
    breadcrumb?.querySelector<HTMLElement>('.nav-service-current')?.style.removeProperty('clip-path');
    returnIncoming.forEach((item) => item.style.removeProperty('clip-path'));
    if (standardPages) standardPages.style.removeProperty('position');
    returnGhost?.remove();
  };

  if (morphFromStandard && labelMovement && ghost && breadcrumb) {
    ghost.style.visibility = 'visible';
    const ghostService = ghost.querySelector<HTMLElement>('a[href="/leistungen"]');
    if (ghostService) ghostService.style.visibility = 'hidden';
    labelMovement.label.style.transform = `translate3d(${labelMovement.x}px, ${labelMovement.y}px, 0)`;
  }

  if ((morphFromStandard || completeSourceMorph) && breadcrumb) {
    const separator = breadcrumb.querySelector<HTMLElement>('.nav-service-separator');
    const current = breadcrumb.querySelector<HTMLElement>('.nav-service-current');
    if (separator) separator.style.clipPath = 'inset(0 100% 0 0)';
    if (current) current.style.clipPath = 'inset(0 100% 0 0)';
  }

  if (morphToStandard && labelMovement && standardPages && returnGhost) {
    standardPages.style.position = 'relative';
    returnGhost.classList.add('nav-breadcrumb-ghost');
    returnGhost.setAttribute('aria-hidden', 'true');
    for (const link of returnGhost.querySelectorAll<HTMLAnchorElement>('a')) {
      link.removeAttribute('href');
      link.removeAttribute('aria-current');
      link.tabIndex = -1;
    }
    standardPages.append(returnGhost);
    const ghostService = returnGhost.querySelector<HTMLElement>('.nav-services-back');
    if (ghostService) ghostService.style.visibility = 'hidden';
    labelMovement.label.style.transform = `translate3d(${labelMovement.x}px, ${labelMovement.y}px, 0)`;
    returnIncoming = [...standardPages.querySelectorAll<HTMLElement>(':scope > a:not([href="/leistungen"])')];
    returnIncoming.forEach((item) => { item.style.clipPath = zeroWidthClip(item); });
  }

  const animateServicesLabel = () => {
    servicesLabelAnimation?.cancel();
    servicesLabelAnimation = null;
    // Entering a service already moves this label before the covered page swap.
    // Only the reverse handoff needs a destination-side animation.
    if (!labelMovement || reducedMotion.matches || !morphToStandard) return null;
    const { label: movingLabel, x, y } = labelMovement;
    if (Math.abs(x) < .5 && Math.abs(y) < .5) return;
    const movement = movingLabel.animate([
      { transform: `translate3d(${x}px, ${y}px, 0)` },
      { transform: 'translate3d(0, 0, 0)' },
    ], {
      duration: 420,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      fill: 'both',
    });
    servicesLabelAnimation = movement;
    if (morphToStandard) {
      const follow = () => {
        if (disposed || servicesLabelAnimation !== movement) return;
        positionIndicator(false);
        sourceFollowFrame = requestAnimationFrame(follow);
      };
      sourceFollowFrame = requestAnimationFrame(follow);
    }
    void movement.finished.then(() => {
      if (servicesLabelAnimation !== movement) return;
      movingLabel.style.transform = '';
      movement.cancel();
      servicesLabelAnimation = null;
      if (morphToStandard) positionIndicator(false);
    }, () => {});
    return movement;
  };

  const animateMenuMorph = () => {
    menuMorphAnimations = [];
    if ((morphFromStandard || completeSourceMorph) && breadcrumb) {
      const outgoing = morphFromStandard && ghost
        ? [...ghost.querySelectorAll<HTMLElement>('a:not([href="/leistungen"])')]
        : [];
      const incoming = [
        breadcrumb.querySelector<HTMLElement>('.nav-service-separator'),
        breadcrumb.querySelector<HTMLElement>('.nav-service-current'),
      ].filter((item): item is HTMLElement => !!item);
      menuMorphAnimations.push(
        ...outgoing.map((item) => item.animate([
          { clipPath: 'inset(0 0 0 0)' },
          { clipPath: zeroWidthClip(item) },
        ], { duration: 300, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'both' })),
        ...incoming.map((item) => item.animate([
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0 0 0)' },
        ], {
          duration: 300,
          delay: morphFromStandard ? 100 : 0,
          easing: 'cubic-bezier(.65, 0, .35, 1)',
          fill: 'both',
        })),
      );
    }
    if (morphToStandard && returnGhost) {
      const outgoing = [
        returnGhost.querySelector<HTMLElement>('.nav-service-separator'),
        returnGhost.querySelector<HTMLElement>('.nav-service-current'),
      ].filter((item): item is HTMLElement => !!item);
      menuMorphAnimations.push(
        ...outgoing.map((item) => item.animate([
          { clipPath: 'inset(0 0 0 0)' },
          { clipPath: 'inset(0 100% 0 0)' },
        ], { duration: 300, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'both' })),
        ...returnIncoming.map((item) => item.animate([
          { clipPath: zeroWidthClip(item) },
          { clipPath: 'inset(0 0 0 0)' },
        ], { duration: 300, delay: 100, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'both' })),
      );
    }
    if (!menuMorphAnimations.length && !servicesLabelAnimation) return;
    if (servicesLabelAnimation) menuMorphAnimations.push(servicesLabelAnimation);
    void Promise.allSettled(menuMorphAnimations.map((item) => item.finished)).then(() => {
      if (!disposed) clearMenuMorph();
    });
  };

  const refreshContrast = () => document.dispatchEvent(new Event('header-indicator:change'));
  const stopAnimation = () => {
    animation?.cancel();
    animation = null;
    delete indicator.dataset.moving;
  };

  let resetSourceMove = () => {};

  const moveServicesToBreadcrumbOrigin = (navigation: NavigationEvent) => {
    resetSourceMove();
    const pages = nav.querySelector<HTMLElement>('.nav-pages:not(.nav-pages--service-detail)');
    const movingLabel = servicesLabel();
    if (!pages || !movingLabel || reducedMotion.matches || !navigation.to.pathname.startsWith('/leistungen/')) return;
    const start = movingLabel.getBoundingClientRect();
    const destination = pages.getBoundingClientRect();
    const x = destination.left - start.left;
    if (Math.abs(x) < .5) return;
    publishIndicatorTravel(x);
    const movement = movingLabel.animate([
      { transform: 'translate3d(0, 0, 0)' },
      { transform: `translate3d(${x}px, 0, 0)` },
    ], {
      duration: 420,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      fill: 'both',
    });
    servicesLabelAnimation = movement;
    servicesMovedOnSource = true;
    const outgoing = [...pages.querySelectorAll<HTMLElement>(':scope > a:not([href="/leistungen"])')];
    sourceMenuAnimations = outgoing.map((item) => item.animate([
      { clipPath: 'inset(0 0 0 0)' },
      { clipPath: zeroWidthClip(item) },
    ], {
      duration: 300,
      easing: 'cubic-bezier(.65, 0, .35, 1)',
      fill: 'both',
    }));
    const follow = () => {
      if (disposed || servicesLabelAnimation !== movement) return;
      positionIndicator(false);
      sourceFollowFrame = requestAnimationFrame(follow);
    };
    sourceFollowFrame = requestAnimationFrame(follow);
    resetSourceMove = () => {
      cancelAnimationFrame(sourceFollowFrame);
      sourceFollowFrame = 0;
      if (servicesLabelAnimation === movement) {
        movement.cancel();
        servicesLabelAnimation = null;
      }
      sourceMenuAnimations.forEach((item) => item.cancel());
      sourceMenuAnimations = [];
      servicesMovedOnSource = false;
    };
  };

  const positionIndicator = (animate: boolean) => {
    if (disposed || !indicatorEnabled) return;
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
    if (animate && underlineBounds && previousBox) {
      publishIndicatorTravel(underlineBounds.left - previousBox.left);
    }
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
        duration: 420,
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
    delete document.documentElement.dataset.headerIndicatorTravel;
    pendingNavigation = navigation;
    servicesReturningToOverview = !!nav.querySelector('.nav-pages--service-detail')
      && navigation.to.pathname === '/leistungen';
    positionIndicator(true);
    moveServicesToBreadcrumbOrigin(navigation);

    const restoreIfCancelled = () => queueMicrotask(() => {
      if (disposed || pendingNavigation !== navigation) return;
      if (!navigation.signal.aborted && !navigation.defaultPrevented) return;
      pendingNavigation = null;
      servicesReturningToOverview = false;
      previousBreadcrumbGhost = null;
      resetSourceMove();
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
    previousServicesLabelBox = servicesLabel()?.getBoundingClientRect() ?? null;
    const pages = nav.querySelector<HTMLElement>('.nav-pages');
    previousMenuWasStandard = pages?.matches?.('.nav-pages:not(.nav-pages--service-detail)') ?? false;
    previousBreadcrumbGhost = servicesReturningToOverview
      ? nav.querySelector<HTMLElement>('.nav-service-breadcrumb')?.cloneNode(true) as HTMLElement | null
      : null;
    disposed = true;
    stopAnimation();
    clearMenuMorph();
    sourceMenuAnimations.forEach((item) => item.cancel());
    sourceMenuAnimations = [];
    abort.abort();
    resize.disconnect();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(sourceFollowFrame);
  };

  const enterFinalMenuState = () => {
    if (disposed) return;
    indicatorEnabled = true;
    positionIndicator(true);
    animateServicesLabel();
    animateMenuMorph();
  };
  // Begin the destination header morph as soon as Astro swaps in the new page.
  // It now runs alongside the swipe reveal instead of waiting for it to finish.
  enterFinalMenuState();
}

initializeNavIndicator();
document.addEventListener('astro:before-swap', () => cleanup());
document.addEventListener('astro:after-swap', initializeNavIndicator);
window.addEventListener('pagehide', () => {
  cleanup();
  resetNavigationMemory();
});
window.addEventListener('pageshow', (event) => {
  if (!(event as PageTransitionEvent).persisted) return;
  resetNavigationMemory();
  initializeNavIndicator();
});
