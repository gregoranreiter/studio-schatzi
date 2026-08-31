import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { placeServicePreview } from '../src/lib/service-preview.ts';

test('the cover follows horizontally with a 32px cursor gap and stays flush with the viewport bottom', () => {
  const viewport = { left: 0, top: 72, width: 934, height: 774 };
  const center = placeServicePreview({ x: 200, y: 300 }, viewport);
  assert.equal(center.x, 232);
  assert.equal(center.y + center.height, 846);
  assert.ok(Math.abs(center.width - 336.24 * .7) < 1e-9, 'The preview is 30% narrower than its previous size');
  assert.ok(Math.abs(center.width / center.height - 4 / 3) < 1e-9);
  const edge = placeServicePreview({ x: 920, y: 830 }, viewport);
  assert.equal(edge.x + edge.width, 888);
  assert.equal(edge.y, center.y, 'Horizontal movement and edge flipping keep the same height');
  assert.deepEqual(placeServicePreview({ x: 200, y: 830 }, viewport), center,
    'Vertical pointer movement must not move or resize the image');
});

test('the bottom stays flush and all corners fit resized and zoomed viewports, including very short windows', () => {
  for (const viewport of [
    { left: 0, top: 72, width: 1174, height: 774 },
    { left: 0, top: 72, width: 320, height: 160 },
    { left: 80, top: 100, width: 260, height: 190 },
    { left: 0, top: 72, width: 200, height: 30 },
  ]) {
    for (const x of [viewport.left, viewport.left + viewport.width / 2, viewport.left + viewport.width]) {
      for (const y of [viewport.top, viewport.top + viewport.height / 2, viewport.top + viewport.height]) {
        const box = placeServicePreview({ x, y }, viewport);
        assert.ok(Math.abs(box.y + box.height - (viewport.top + viewport.height)) < 1e-9,
          'The bottom edge stays flush even when the image shrinks');
        assert.ok(box.x >= viewport.left - 1e-9);
        assert.ok(box.y >= viewport.top - 1e-9);
        assert.ok(box.x + box.width <= viewport.left + viewport.width + 1e-9);
        assert.ok(box.y + box.height <= viewport.top + viewport.height + 1e-9);
        if (!box.width) {
          assert.equal(box.height, 0, 'Hide the preview when there is no room for the cursor gap');
          continue;
        }
        assert.ok(Math.abs(Math.min(Math.abs(box.x - x), Math.abs(box.x + box.width - x)) - 32) < 1e-9);
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
  let focusedColumn = null;
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
    .map((projects, index) => {
      const title = {
        offsetTop: 780, offsetHeight: 30, fontSize: '24px',
        style: { setProperty(name, value) { this[name] = value; } },
      };
      const headline = {
        offsetTop: 120, offsetHeight: 240, animations: [], dataset: {}, clipPath: 'none',
        animate(keyframes, options) {
          const animation = {
            keyframes, options, cancelled: false, onfinish: null,
            cancel() { this.cancelled = true; },
          };
          this.animations.push(animation);
          return animation;
        },
      };
      const column = Object.assign(new EventTarget(), {
        dataset: { serviceProjects: JSON.stringify(projects) },
        title, headline,
        querySelector: (selector) => selector === 'h2' ? title : headline,
        getBoundingClientRect: () => ({ left: index * width / 4, width: width / 4 }),
      });
      column.closest = () => column;
      return column;
    });
  const preview = { hidden: true, style: {}, querySelectorAll: () => covers };
  let hit = null;
  let frameId = 0;
  let timerId = 0;
  let time = 0;
  document.documentElement = { dataset: {} };
  document.hidden = false;
  document.querySelector = (selector) => {
    if (selector === '[data-service-preview]') return preview;
    if (selector === '.site-header') return { getBoundingClientRect: () => ({ bottom: 72 }) };
    if (selector === '.service-column:hover') return hit;
    if (selector === '.service-column:focus-visible') return focusedColumn;
    return null;
  };
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
    getComputedStyle: (element) => ({ fontSize: element.fontSize, clipPath: element.clipPath ?? 'none' }),
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  const move = (index, { x = 120, y = 300, movementX = 0, pointerType = 'mouse', type = 'pointermove' } = {}) => {
    hit = columns[index];
    columns[index].dispatchEvent(Object.assign(new Event(type), { clientX: x, clientY: y, movementX, pointerType }));
  };
  const leave = (index, nextIndex = null, movementX = 0) => {
    hit = columns[nextIndex] ?? null;
    columns[index].dispatchEvent(Object.assign(new Event('pointerleave'), { relatedTarget: hit, movementX }));
  };
  const focus = (index) => {
    const previous = focusedColumn;
    focusedColumn = columns[index];
    if (previous === focusedColumn) return;
    previous?.dispatchEvent(Object.assign(new Event('blur'), { relatedTarget: focusedColumn }));
    focusedColumn.dispatchEvent(new Event('focus'));
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
    move, leave, focus, flush, advance, visible, setHit: (index) => { hit = columns[index] ?? null; } };
}

const entryMask = (column) => column.headline.animations.at(-1)?.keyframes[0].clipPath;
const previewPosition = (preview) => preview.style.transform.match(/-?[\d.]+px/g).map(parseFloat);

test('headline entry follows service order across pointerleave and does not restart within a column', () => {
  const { columns, move, leave } = createPreviewEnvironment();
  move(0, { type: 'pointerenter', x: 20, movementX: 2 });
  assert.equal(entryMask(columns[0]), 'inset(0 100% 0 0)');
  leave(0, 2);
  assert.equal(columns[0].headline.animations[0].cancelled, true);
  assert.equal(columns[0].headline.animations.at(-1).keyframes[1].clipPath, 'inset(0 0 0 100%)',
    'Moving right conceals the old text from left to right');
  assert.equal(columns[0].headline.dataset.headlineExiting, '', 'Keep the outgoing text visible through its wipe');
  move(2, { type: 'pointerenter', x: 550 });
  assert.equal(entryMask(columns[2]), 'inset(0 100% 0 0)', 'Moving right enters from the left');
  assert.equal(columns[2].headline.animations[0].keyframes[0].clipPath, 'inset(0 100% 0 0)', 'Reveal from the left edge');
  move(2, { x: 560, movementX: -4 });
  assert.equal(columns[2].headline.animations.length, 1, 'Small pointer movements do not restart the animation');
  leave(2, 1);
  assert.equal(columns[0].headline.dataset.headlineExiting, undefined, 'Rapid switching removes older outgoing text');
  assert.equal(columns[2].headline.animations.at(-1).keyframes[1].clipPath, 'inset(0 100% 0 0)',
    'Moving left conceals the old text from right to left');
  move(1, { type: 'pointerenter', x: 420 });
  assert.equal(entryMask(columns[1]), 'inset(0 0 0 100%)', 'Moving left enters from the right');
  assert.equal(columns[1].headline.animations[0].keyframes[0].clipPath, 'inset(0 0 0 100%)', 'Reveal from the right edge');
  leave(1, 2);
  move(2, { type: 'pointerenter', x: 550 });
  assert.equal(entryMask(columns[2]), 'inset(0 100% 0 0)', 'Rapid reversals use the most recent service');
  const current = columns[2].headline.animations.at(-1);
  assert.equal(current.keyframes[1].clipPath, 'inset(0 0 0 0)', 'The complete text is visible after settling');
  assert.equal(current.options.duration, 400, 'Hover text uses the faster 400ms wipe');
  assert.equal(current.options.easing, 'cubic-bezier(.2, .65, .35, 1)');
  const outgoing = columns[1].headline.animations.at(-1);
  assert.equal(outgoing.options.duration, current.options.duration, 'Both masks use the same timing');
  assert.equal(outgoing.options.easing, current.options.easing);
  for (const column of columns) {
    for (const animation of column.headline.animations) {
      for (const frame of animation.keyframes) {
        assert.deepEqual(Object.keys(frame), ['clipPath'], 'Only the mask changes, never text opacity or position');
      }
    }
  }
});

test('first entry uses pointer direction, with the entry side as a fallback', () => {
  const moving = createPreviewEnvironment();
  moving.move(2, { type: 'pointerenter', x: 550, movementX: -3 });
  assert.equal(entryMask(moving.columns[2]), 'inset(0 0 0 100%)');
  const fromRight = createPreviewEnvironment();
  fromRight.move(3, { type: 'pointerenter', x: 920 });
  assert.equal(entryMask(fromRight.columns[3]), 'inset(0 0 0 100%)');
  const fromLeft = createPreviewEnvironment();
  fromLeft.move(1, { type: 'pointerenter', x: 240 });
  assert.equal(entryMask(fromLeft.columns[1]), 'inset(0 100% 0 0)');
});

test('keyboard focus follows the same direction and only takes over when the pointer leaves', () => {
  const { columns, focus, move, leave } = createPreviewEnvironment();
  focus(0);
  focus(2);
  assert.equal(entryMask(columns[2]), 'inset(0 100% 0 0)');
  focus(1);
  assert.equal(entryMask(columns[1]), 'inset(0 0 0 100%)');
  move(3, { type: 'pointerenter', x: 800 });
  const count = columns[1].headline.animations.length;
  focus(1);
  assert.equal(columns[1].headline.animations.length, count, 'A hovered service takes precedence over focused text');
  leave(3);
  assert.equal(entryMask(columns[1]), 'inset(0 0 0 100%)');
  assert.equal(columns[1].headline.animations.length, count + 1, 'Leaving resumes the focused service from the correct side');
});

test('headline direction ignores touch and narrow layouts and resets after page navigation', () => {
  const touch = createPreviewEnvironment({ canHover: false });
  touch.move(1, { pointerType: 'touch' });
  assert.equal(touch.columns[1].headline.animations.length, 0);
  const narrow = createPreviewEnvironment({ width: 600 });
  narrow.move(1);
  narrow.focus(2);
  assert.equal(narrow.columns[1].headline.animations.length, 0);
  assert.equal(narrow.columns[2].headline.animations.length, 0);
  const desktop = createPreviewEnvironment();
  desktop.move(3);
  desktop.document.dispatchEvent(new Event('astro:before-swap'));
  assert.equal(desktop.columns[3].headline.animations[0].cancelled, true);
  desktop.move(0);
  assert.equal(desktop.columns[0].headline.animations.length, 0, 'Disposed listeners cannot animate text');
  desktop.document.dispatchEvent(new Event('astro:page-load'));
  desktop.move(0, { type: 'pointerenter', x: 200 });
  assert.equal(entryMask(desktop.columns[0]), 'inset(0 0 0 100%)', 'New page entry uses its own entry side');
});

test('duplicate entry events and late animation completion cannot reset a newer direction', () => {
  const { columns, move } = createPreviewEnvironment();
  move(3, { x: 850 });
  const previous = columns[3].headline.animations[0];
  move(1, { x: 300 });
  move(1, { type: 'pointerenter', x: 300 });
  const current = columns[1].headline.animations[0];
  assert.equal(columns[1].headline.animations.length, 1);
  assert.equal(entryMask(columns[1]), 'inset(0 0 0 100%)');
  previous.onfinish();
  assert.equal(current.cancelled, false, 'A stale finish event must not cancel the new animation');
  current.onfinish();
  assert.equal(current.cancelled, true, 'Release animation styles after the text settles');
  move(1, { x: 310 });
  assert.equal(columns[1].headline.animations.length, 1, 'Settled text does not animate again while still hovered');
});

test('leaving conceals the current mask without moving text, then removes its visibility override', () => {
  const { columns, move, leave } = createPreviewEnvironment();
  move(1, { x: 300, movementX: 2 });
  const headline = columns[1].headline;
  headline.clipPath = 'inset(0px 35% 0px 0px)';
  leave(1, null, -3);
  const exit = headline.animations.at(-1);
  assert.equal(headline.animations[0].cancelled, true);
  assert.equal(exit.keyframes[0].clipPath, headline.clipPath, 'Continue from the interrupted reveal without flashing');
  assert.equal(exit.keyframes[1].clipPath, 'inset(0 100% 0 0)', 'Conceal toward the pointer exit direction');
  assert.equal(headline.dataset.headlineExiting, '');
  exit.onfinish();
  assert.equal(exit.cancelled, true);
  assert.equal(headline.dataset.headlineExiting, undefined);
});

test('stale outgoing wipes cannot clear a newer wipe, and navigation clears both masks', () => {
  const { columns, move, document } = createPreviewEnvironment();
  move(0);
  move(1);
  const staleExit = columns[0].headline.animations.at(-1);
  move(2);
  const currentExit = columns[1].headline.animations.at(-1);
  const currentEntry = columns[2].headline.animations.at(-1);
  staleExit.onfinish();
  assert.equal(currentExit.cancelled, false);
  assert.equal(columns[1].headline.dataset.headlineExiting, '');
  assert.equal(columns[0].headline.dataset.headlineExiting, undefined);
  document.dispatchEvent(new Event('astro:before-swap'));
  assert.equal(currentExit.cancelled, true);
  assert.equal(currentEntry.cancelled, true);
  assert.equal(columns[1].headline.dataset.headlineExiting, undefined);
});

test('reduced motion clears an outgoing wipe while keeping the current text immediately visible', () => {
  const { columns, move, motion } = createPreviewEnvironment();
  move(0);
  move(1);
  const exit = columns[0].headline.animations.at(-1);
  const entry = columns[1].headline.animations.at(-1);
  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  assert.equal(exit.cancelled, true);
  assert.equal(entry.cancelled, true);
  assert.equal(columns[0].headline.dataset.headlineExiting, undefined);
});

test('reduced motion and page visibility changes stop headline animation immediately', () => {
  const reduced = createPreviewEnvironment({ reduced: true });
  reduced.move(1);
  assert.equal(reduced.columns[1].headline.animations.length, 0);
  const { columns, move, motion, document, hover, window } = createPreviewEnvironment();
  move(0);
  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  assert.equal(columns[0].headline.animations[0].cancelled, true);
  move(1);
  assert.equal(columns[1].headline.animations.length, 0);
  motion.matches = false;
  motion.dispatchEvent(new Event('change'));
  move(2);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(columns[2].headline.animations[0].cancelled, true);
  document.hidden = false;
  move(3);
  hover.matches = false;
  hover.dispatchEvent(new Event('change'));
  assert.equal(columns[3].headline.animations[0].cancelled, true);
  hover.matches = true;
  move(0);
  window.dispatchEvent(new Event('blur'));
  assert.equal(columns[0].headline.animations.at(-1).cancelled, true);
});

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

test('hover shows the referenced covers, cuts every 500ms, and follows only horizontal pointer movement without easing', async () => {
  const { preview, timers, move, flush, advance, visible } = createPreviewEnvironment();
  move(0, { type: 'pointerenter' });
  await flush();
  assert.equal(preview.hidden, false);
  assert.deepEqual(visible(), ['matte']);
  const [originalX, originalY] = previewPosition(preview);
  assert.equal(originalX, 152);
  assert.equal(originalY + parseFloat(preview.style.height), 846);
  assert.equal(timers.size, 1);
  advance(499);
  assert.deepEqual(visible(), ['matte']);
  advance(1);
  assert.deepEqual(visible(), ['gretzl']);
  advance(500);
  assert.deepEqual(visible(), ['matte']);
  move(0, { x: 220, y: 350 });
  await flush();
  assert.deepEqual(previewPosition(preview), [252, originalY]);
  move(0, { x: 220, y: 700 });
  await flush();
  assert.deepEqual(previewPosition(preview), [252, originalY], 'Vertical movement leaves the image still');
});

test('changing services resets the first cover and replaces the old timer', async () => {
  const { move, flush, advance, visible, timers, preview } = createPreviewEnvironment();
  move(0);
  await flush();
  const [, originalY] = previewPosition(preview);
  advance(500);
  move(1, { x: 350 });
  await flush();
  assert.deepEqual(previewPosition(preview), [382, originalY], 'Changing columns follows the cursor on the same horizontal rail');
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
  assert.equal(y + parseFloat(preview.style.height), 500, 'Resizing keeps zero space below the image');
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
