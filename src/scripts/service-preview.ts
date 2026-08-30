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

  const titlePairs = columns.flatMap((column) => {
    const title = column.querySelector<HTMLElement>('h2');
    const headline = column.querySelector<HTMLElement>('.service-column__description');
    return title && headline ? [{ column, title, headline }] : [];
  });
  const positionTitles = () => {
    if (disposed || !hover.matches) return;
    const positions = titlePairs.map(({ title, headline }) => {
      const gap = parseFloat(getComputedStyle(title).fontSize) * 1.5;
      // Both offsets belong to the overview section and ignore the hover transform.
      const offset = Math.min(0, headline.offsetTop + headline.offsetHeight + gap - title.offsetTop);
      return { title, offset };
    });
    positions.forEach(({ title, offset }) => title.style.setProperty('--service-title-offset', `${offset}px`));
  };
  const titleResize = new ResizeObserver(positionTitles);
  titlePairs.forEach(({ column, title, headline }) => {
    titleResize.observe(column);
    titleResize.observe(title);
    titleResize.observe(headline);
  });
  positionTitles();

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
      if (underneath && columnCovers.has(underneath)) void activate(underneath);
      else hide();
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
    if (event.pointerType === 'touch' || !hover.matches) { hide(); return; }
    pointer = { x: event.clientX, y: event.clientY };
    void activate(column);
    schedule();
  };

  const options = { passive: true, signal: abort.signal };
  for (const column of columns) {
    column.addEventListener('pointerenter', (event) => follow(event, column), options);
    column.addEventListener('pointermove', (event) => follow(event, column), options);
    column.addEventListener('pointerleave', hide, options);
    column.addEventListener('pointercancel', hide, options);
  }
  window.addEventListener('resize', schedule, options);
  window.addEventListener('scroll', schedule, { ...options, capture: true });
  window.visualViewport?.addEventListener('resize', schedule, options);
  window.visualViewport?.addEventListener('scroll', schedule, options);
  window.addEventListener('blur', hide, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); }, options);
  document.addEventListener('keydown', hide, { signal: abort.signal });
  document.addEventListener('astro:before-preparation', hide, { signal: abort.signal });
  hover.addEventListener('change', () => { hide(); warmCovers(); positionTitles(); }, options);
  reducedMotion.addEventListener('change', rotate, options);
  warmCovers();

  cleanup = () => {
    disposed = true;
    hide();
    abort.abort();
    titleResize.disconnect();
  };
}

initializeServicePreview();
document.addEventListener('astro:page-load', initializeServicePreview);
document.addEventListener('astro:before-swap', () => cleanup());
