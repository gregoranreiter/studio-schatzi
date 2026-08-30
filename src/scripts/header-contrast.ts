import { chooseGlyphContrast, composite, imagePoint, type HeaderTone, type RGB } from '../lib/header-contrast';

type CachedImage = { source: string; pixels: ImageData | null };
const imageCache = new WeakMap<HTMLImageElement, CachedImage>();
let cleanup = () => {};

function imagePixels(image: HTMLImageElement): ImageData | null {
  const source = image.currentSrc || image.src;
  const cached = imageCache.get(image);
  if (cached?.source === source) return cached.pixels;
  let pixels: ImageData | null = null;
  try {
    // Sample decoded images already on the page. No extra requests or full-size readbacks.
    const canvas = document.createElement('canvas');
    // Retain enough image detail to distinguish neighbouring letters.
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    }
  } catch {
    // A future cross-origin image may forbid canvas reads. Retain the previous tone.
  }
  imageCache.set(image, { source, pixels });
  return pixels;
}

function rgba(value: string): { color: RGB; alpha: number } | null {
  if (value === 'transparent') return { color: [0, 0, 0], alpha: 0 };
  if (!/^rgba?\(/.test(value)) return null;
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) return null;
  return { color: [channels[0], channels[1], channels[2]], alpha: channels[3] ?? 1 };
}

function initializeHeaderContrast() {
  cleanup();
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;
  const items = [...header.querySelectorAll<HTMLElement>('[data-header-adaptive]')];
  const glyphs = [...header.querySelectorAll<HTMLElement | SVGElement>('[data-header-glyph], [data-nav-indicator]')];
  const abort = new AbortController();
  let frame = 0;
  let disposed = false;

  const update = () => {
    frame = 0;
    if (disposed) return;
    // Reuse geometry and styles across all sample points in this frame.
    const styles = new Map<Element, CSSStyleDeclaration>();
    const rectangles = new Map<Element, DOMRect>();
    const styleFor = (element: Element) => {
      if (!styles.has(element)) styles.set(element, getComputedStyle(element));
      return styles.get(element)!;
    };
    const rectFor = (element: Element) => {
      if (!rectangles.has(element)) rectangles.set(element, element.getBoundingClientRect());
      return rectangles.get(element)!;
    };
    const swipe = document.documentElement.dataset.swipePhase
      ? document.querySelector<HTMLElement>('.page-swipe') : null;

    const sample = (x: number, y: number): { color: RGB; uncertain: boolean } => {
      const layers: Array<{ color: RGB; alpha: number }> = [];
      let uncertain = false;
      if (swipe) {
        const rect = rectFor(swipe);
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          const fill = rgba(styleFor(swipe).backgroundColor);
          if (fill?.alpha === 1) return { color: fill.color, uncertain: false };
        }
      }
      for (const element of document.elementsFromPoint(x, y)) {
        if (header.contains(element) || element.closest('.skip-link')) continue;
        const style = styleFor(element);
        // The current site uses solid fills and <img>. Treat future complex surfaces conservatively.
        if (style.backgroundImage !== 'none') uncertain = true;
        for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
          const ancestorStyle = styleFor(ancestor);
          if (ancestorStyle.filter !== 'none' || Number(ancestorStyle.opacity) < 1) uncertain = true;
        }
        if (element instanceof HTMLImageElement && element.complete && element.naturalWidth) {
          const pixels = imagePixels(element);
          const rect = rectFor(element);
          const point = imagePoint(
            { x: x - rect.left, y: y - rect.top }, rect,
            { width: element.naturalWidth, height: element.naturalHeight },
            style.objectFit, style.objectPosition,
          );
          if (pixels && point) {
            const px = Math.min(pixels.width - 1, Math.floor(point.x / element.naturalWidth * pixels.width));
            const py = Math.min(pixels.height - 1, Math.floor(point.y / element.naturalHeight * pixels.height));
            const index = (py * pixels.width + px) * 4;
            const color: RGB = [pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]];
            const alpha = pixels.data[index + 3] / 255;
            layers.push({ color, alpha });
            if (alpha === 1) break;
          } else if (!pixels) {
            uncertain = true;
          }
        }
        const fill = rgba(style.backgroundColor);
        if (!fill) uncertain = true;
        else if (fill.alpha > 0) {
          layers.push(fill);
          if (fill.alpha === 1) break;
        }
      }
      const color = layers.reverse().reduce<RGB>((back, layer) => composite(layer.color, layer.alpha, back), [255, 255, 255]);
      return { color, uncertain };
    };

    const viewport = { width: innerWidth, height: innerHeight };
    const changes = glyphs.map((glyph) => {
      const previous = glyph.dataset.headerTone as HeaderTone | undefined;
      const { tone } = chooseGlyphContrast(rectFor(glyph), viewport, sample, previous);
      return { glyph, tone, previous };
    });
    // Finish sampling before changing colours, so style writes cannot interrupt the reads.
    for (const { glyph, tone, previous } of changes) {
      if (tone !== previous) glyph.dataset.headerTone = tone;
    }
    if (document.documentElement.dataset.swipePhase || header.querySelector('[data-nav-indicator][data-moving]')) schedule();
  };

  const schedule = () => {
    if (disposed || frame) return;
    frame = requestAnimationFrame(update);
  };

  const options = { passive: true, signal: abort.signal };
  window.addEventListener('scroll', schedule, options);
  window.addEventListener('resize', schedule, options);
  document.addEventListener('load', schedule, { capture: true, signal: abort.signal });
  document.addEventListener('astro:before-preparation', schedule, { signal: abort.signal });
  document.addEventListener('header-indicator:change', schedule, { signal: abort.signal });
  const resize = new ResizeObserver(schedule);
  resize.observe(header);
  for (const item of items) resize.observe(item);
  void document.fonts.ready.then(schedule);
  frame = requestAnimationFrame(update);

  cleanup = () => {
    disposed = true;
    abort.abort();
    resize.disconnect();
    cancelAnimationFrame(frame);
  };
}

initializeHeaderContrast();
document.addEventListener('astro:after-swap', initializeHeaderContrast);
document.addEventListener('astro:page-load', initializeHeaderContrast);
document.addEventListener('astro:before-swap', () => cleanup());
