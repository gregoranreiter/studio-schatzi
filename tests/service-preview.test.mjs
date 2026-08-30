import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { placeServicePreview } from '../src/lib/service-preview.ts';

test('a smaller cover stays 16px from the pointer and flips at the right and bottom edges', () => {
  const viewport = { left: 0, top: 72, width: 934, height: 774 };
  const center = placeServicePreview({ x: 200, y: 300 }, viewport);
  assert.equal(center.x, 216);
  assert.equal(center.y, 316);
  assert.ok(Math.abs(center.width - 336.24 * .7) < 1e-9, 'The preview is 30% narrower than its previous size');
  assert.ok(Math.abs(center.width / center.height - 4 / 3) < 1e-9);
  const edge = placeServicePreview({ x: 920, y: 830 }, viewport);
  assert.equal(edge.x + edge.width, 904);
  assert.equal(edge.y + edge.height, 814);
});

test('all corners stay inside resized and zoomed viewports, including very short windows', () => {
  for (const viewport of [
    { left: 0, top: 72, width: 1174, height: 774 },
    { left: 0, top: 72, width: 320, height: 160 },
    { left: 80, top: 100, width: 260, height: 190 },
    { left: 0, top: 72, width: 200, height: 30 },
  ]) {
    for (const x of [viewport.left, viewport.left + viewport.width / 2, viewport.left + viewport.width]) {
      for (const y of [viewport.top, viewport.top + viewport.height / 2, viewport.top + viewport.height]) {
        const box = placeServicePreview({ x, y }, viewport);
        assert.ok(box.x >= viewport.left - 1e-9);
        assert.ok(box.y >= viewport.top - 1e-9);
        assert.ok(box.x + box.width <= viewport.left + viewport.width + 1e-9);
        assert.ok(box.y + box.height <= viewport.top + viewport.height + 1e-9);
        if (!box.width) {
          assert.equal(box.height, 0, 'Hide the preview when there is no room for the cursor gap');
          continue;
        }
        assert.ok(Math.abs(Math.min(Math.abs(box.x - x), Math.abs(box.x + box.width - x)) - 16) < 1e-9);
        assert.ok(Math.abs(Math.min(Math.abs(box.y - y), Math.abs(box.y + box.height - y)) - 16) < 1e-9);
        assert.ok(Math.abs(box.width / box.height - 4 / 3) < 1e-9);
      }
    }
  }
});

function createPreviewEnvironment({ ready = true, canHover = true, reduced = false, width = 934 } = {}) {
  const document = new EventTarget();
  const window = new EventTarget();
  const hover = Object.assign(new EventTarget(), { matches: canHover });
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const viewport = Object.assign(new EventTarget(), { offsetLeft: 0, offsetTop: 0, width, height: 846 });
  const frames = new Map();
  const timers = new Map();
  const resizeObservers = new Set();
  const decodes = new Map();
  const slugs = ['matte', 'gretzl', 'koa', 'chrispi'];
  const covers = slugs.map((slug) => {
    let resolve;
    let reject;
    const decoded = ready ? Promise.resolve() : new Promise((yes, no) => { resolve = yes; reject = no; });
    decodes.set(slug, { resolve, reject });
    return { dataset: { previewCover: slug, src: `/${slug}.jpg` }, hidden: true, decode: () => decoded };
  });
  const columns = [['matte', 'gretzl'], ['koa', 'chrispi'], ['gretzl', 'matte'], ['chrispi', 'koa']]
    .map((projects) => {
      const title = {
        offsetTop: 780, offsetHeight: 30, fontSize: '24px',
        style: { setProperty(name, value) { this[name] = value; } },
      };
      const headline = { offsetTop: 120, offsetHeight: 240 };
      return Object.assign(new EventTarget(), {
        dataset: { serviceProjects: JSON.stringify(projects) },
        title, headline,
        querySelector: (selector) => selector === 'h2' ? title : headline,
      });
    });
  const preview = { hidden: true, style: {}, querySelectorAll: () => covers };
  let hit = null;
  let frameId = 0;
  let timerId = 0;
  let time = 0;
  document.documentElement = { dataset: {} };
  document.hidden = false;
  document.querySelector = (selector) => selector === '[data-service-preview]'
    ? preview : { getBoundingClientRect: () => ({ bottom: 72 }) };
  document.querySelectorAll = () => columns;
  document.elementFromPoint = () => ({ closest: () => hit });
  window.innerWidth = viewport.width;
  window.innerHeight = viewport.height;
  window.visualViewport = viewport;
  window.matchMedia = (query) => {
    if (query.includes('reduced-motion')) return motion;
    const minimum = query.match(/min-width:\s*(\d+)px/);
    hover.matches = canHover && (!minimum || width >= Number(minimum[1]));
    return hover;
  };
  window.setInterval = (callback, delay) => {
    timers.set(++timerId, { callback, delay, next: time + delay });
    return timerId;
  };
  window.clearInterval = (id) => timers.delete(id);
  const source = readFileSync(new URL('../src/scripts/service-preview.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(compiled.outputText, {
    exports: {}, require: () => ({ placeServicePreview }), document, window,
    AbortController: class extends AbortController {
      constructor() { super(); setMaxListeners(0, this.signal); }
    },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; this.targets = new Set(); resizeObservers.add(this); }
      observe(target) { this.targets.add(target); }
      disconnect() { resizeObservers.delete(this); }
    },
    getComputedStyle: (element) => ({ fontSize: element.fontSize }),
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  const move = (index, { x = 120, y = 300, pointerType = 'mouse', type = 'pointermove' } = {}) => {
    hit = columns[index];
    columns[index].dispatchEvent(Object.assign(new Event(type), { clientX: x, clientY: y, pointerType }));
  };
  const flush = async () => {
    await new Promise(setImmediate);
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback());
    await new Promise(setImmediate);
  };
  const advance = (milliseconds) => {
    const end = time + milliseconds;
    while (timers.size) {
      const [id, timer] = [...timers.entries()].sort((a, b) => a[1].next - b[1].next)[0];
      if (timer.next > end) break;
      time = timer.next;
      timer.callback();
      if (timers.has(id)) timer.next += timer.delay;
    }
    time = end;
  };
  const visible = () => covers.filter((image) => !image.hidden).map((image) => image.dataset.previewCover);
  return { document, window, viewport, hover, motion, columns, covers, decodes, preview, timers, frames, resizeObservers,
    resize: () => resizeObservers.forEach((observer) => observer.callback()),
    move, flush, advance, visible, setHit: (index) => { hit = columns[index] ?? null; } };
}

