import { placeServicePreview } from '../lib/service-preview';
import { createPhysicalMotion } from '../lib/physical-motion';

let cleanup = () => {};

function initializeServicePreview() {
  cleanup();
  const preview = document.querySelector<HTMLElement>('[data-service-preview]');
  if (!preview) return;

  const columns = [...document.querySelectorAll<HTMLAnchorElement>('[data-service-projects]')];
  const header = document.querySelector<HTMLElement>('.site-header');
  const covers = [...preview.querySelectorAll<HTMLImageElement>('[data-preview-cover]')];
  const coverBySlug = new Map(covers.map((image) => [image.dataset.previewCover, image]));
  const columnCovers = new Map(columns.map((column) => [column,
    (JSON.parse(column.dataset.serviceProjects ?? '[]') as string[])
      .map((slug) => coverBySlug.get(slug))
      .filter((image): image is HTMLImageElement => Boolean(image)),
  ]));
  // Small screens and touch-first devices use inline project galleries instead.
  const hover = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const loading = new Map<HTMLImageElement, Promise<boolean>>();
  let active: { column: HTMLAnchorElement; images: HTMLImageElement[]; index: number } | null = null;
  let pointer: { x: number; y: number } | null = null;
  let timer = 0;
  let frame = 0;
  let disposed = false;
  let activeHeadline: HTMLAnchorElement | null = null;
  let exitingHeadline: HTMLElement | null = null;
  let headlineDirection = 0;
  let headlineOrigin = .5;
  const physics = createPhysicalMotion({
    request: (callback) => window.requestAnimationFrame(callback),
    cancel: (id) => window.cancelAnimationFrame(id),
  });
  const masks = new Map<HTMLElement, { left: number; right: number }>();
  let outgoingMask = { left: 0, right: 1 };
  let incomingMask = { left: .5, right: .5 };
  let headlineWidth = 1;
  let swipeRunning = false;

  const titlePairs = columns.flatMap((column) => {
    const title = column.querySelector<HTMLElement>('h2');
    const headline = column.querySelector<HTMLElement>('.service-column__description');
    if (!title || !headline) return [];
    let position = 0;
    let stretch = 0;
    const renderTitle = () => {
      const scaleY = 1 + stretch;
      title.style.transform = hover.matches
        ? `translate3d(0, ${position}px, 0) scale(${1 / Math.sqrt(scaleY)}, ${scaleY})`
        : '';
    };
    const material = physics.value(0, { frequency: 30, damping: .55, precision: .0001 }, (value) => {
      stretch = value;
      renderTitle();
    });
    material.bounds(-.045, .035);
    const motion = physics.value(0, { frequency: 36, damping: .72, launch: .65 }, (y, velocity, impact) => {
      position = y;
      // A slight stretch follows the pull; the floor impact briefly compresses it.
      material.to(Math.min(.03, Math.abs(velocity) / 100000));
      // Only the floor landing compresses the title; pickup stops cleanly at the top.
      if (impact && y >= -.5) material.kick(-Math.min(2.4, impact / 1100));
      renderTitle();
    });
    motion.snap(0);
    return [{ column, title, headline, motion, material, offset: 0 }];
  });
  const syncTitles = (immediate = false) => {
    titlePairs.forEach(({ column, motion, material, offset }) => {
      if (hover.matches) column.dataset.servicePhysics = '';
      else delete column.dataset.servicePhysics;
      const target = hover.matches && activeHeadline === column ? offset : 0;
      if (immediate || reducedMotion.matches || !hover.matches) {
        motion.snap(target);
        material.snap(0);
      } else if (activeHeadline === column) motion.to(target);
      else motion.drop(0, { gravity: 17500, restitution: .24 });
    });
  };
  const positionTitles = () => {
    if (disposed || !hover.matches) return;
    titlePairs.forEach((pair) => {
      const { title, headline, motion } = pair;
      const gap = parseFloat(getComputedStyle(title).fontSize) * 1.5 - 10;
      // Both offsets belong to the overview section and ignore the hover transform.
      pair.offset = Math.min(0, headline.offsetTop + headline.offsetHeight + gap - title.offsetTop);
      headlineWidth = Math.max(1, headline.offsetWidth);
      title.style.setProperty('--service-title-offset', `${pair.offset}px`);
      // Pickup stops exactly at its destination; only the floor has a rebound.
      motion.bounds(pair.offset, 0);
    });
    syncTitles();
  };
  const titleResize = new ResizeObserver(positionTitles);
  if (header) titleResize.observe(header);
  titlePairs.forEach(({ column, title, headline }) => {
    titleResize.observe(column);
    titleResize.observe(title);
    titleResize.observe(headline);
  });
  positionTitles();

  const setMask = (headline: HTMLElement, left: number, right: number) => {
    masks.set(headline, { left, right });
    headline.style.clipPath = `inset(0 ${Math.max(0, 1 - right) * 100}% 0 ${Math.max(0, left) * 100}%)`;
  };
  const clearExit = () => {
    if (exitingHeadline) {
      delete exitingHeadline.dataset.headlineExiting;
      exitingHeadline.style.clipPath = '';
      masks.delete(exitingHeadline);
    }
    exitingHeadline = null;
  };
  const columnOrigin = (column: HTMLAnchorElement | null) => {
    const headline = column?.querySelector<HTMLElement>('.service-column__description');
    if (!column || !headline) return .5;
    const columnBounds = column.getBoundingClientRect();
    const headlineBounds = headline.getBoundingClientRect();
    // The headline spans the page, so account for its gutters rather than using 50%.
    return Math.max(0, Math.min(1,
      (columnBounds.left + columnBounds.width / 2 - headlineBounds.left) / Math.max(1, headlineBounds.width)));
  };
  const columnStartOrigin = (column: HTMLAnchorElement) => {
    const headline = column.querySelector<HTMLElement>('.service-column__description');
    if (!headline) return columnOrigin(column);
    const columnBounds = column.getBoundingClientRect();
    const headlineBounds = headline.getBoundingClientRect();
    return Math.max(0, Math.min(1,
      (columnBounds.left - headlineBounds.left) / Math.max(1, headlineBounds.width)));
  };
  const renderSwipe = (progress: number) => {
    if (!swipeRunning) return;
    const gap = 20 / headlineWidth;
    const edge = progress * (1 + gap);
    const incoming = activeHeadline?.querySelector<HTMLElement>('.service-column__description');
    if (headlineDirection === 0) {
      if (exitingHeadline) {
        // Collapse only what is visible, including a reveal interrupted before completion.
        const origin = Math.max(outgoingMask.left, Math.min(outgoingMask.right, headlineOrigin));
        setMask(exitingHeadline,
          outgoingMask.left + (origin - outgoingMask.left) * progress,
          outgoingMask.right + (origin - outgoingMask.right) * progress);
      }
      if (incoming) {
        if (Math.abs(incomingMask.right - incomingMask.left) < .000001) {
          // A fresh reveal grows by the same physical distance on both sides,
          // keeping its visual center fixed on the requested origin.
          const origin = incomingMask.left;
          const farEdge = Math.max(origin, 1 - origin);
          const radius = farEdge * progress;
          setMask(incoming, Math.max(0, origin - radius), Math.min(1, origin + radius));
        } else {
          // Re-entry catches the existing partial mask instead of resetting it.
          setMask(incoming, incomingMask.left * (1 - progress),
            incomingMask.right + (1 - incomingMask.right) * progress);
        }
      }
    } else {
      // Both masks use one body, so the yellow strip cannot collapse or drift apart.
      if (exitingHeadline) {
        setMask(exitingHeadline,
          headlineDirection < 0 ? outgoingMask.left : Math.max(outgoingMask.left, edge),
          headlineDirection < 0 ? Math.min(outgoingMask.right, 1 - edge) : outgoingMask.right);
      }
      if (incoming) {
        setMask(incoming, headlineDirection < 0 ? Math.max(0, 1 - edge + gap) : 0,
          headlineDirection < 0 ? 1 : Math.max(0, edge - gap));
      }
    }
    if (progress === 1) {
      swipeRunning = false;
      clearExit();
      if (incoming) setMask(incoming, 0, 1);
    }
  };
  const swipe = physics.value(0, { frequency: 24, damping: 1, launch: 1, precision: .001 }, renderSwipe);
  swipe.bounds(0, 1);
  const hideHeadline = () => {
    swipeRunning = false;
    swipe.stop();
    clearExit();
    titlePairs.forEach(({ headline }) => {
      delete headline.dataset.headlineActive;
      headline.style.clipPath = '';
    });
    masks.clear();
    activeHeadline = null;
    syncTitles(true);
  };
  const startSwipe = (column: HTMLAnchorElement | null, direction: number, origin = columnOrigin(column ?? activeHeadline)) => {
    const previous = activeHeadline?.querySelector<HTMLElement>('.service-column__description');
    const incoming = column?.querySelector<HTMLElement>('.service-column__description');
    headlineOrigin = origin;
    // Catch an unfinished close in place when returning to the same service.
    incomingMask = incoming && incoming === exitingHeadline
      ? { ...masks.get(incoming) ?? { left: headlineOrigin, right: headlineOrigin } }
      : { left: headlineOrigin, right: headlineOrigin };
    clearExit();
    outgoingMask = previous ? { ...masks.get(previous) ?? { left: 0, right: 1 } } : { left: 0, right: 1 };
    if (previous) delete previous.dataset.headlineActive;
    activeHeadline = column;
    if (incoming) incoming.dataset.headlineActive = '';
    headlineDirection = direction;
    swipeRunning = false;
    swipe.snap(0);
    if (reducedMotion.matches || !hover.matches || document.hidden || disposed) {
      if (previous) { previous.style.clipPath = ''; masks.delete(previous); }
      if (incoming) setMask(incoming, 0, 1);
    } else {
      exitingHeadline = previous ?? null;
      if (exitingHeadline) exitingHeadline.dataset.headlineExiting = '';
      swipeRunning = true;
      renderSwipe(0);
      swipe.to(1);
    }
    syncTitles();
  };
  const concealHeadline = (origin = columnOrigin(activeHeadline)) => startSwipe(null, 0, origin);
  const showHeadline = (column: HTMLAnchorElement, pointerEntry = false) => {
    if (disposed || !hover.matches || document.hidden || document.documentElement.dataset.swipePhase) return;
    if (activeHeadline === column) return;
    const headline = column.querySelector<HTMLElement>('.service-column__description');
    if (!headline) return;
    // Only a direct change of service supplies a meaningful left/right direction.
    const direction = activeHeadline ? Math.sign(columns.indexOf(column) - columns.indexOf(activeHeadline)) : 0;
    // Pointer entry is passed explicitly because :hover may not be updated yet
    // when pointerenter fires. Keyboard focus retains the center fallback.
    const origin = direction === 0 && pointerEntry ? columnStartOrigin(column) : columnOrigin(column);
    startSwipe(column, direction, origin);
  };
  const showFocusedHeadline = () => {
    const focused = document.querySelector<HTMLAnchorElement>('.service-column:focus-visible');
    if (!focused || document.querySelector('.service-column:hover')) return false;
    showHeadline(focused);
    return true;
  };
  const relatedColumn = (target: EventTarget | null) => {
    const column = (target as Element | null)?.closest?.<HTMLAnchorElement>('[data-service-projects]');
    return column && columnCovers.has(column) ? column : null;
  };

  const load = (image: HTMLImageElement) => {
    if (!loading.has(image)) {
      image.src = image.dataset.src!;
      loading.set(image, image.decode().then(() => true, () => false));
    }
    return loading.get(image)!;
  };
  const warmCovers = () => {
    if (hover.matches) covers.forEach((image) => void load(image));
  };
  let previewBox: ReturnType<typeof placeServicePreview> | null = null;
  const imageX = physics.value(0, { frequency: 22, damping: .82, precision: .15 }, (x) => {
    if (previewBox) preview.style.transform = `translate3d(${x}px, ${previewBox.y}px, 0)`;
  });
  const stopRotation = () => {
    window.clearInterval(timer);
    timer = 0;
  };
  const hide = () => {
    active = null;
    preview.hidden = true;
    stopRotation();
    cancelAnimationFrame(frame);
    frame = 0;
    imageX.stop();
    previewBox = null;
  };
  const hideAll = () => { hide(); hideHeadline(); };
  const showImage = () => {
    const selected = active?.images[active.index];
    covers.forEach((image) => { image.hidden = image !== selected; });
  };
  const rotate = () => {
    stopRotation();
    if (!active || active.images.length < 2 || reducedMotion.matches) return;
    timer = window.setInterval(() => {
      if (!active) return;
      active.index = (active.index + 1) % active.images.length;
      showImage();
    }, 500);
  };

  const position = () => {
    frame = 0;
    if (!pointer || !active || disposed) return;
    // Scrolling or resizing can move another service (or the header) under the cursor.
    const underneath = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLAnchorElement>('[data-service-projects]');
    if (underneath !== active.column) {
      if (underneath && columnCovers.has(underneath)) {
        showHeadline(underneath, true);
        void activate(underneath);
      } else hideAll();
      return;
    }
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const top = Math.min(viewportBottom, Math.max(viewportTop, header?.getBoundingClientRect().bottom ?? 0));
    const left = viewport?.offsetLeft ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const box = placeServicePreview(pointer, {
      left,
      top,
      width,
      height: viewportBottom - top,
    });
    if (!box.width || !box.height) { hide(); return; }
    Object.assign(preview.style, {
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
    const initial = !previewBox;
    previewBox = box;
    imageX.bounds(left, left + width - box.width);
    if (initial || reducedMotion.matches) imageX.snap(box.x);
    else {
      imageX.to(box.x);
      // Viewport height changes apply immediately; only X has inertia.
      preview.style.transform = `translate3d(${imageX.value}px, ${box.y}px, 0)`;
    }
  };
  const schedule = () => {
    if (!active || disposed || frame) return;
    frame = requestAnimationFrame(position);
  };
  const activate = async (column: HTMLAnchorElement) => {
    if (disposed || !hover.matches || document.hidden || document.documentElement.dataset.swipePhase) return;
    if (active?.column === column) return;
    stopRotation();
    cancelAnimationFrame(frame);
    frame = 0;
    const candidates = columnCovers.get(column) ?? [];
    const selection = { column, images: [] as HTMLImageElement[], index: 0 };
    active = selection;
    // Decode first so each 500ms cut replaces one complete image with another.
    const ready = await Promise.all(candidates.map(load));
    if (disposed || active !== selection) return;
    selection.images = candidates.filter((_, index) => ready[index]);
    if (!selection.images.length) { hide(); return; }
    cancelAnimationFrame(frame);
    position();
    if (active !== selection) return;
    showImage();
    preview.hidden = false;
    rotate();
  };
  const follow = (event: PointerEvent, column: HTMLAnchorElement) => {
    if (event.pointerType === 'touch' || !hover.matches) { hideAll(); return; }
    showHeadline(column, true);
    pointer = { x: event.clientX, y: event.clientY };
    void activate(column);
    schedule();
  };

  const options = { passive: true, signal: abort.signal };
  for (const column of columns) {
    column.addEventListener('pointerenter', (event) => follow(event, column), options);
    column.addEventListener('pointermove', (event) => follow(event, column), options);
    column.addEventListener('pointerleave', (event) => {
      const next = relatedColumn(event.relatedTarget);
      if (next) showHeadline(next, true);
      else {
        hide();
        if (!showFocusedHeadline()) concealHeadline(columnStartOrigin(column));
      }
    }, options);
    column.addEventListener('pointercancel', hideAll, options);
    column.addEventListener('focus', showFocusedHeadline, options);
    column.addEventListener('blur', (event) => {
      if (activeHeadline !== column || document.querySelector('.service-column:hover')) return;
      const next = relatedColumn(event.relatedTarget);
      if (next) showHeadline(next);
      else concealHeadline();
    }, options);
  }
  window.addEventListener('resize', schedule, options);
  window.addEventListener('scroll', schedule, { ...options, capture: true });
  window.visualViewport?.addEventListener('resize', schedule, options);
  window.visualViewport?.addEventListener('scroll', schedule, options);
  window.addEventListener('blur', hideAll, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideAll(); }, options);
  document.addEventListener('keydown', hide, { signal: abort.signal });
  hover.addEventListener('change', () => { hideAll(); warmCovers(); positionTitles(); }, options);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      swipe.snap(1);
      syncTitles(true);
      if (previewBox) imageX.snap(previewBox.x);
    }
    rotate();
  }, options);
  warmCovers();

  cleanup = () => {
    disposed = true;
    hideAll();
    physics.dispose();
    columns.forEach((column) => { delete column.dataset.servicePhysics; });
    titlePairs.forEach(({ title }) => { title.style.transform = ''; });
    abort.abort();
    titleResize.disconnect();
  };
}

initializeServicePreview();
document.addEventListener('astro:page-load', initializeServicePreview);
document.addEventListener('astro:before-swap', () => cleanup());
