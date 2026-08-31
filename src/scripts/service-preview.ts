import { placeServicePreview } from '../lib/service-preview';

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
  let lastHeadlineIndex: number | null = null;
  let activeHeadline: HTMLAnchorElement | null = null;
  let headlineAnimation: Animation | null = null;
  let exitingHeadline: HTMLElement | null = null;
  let exitAnimation: Animation | null = null;
  let headlineDirection = 1;
  // Keep both masks synchronized with a quicker version of the page transition's easing.
  const headlineTiming: KeyframeAnimationOptions = {
    duration: 400,
    easing: 'cubic-bezier(.2, .65, .35, 1)',
    fill: 'both',
  };

  const titlePairs = columns.flatMap((column) => {
    const title = column.querySelector<HTMLElement>('h2');
    const headline = column.querySelector<HTMLElement>('.service-column__description');
    return title && headline ? [{ column, title, headline }] : [];
  });
  const positionTitles = () => {
    if (disposed || !hover.matches) return;
    const positions = titlePairs.map(({ title, headline }) => {
      const gap = parseFloat(getComputedStyle(title).fontSize) * 1.5 - 10;
      // Both offsets belong to the overview section and ignore the hover transform.
      const offset = Math.min(0, headline.offsetTop + headline.offsetHeight + gap - title.offsetTop);
      return { title, offset };
    });
    positions.forEach(({ title, offset }) => title.style.setProperty('--service-title-offset', `${offset}px`));
  };
  const titleResize = new ResizeObserver(positionTitles);
  if (header) titleResize.observe(header);
  titlePairs.forEach(({ column, title, headline }) => {
    titleResize.observe(column);
    titleResize.observe(title);
    titleResize.observe(headline);
  });
  positionTitles();

  const stopHeadlineAnimation = () => {
    headlineAnimation?.cancel();
    headlineAnimation = null;
  };
  const stopExitAnimation = () => {
    exitAnimation?.cancel();
    exitAnimation = null;
    if (exitingHeadline) delete exitingHeadline.dataset.headlineExiting;
    exitingHeadline = null;
  };
  const hideHeadline = () => {
    stopHeadlineAnimation();
    stopExitAnimation();
    activeHeadline = null;
  };
  const concealHeadline = (direction: number) => {
    stopExitAnimation();
    const headline = activeHeadline?.querySelector<HTMLElement>('.service-column__description');
    // Retain a partially revealed mask when a quick hover interrupts its entrance.
    const clipPath = headline ? getComputedStyle(headline).clipPath : 'none';
    stopHeadlineAnimation();
    activeHeadline = null;
    if (!headline || disposed || reducedMotion.matches || !hover.matches || document.hidden) return;
    exitingHeadline = headline;
    headline.dataset.headlineExiting = '';
    const animation = headline.animate([
      { clipPath: clipPath === 'none' ? 'inset(0 0 0 0)' : clipPath },
      { clipPath: direction < 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' },
    ], headlineTiming);
    exitAnimation = animation;
    animation.onfinish = () => {
      if (exitAnimation === animation) stopExitAnimation();
    };
  };
  const showHeadline = (column: HTMLAnchorElement, event?: PointerEvent) => {
    if (disposed || !hover.matches || document.hidden || document.documentElement.dataset.swipePhase) return;
    if (activeHeadline === column) return;
    const headline = column.querySelector<HTMLElement>('.service-column__description');
    if (!headline) return;
    const index = columns.indexOf(column);
    let direction = lastHeadlineIndex === null ? 0 : Math.sign(index - lastHeadlineIndex);
    if (!direction && event) {
      direction = Math.sign(event.movementX || 0);
      if (!direction) {
        const bounds = column.getBoundingClientRect();
        direction = event.clientX < bounds.left + bounds.width / 2 ? 1 : -1;
      }
    }
    // Keep the previous column across pointerleave so neighboring entries know the direction.
    concealHeadline(direction || 1);
    lastHeadlineIndex = index;
    activeHeadline = column;
    headlineDirection = direction || 1;
    if (reducedMotion.matches) return;
    // Complementary masks share one sweep; neither text moves or changes opacity.
    const animation = headline.animate([
      { clipPath: direction < 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0 0 0)' },
    ], headlineTiming);
    headlineAnimation = animation;
    animation.onfinish = () => {
      if (headlineAnimation === animation) stopHeadlineAnimation();
    };
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
        showHeadline(underneath);
        void activate(underneath);
      } else hideAll();
      return;
    }
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const top = Math.min(viewportBottom, Math.max(viewportTop, header?.getBoundingClientRect().bottom ?? 0));
    const box = placeServicePreview(pointer, {
      left: viewport?.offsetLeft ?? 0,
      top,
      width: viewport?.width ?? window.innerWidth,
      height: viewportBottom - top,
    });
    if (!box.width || !box.height) { hide(); return; }
    Object.assign(preview.style, {
      width: `${box.width}px`,
      height: `${box.height}px`,
      transform: `translate3d(${box.x}px, ${box.y}px, 0)`,
    });
  };
  const schedule = () => {
    if (!active || disposed || frame) return;
    frame = requestAnimationFrame(position);
  };
  const activate = async (column: HTMLAnchorElement) => {
    if (disposed || !hover.matches || document.hidden || document.documentElement.dataset.swipePhase) return;
    if (active?.column === column) return;
    hide();
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
    showHeadline(column, event);
    pointer = { x: event.clientX, y: event.clientY };
    void activate(column);
    schedule();
  };

  const options = { passive: true, signal: abort.signal };
  for (const column of columns) {
    column.addEventListener('pointerenter', (event) => follow(event, column), options);
    column.addEventListener('pointermove', (event) => follow(event, column), options);
    column.addEventListener('pointerleave', (event) => {
      hide();
      const next = relatedColumn(event.relatedTarget);
      if (next) showHeadline(next, event);
      else if (!showFocusedHeadline()) concealHeadline(Math.sign(event.movementX) || headlineDirection);
    }, options);
    column.addEventListener('pointercancel', hideAll, options);
    column.addEventListener('focus', showFocusedHeadline, options);
    column.addEventListener('blur', (event) => {
      if (activeHeadline !== column || document.querySelector('.service-column:hover')) return;
      const next = relatedColumn(event.relatedTarget);
      if (next) showHeadline(next);
      else concealHeadline(headlineDirection);
    }, options);
  }
  window.addEventListener('resize', schedule, options);
  window.addEventListener('scroll', schedule, { ...options, capture: true });
  window.visualViewport?.addEventListener('resize', schedule, options);
  window.visualViewport?.addEventListener('scroll', schedule, options);
  window.addEventListener('blur', hideAll, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideAll(); }, options);
  document.addEventListener('keydown', hide, { signal: abort.signal });
  document.addEventListener('astro:before-preparation', hideAll, { signal: abort.signal });
  hover.addEventListener('change', () => { hideAll(); lastHeadlineIndex = null; warmCovers(); positionTitles(); }, options);
  reducedMotion.addEventListener('change', () => { stopHeadlineAnimation(); stopExitAnimation(); rotate(); }, options);
  warmCovers();

  cleanup = () => {
    disposed = true;
    hideAll();
    abort.abort();
    titleResize.disconnect();
  };
}

initializeServicePreview();
document.addEventListener('astro:page-load', initializeServicePreview);
document.addEventListener('astro:before-swap', () => cleanup());