test('hover title stays just below its headline after text reflow and stops measuring on navigation', () => {
  const { columns, resize, resizeObservers, document } = createPreviewEnvironment();
  const { title, headline } = columns[1];
  const gap = () => title.offsetTop + parseFloat(title.style['--service-title-offset']) - headline.offsetTop - headline.offsetHeight;
  assert.ok(gap() >= 20 && gap() <= 35, 'Leave a little breathing room beneath the headline');

  headline.offsetHeight += 90;
  title.offsetTop -= 60;
  resize();
  assert.ok(gap() >= 20 && gap() <= 35, 'Keep the gap after wrapping or viewport changes');
  assert.ok(parseFloat(title.style['--service-title-offset']) < 0);

  headline.offsetHeight = 1000;
  resize();
  assert.equal(title.style['--service-title-offset'], '0px', 'Never push a title below its resting position');
  document.dispatchEvent(new Event('astro:before-swap'));
  assert.equal(resizeObservers.size, 0);
});

test('hover shows the referenced covers, cuts every 500ms, and follows the pointer without easing', async () => {
  const { preview, timers, move, flush, advance, visible } = createPreviewEnvironment();
  move(0, { type: 'pointerenter' });
  await flush();
  assert.equal(preview.hidden, false);
  assert.deepEqual(visible(), ['matte']);
  assert.equal(preview.style.transform, 'translate3d(136px, 316px, 0)');
  assert.equal(timers.size, 1);
  advance(499);
  assert.deepEqual(visible(), ['matte']);
  advance(1);
  assert.deepEqual(visible(), ['gretzl']);
  advance(500);
  assert.deepEqual(visible(), ['matte']);
  move(0, { x: 220, y: 350 });
  await flush();
  assert.equal(preview.style.transform, 'translate3d(236px, 366px, 0)');
});

test('changing services resets the first cover and replaces the old timer', async () => {
  const { move, flush, advance, visible, timers } = createPreviewEnvironment();
  move(0);
  await flush();
  advance(500);
  move(1);
  await flush();
  assert.deepEqual(visible(), ['koa']);
  assert.equal(timers.size, 1);
  advance(500);
  assert.deepEqual(visible(), ['chrispi']);
});

test('resize reclamps at the last pointer position and scrolling updates the service underneath', async () => {
  const { viewport, window, preview, move, flush, setHit, visible, timers } = createPreviewEnvironment();
  move(0, { x: 900, y: 800 });
  await flush();
  const original = preview.style.transform;
  viewport.width = 650;
  viewport.height = 500;
  viewport.dispatchEvent(new Event('resize'));
  await flush();
  assert.notEqual(preview.style.transform, original);
  const [x, y] = preview.style.transform.match(/-?[\d.]+px/g).map(parseFloat);
  assert.ok(x + parseFloat(preview.style.width) <= 650);
  assert.ok(y + parseFloat(preview.style.height) <= 500);
  setHit(2);
  window.dispatchEvent(new Event('scroll'));
  await flush();
  assert.deepEqual(visible(), ['gretzl']);
  setHit(-1);
  window.dispatchEvent(new Event('scroll'));
  await flush();
  assert.equal(preview.hidden, true);
  assert.equal(timers.size, 0);
});

test('leaving, changing tabs, keyboard input, and page navigation hide the box and stop rotation', async () => {
  const { document, preview, columns, move, flush, timers, frames } = createPreviewEnvironment();
  move(0);
  await flush();
  columns[0].dispatchEvent(new Event('pointerleave'));
  assert.equal(preview.hidden, true);
  assert.equal(timers.size, 0);
  move(0);
  await flush();
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(timers.size, 0);
  document.hidden = false;
  move(0);
  await flush();
  document.dispatchEvent(new Event('keydown'));
  assert.equal(preview.hidden, true);
  move(0);
  await flush();
  document.dispatchEvent(new Event('astro:before-preparation'));
  assert.equal(preview.hidden, true);
  move(0);
  await flush();
  document.dispatchEvent(new Event('astro:before-swap'));
  assert.equal(preview.hidden, true);
  assert.equal(timers.size, 0);
  assert.equal(frames.size, 0);
  move(0);
  await flush();
  assert.equal(preview.hidden, true, 'Disposed listeners cannot reactivate the preview');
  document.dispatchEvent(new Event('astro:page-load'));
  move(0);
  await flush();
  assert.equal(preview.hidden, false);
  assert.equal(timers.size, 1, 'Returning to services must create only one timer');
});

test('reduced motion keeps a still cover and touch input does not display a hover preview', async () => {
  const { motion, preview, timers, move, flush, visible, advance } = createPreviewEnvironment({ reduced: true });
  move(0);
  await flush();
  advance(2000);
  assert.deepEqual(visible(), ['matte']);
  assert.equal(timers.size, 0);
  motion.matches = false;
  motion.dispatchEvent(new Event('change'));
  advance(500);
  assert.deepEqual(visible(), ['gretzl']);
  move(0, { pointerType: 'touch' });
  await flush();
  assert.equal(preview.hidden, true);
  assert.equal(timers.size, 0);
  const touch = createPreviewEnvironment({ canHover: false });
  touch.move(0, { pointerType: 'touch' });
  await touch.flush();
  assert.ok(touch.covers.every((image) => image.src === undefined), 'Touch-only devices do not download hover covers');
});

test('narrow windows use inline galleries even with a mouse, and switching layouts stops the overlay', async () => {
  const narrow = createPreviewEnvironment({ width: 600 });
  narrow.move(0);
  await narrow.flush();
  assert.equal(narrow.preview.hidden, true);
  assert.equal(narrow.timers.size, 0);
  assert.ok(narrow.covers.every((image) => image.src === undefined));

  const desktop = createPreviewEnvironment();
  desktop.move(0);
  await desktop.flush();
  assert.equal(desktop.preview.hidden, false);
  desktop.hover.matches = false;
  desktop.hover.dispatchEvent(new Event('change'));
  desktop.advance(1000);
  assert.equal(desktop.preview.hidden, true);
  assert.equal(desktop.timers.size, 0);
  desktop.move(0);
  await desktop.flush();
  assert.equal(desktop.preview.hidden, true);

  desktop.hover.matches = true;
  desktop.hover.dispatchEvent(new Event('change'));
  desktop.move(1);
  await desktop.flush();
  assert.deepEqual(desktop.visible(), ['koa']);
  assert.equal(desktop.timers.size, 1);
});

test('late image decoding cannot show a previous service or revive a disposed preview', async () => {
  const { document, decodes, preview, move, flush, visible, timers } = createPreviewEnvironment({ ready: false });
  move(0);
  move(1);
  decodes.get('matte').resolve();
  decodes.get('gretzl').resolve();
  await flush();
  assert.equal(preview.hidden, true);
  decodes.get('koa').resolve();
  decodes.get('chrispi').resolve();
  await flush();
  assert.deepEqual(visible(), ['koa']);
  assert.equal(timers.size, 1);
  document.dispatchEvent(new Event('astro:before-swap'));

  const pending = createPreviewEnvironment({ ready: false });
  pending.move(0);
  pending.document.dispatchEvent(new Event('astro:before-swap'));
  pending.decodes.get('matte').resolve();
  pending.decodes.get('gretzl').resolve();
  await pending.flush();
  assert.equal(pending.preview.hidden, true);
  assert.equal(pending.timers.size, 0);
});

test('failed covers are skipped without showing broken images', async () => {
  const { decodes, move, flush, visible, timers, preview } = createPreviewEnvironment({ ready: false });
  move(0);
  decodes.get('matte').reject(new Error('missing image'));
  decodes.get('gretzl').resolve();
  await flush();
  assert.deepEqual(visible(), ['gretzl']);
  assert.equal(timers.size, 0);
  move(1);
  decodes.get('koa').reject(new Error('missing image'));
  decodes.get('chrispi').reject(new Error('missing image'));
  await flush();
  assert.equal(preview.hidden, true);
});

test('no visible space hides the preview instead of showing an empty box', async () => {
  const { viewport, preview, move, flush, timers } = createPreviewEnvironment();
  move(0);
  await flush();
  assert.equal(preview.hidden, false);
  viewport.height = 72;
  viewport.dispatchEvent(new Event('resize'));
  await flush();
  assert.equal(preview.hidden, true);
  assert.equal(timers.size, 0);
});
