import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { placeServicePreview } from '../src/lib/service-preview.ts';
import { createPhysicalMotion } from '../src/lib/physical-motion.ts';

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
        offsetTop: 120, offsetHeight: 240, offsetWidth: width - 48, dataset: {}, style: {},
        getBoundingClientRect() { return { left: 24, width: this.offsetWidth }; },
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
  // Native browser frame methods reject an unrelated receiver, such as the clock adapter.
  window.requestAnimationFrame = function (callback) {
    assert.ok(this === undefined || this === window || this?.window === window,
      'requestAnimationFrame must retain its Window receiver');
    frames.set(++frameId, callback);
    return frameId;
  };
  window.cancelAnimationFrame = function (id) {
    assert.ok(this === undefined || this === window || this?.window === window,
      'cancelAnimationFrame must retain its Window receiver');
    frames.delete(id);
  };
  const source = readFileSync(new URL('../src/scripts/service-preview.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(compiled.outputText, {
    exports: {}, require: () => ({ placeServicePreview, createPhysicalMotion }), document, window,
    AbortController: class extends AbortController {
      constructor() { super(); setMaxListeners(0, this.signal); }
    },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; this.targets = new Set(); resizeObservers.add(this); }
      observe(target) { this.targets.add(target); }
      disconnect() { resizeObservers.delete(this); }
    },
    getComputedStyle: (element) => ({ fontSize: element.fontSize, clipPath: element.clipPath ?? 'none' }),
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
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
    focusedColumn?.dispatchEvent(new Event('focus'));
  };
  let frameTime = 0;
  const tick = (delta = 1000 / 60) => {
    frameTime += delta;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(frameTime));
  };
  const step = (milliseconds = 600) => {
    for (let i = 0; i < Math.ceil(milliseconds / (1000 / 60)); i++) tick();
  };
  const flush = async () => {
    await new Promise(setImmediate);
    tick();
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
    move, leave, focus, flush, advance, step, tick, visible, setHit: (index) => { hit = columns[index] ?? null; } };
}

const mask = (column) => {
  const [right, left] = column.headline.style.clipPath.match(/[-+\d.e]+%/g).map(parseFloat);
  return { left: left / 100, right: 1 - right / 100 };
};
const previewPosition = (preview) => preview.style.transform.match(/-?[\d.]+px/g).map(parseFloat);
const titleY = (column) => Number(column.title.style.transform.match(/, ([-\d.]+)px/)[1]);
const titleScaleY = (column) => Number(column.title.style.transform.match(/scale\([^,]+, ([\d.]+)\)/)[1]);
const activeText = (column) => column.headline.dataset.headlineActive === '';
const exitingText = (column) => column.headline.dataset.headlineExiting === '';
const origin = (column) => {
  const bounds = column.getBoundingClientRect();
  const headline = column.headline.getBoundingClientRect();
  return (bounds.left + bounds.width / 2 - headline.left) / headline.width;
};
const startOrigin = (column) => {
  const bounds = column.getBoundingClientRect();
  const headline = column.headline.getBoundingClientRect();
  return Math.max(0, Math.min(1, (bounds.left - headline.left) / headline.width));
};
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);

test('directional masks share a 20px yellow gap at every frame without moving or fading the text', () => {
  const { columns, move, leave, step, tick } = createPreviewEnvironment();
  move(0, { type: 'pointerenter', x: 20, movementX: 2 });
  near(mask(columns[0]).left, startOrigin(columns[0]));
  near(mask(columns[0]).right, startOrigin(columns[0]));
  step();
  leave(0, 2);
  move(2, { type: 'pointerenter', x: 550 });
  assert.equal(exitingText(columns[0]), true);
  assert.equal(activeText(columns[2]), true);
  for (let i = 0; i < 10; i++) {
    tick();
    const old = mask(columns[0]);
    const next = mask(columns[2]);
    assert.ok(Math.abs((old.left - next.right) * columns[0].headline.offsetWidth - 20) < .001);
    assert.deepEqual(Object.keys(columns[2].headline.style), ['clipPath'], 'Text position and opacity stay untouched');
  }
  const before = columns[2].headline.style.clipPath;
  move(2, { x: 560, movementX: -4 });
  assert.equal(columns[2].headline.style.clipPath, before, 'Pointer movement in the same column does not restart a wipe');
  step();
  assert.equal(exitingText(columns[0]), false);
  assert.deepEqual(mask(columns[2]), { left: 0, right: 1 });

  leave(2, 1);
  move(1, { x: 420 });
  for (let i = 0; i < 10; i++) {
    tick();
    const old = mask(columns[2]);
    const next = mask(columns[1]);
    assert.ok(Math.abs((next.left - old.right) * columns[1].headline.offsetWidth - 20) < .001,
      'Moving left reverses the sweep while keeping the same gap');
  }
  step();
  assert.deepEqual(mask(columns[1]), { left: 0, right: 1 });
});

test('outside pointer entries expand on both sides of each column left edge', () => {
  for (const [index, x, movementX] of [[0, 20, 2], [2, 550, -3], [3, 920, 0], [1, 240, 0]]) {
    const env = createPreviewEnvironment();
    env.move(index, { type: 'pointerenter', x, movementX });
    const visible = mask(env.columns[index]);
    const start = startOrigin(env.columns[index]);
    near(visible.left, start);
    near(visible.right, start);
    env.tick();
    assert.ok(mask(env.columns[index]).left <= start && mask(env.columns[index]).right >= start,
      'Both edges expand from the left edge of the hovered column');
    const afterStart = mask(env.columns[index]);
    env.move(index, { x: x + 80 });
    assert.deepEqual(mask(env.columns[index]), afterStart, 'Pointer movement does not retarget or restart the reveal');
    env.step();
    env.leave(index);
    env.step();
    env.move(1, { type: 'pointerenter', x: 240 });
    near(mask(env.columns[1]).left, startOrigin(env.columns[1]));
    near(mask(env.columns[1]).right, startOrigin(env.columns[1]));
    env.document.dispatchEvent(new Event('astro:before-swap'));
    assert.equal(env.frames.size, 0);
    env.move(0);
    assert.equal(activeText(env.columns[0]), false, 'Disposed listeners do nothing');
    env.document.dispatchEvent(new Event('astro:page-load'));
    env.move(0, { type: 'pointerenter', x: 200 });
    near(mask(env.columns[0]).left, startOrigin(env.columns[0]));
    near(mask(env.columns[0]).right, startOrigin(env.columns[0]));
  }
});

test('leaving contracts the visible headline toward its column left edge and reentry catches it in place', () => {
  for (let index = 0; index < 4; index++) {
    const env = createPreviewEnvironment();
    env.move(index);
    env.step();
    env.leave(index, null, 4);
    assert.deepEqual(mask(env.columns[index]), { left: 0, right: 1 });
    const start = startOrigin(env.columns[index]);
    let previous = mask(env.columns[index]);
    for (let frame = 0; frame < 5; frame++) {
      env.tick();
      const visible = mask(env.columns[index]);
      assert.ok(visible.left >= previous.left && visible.right <= previous.right);
      assert.ok(visible.left > previous.left || visible.right < previous.right);
      assert.ok(visible.left <= start && visible.right >= start);
      if (start > 0) near(visible.left / start, (1 - visible.right) / (1 - start));
      previous = visible;
    }
    env.move(index);
    assert.deepEqual(mask(env.columns[index]), previous, 'Re-hovering never restarts a close from zero width');
    env.tick();
    const reopened = mask(env.columns[index]);
    assert.ok(reopened.left <= previous.left && reopened.right >= previous.right);
    assert.ok(reopened.left < previous.left || reopened.right > previous.right,
      'Re-hovering expands the caught mask without crossing a page boundary');
    env.step();
    env.leave(index);
    env.step();
    assert.equal(env.columns.some(exitingText), false);
    assert.equal(env.columns.some(activeText), false);
    assert.equal(env.frames.size, 0);
  }
});

test('a brief center reveal closes from its partial mask without exposing hidden text', () => {
  const env = createPreviewEnvironment();
  env.move(2);
  env.tick();
  const partial = mask(env.columns[2]);
  env.leave(2);
  assert.deepEqual(mask(env.columns[2]), partial);
  env.tick();
  assert.ok(mask(env.columns[2]).left >= partial.left);
  assert.ok(mask(env.columns[2]).right <= partial.right);
  env.step();
  assert.equal(env.columns.some(exitingText), false);
});

test('keyboard focus uses the same physical motion and resumes after hover ends', () => {
  const { columns, focus, move, leave, step } = createPreviewEnvironment();
  focus(0);
  near(mask(columns[0]).left, origin(columns[0]));
  near(mask(columns[0]).right, origin(columns[0]));
  focus(2);
  assert.equal(mask(columns[2]).right, 0);
  step();
  assert.ok(titleY(columns[2]) < 0);
  focus(1);
  assert.ok(mask(columns[1]).left >= 1);
  move(3, { type: 'pointerenter', x: 800 });
  focus(1);
  assert.equal(activeText(columns[3]), true, 'Hover takes precedence over keyboard focus');
  leave(3);
  assert.equal(activeText(columns[1]), true);
  assert.ok(mask(columns[1]).left >= 1);
  step();
  assert.equal(titleY(columns[3]), 0);
  assert.equal(titleY(columns[1]), parseFloat(columns[1].title.style['--service-title-offset']));
  focus(null);
  assert.deepEqual(mask(columns[1]), { left: 0, right: 1 });
  step();
  assert.equal(columns.some(exitingText), false);
});

test('a brief hover releases the title from its current height with no remaining ascent', () => {
  const { columns, move, leave, step, tick } = createPreviewEnvironment();
  move(0);
  tick();
  tick();
  const releasedAt = titleY(columns[0]);
  assert.ok(releasedAt < 0 && releasedAt > parseFloat(columns[0].title.style['--service-title-offset']));
  leave(0);
  assert.equal(titleY(columns[0]), releasedAt, 'Leaving never teleports the title');
  tick();
  assert.ok(titleY(columns[0]) > releasedAt, 'The very next frame moves downward');
  for (let i = 0; i < 20; i++) {
    tick();
    assert.ok(titleY(columns[0]) >= releasedAt && titleY(columns[0]) <= 0);
  }
  step();
  assert.equal(titleY(columns[0]), 0);
  assert.equal(titleScaleY(columns[0]), 1);
});

test('the title stops at the raised position and lands faster with a restrained floor bounce', () => {
  const { columns, move, leave, step, tick } = createPreviewEnvironment();
  move(0);
  const liftScales = [];
  for (let i = 0; i < 12; i++) { tick(); liftScales.push(titleScaleY(columns[0])); }
  assert.ok(Math.max(...liftScales) > 1.02 && Math.max(...liftScales) <= 1.035);
  assert.ok(titleY(columns[0]) >= parseFloat(columns[0].title.style['--service-title-offset']),
    'Pickup never overshoots above its destination');
  step();
  assert.equal(titleScaleY(columns[0]), 1, 'A held title returns to its natural shape');
  leave(0);
  let landingFrame = -1;
  const landingScales = [];
  for (let i = 0; i < 40; i++) {
    tick();
    if (titleY(columns[0]) === 0 && landingFrame === -1) landingFrame = i;
    assert.ok(titleY(columns[0]) <= 0, 'The title cannot fall below its baseline');
    landingScales.push(titleScaleY(columns[0]));
  }
  assert.ok(landingFrame >= 0 && landingFrame < 15, 'A full-height fall lands within 250ms');
  const minimumLandingScale = Math.min(...landingScales);
  assert.ok(minimumLandingScale < .99 && minimumLandingScale >= .955,
    `Landing compression ${minimumLandingScale} should stay between .955 and .99`);
  step();
  assert.equal(titleY(columns[0]), 0);
  assert.equal(titleScaleY(columns[0]), 1);
});

test('rehover catches a falling title in place, and reduced motion stops the fall and stretch', () => {
  const { columns, move, leave, motion, frames, step, tick } = createPreviewEnvironment();
  move(0);
  step();
  leave(0);
  for (let i = 0; i < 5; i++) tick();
  const fallingAt = titleY(columns[0]);
  move(0);
  assert.equal(titleY(columns[0]), fallingAt);
  step();
  assert.equal(titleY(columns[0]), parseFloat(columns[0].title.style['--service-title-offset']));
  leave(0);
  tick();
  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  assert.equal(titleY(columns[0]), 0);
  assert.equal(titleScaleY(columns[0]), 1);
  assert.equal(frames.size, 0);
});

test('interrupted swipes retain the visible part of the old headline and discard older exits', () => {
  const { columns, move, leave, tick, step, document, frames } = createPreviewEnvironment();
  move(0, { x: 20, movementX: 2 });
  tick();
  const partial = mask(columns[0]);
  assert.ok(partial.right > 0 && partial.right < 1);
  move(1);
  assert.deepEqual(mask(columns[0]), partial, 'The partially revealed text cannot flash fully visible on interruption');
  tick();
  move(2);
  assert.equal(exitingText(columns[0]), false);
  assert.equal(exitingText(columns[1]), true);
  assert.equal(activeText(columns[2]), true);
  const before = columns[2].headline.style.clipPath;
  move(2, { type: 'pointerenter' });
  assert.equal(columns[2].headline.style.clipPath, before, 'Duplicate enter events do not restart motion');
  tick();
  const last = mask(columns[2]);
  leave(2, null, -3);
  assert.deepEqual(mask(columns[2]), last, 'Leaving conceals the current mask, including during a reveal');
  step();
  assert.equal(columns.some(exitingText), false);
  assert.equal(columns.some(activeText), false);
  assert.ok(columns.every((column) => titleY(column) === 0));
  move(1);
  move(2);
  document.dispatchEvent(new Event('astro:before-swap'));
  assert.equal(columns.some(exitingText), false);
  assert.equal(columns.some(activeText), false);
  assert.equal(frames.size, 0);
});

test('reduced motion settles all bodies immediately and leaves the selected headline visible', async () => {
  const { columns, move, motion, preview, flush, frames, timers, step } = createPreviewEnvironment();
  move(0);
  await flush();
  step(50);
  move(1, { x: 350 });
  await flush();
  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  assert.equal(columns.some(exitingText), false);
  assert.equal(activeText(columns[1]), true);
  assert.deepEqual(mask(columns[1]), { left: 0, right: 1 });
  assert.equal(titleY(columns[0]), 0);
  assert.equal(titleY(columns[1]), parseFloat(columns[1].title.style['--service-title-offset']));
  assert.equal(previewPosition(preview)[0], 382);
  assert.equal(frames.size, 0);
  assert.equal(timers.size, 0);
  move(2);
  await flush();
  assert.deepEqual(mask(columns[2]), { left: 0, right: 1 });
  assert.equal(frames.size, 0, 'Reduced motion never starts the engine loop');
});

test('touch, narrow layouts, hidden tabs, and navigation leave no active physics', async () => {
  for (const options of [{ canHover: false }, { width: 600 }]) {
    const env = createPreviewEnvironment(options);
    env.move(1, { pointerType: 'touch' });
    env.focus(2);
    await env.flush();
    assert.equal(env.columns.some(activeText), false);
    assert.equal(env.frames.size, 0);
    assert.equal(env.preview.hidden, true);
  }
  for (const cancel of [
    (env) => { env.document.hidden = true; env.document.dispatchEvent(new Event('visibilitychange')); },
    (env) => env.window.dispatchEvent(new Event('blur')),
    (env) => { env.hover.matches = false; env.hover.dispatchEvent(new Event('change')); },
  ]) {
    const env = createPreviewEnvironment();
    env.move(0);
    await env.flush();
    env.move(1);
    cancel(env);
    assert.equal(env.frames.size, 0);
    assert.equal(env.timers.size, 0);
    assert.equal(env.columns.some(activeText), false);
    assert.equal(env.columns.some(exitingText), false);
  }
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

test('covers cut every 500ms and follow horizontal pointer movement with inertia on a fixed rail', async () => {
  const { preview, timers, move, flush, advance, visible, step } = createPreviewEnvironment();
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
  assert.ok(previewPosition(preview)[0] < 252, 'The image follows with inertia instead of jumping to the cursor');
  step();
  assert.deepEqual(previewPosition(preview), [252, originalY]);
  move(0, { x: 220, y: 700 });
  await flush();
  assert.deepEqual(previewPosition(preview), [252, originalY], 'Vertical movement leaves the image still');
});

test('changing services preserves the image position while resetting the cover and timer', async () => {
  const { move, flush, advance, visible, timers, preview, step } = createPreviewEnvironment();
  move(0);
  await flush();
  const [, originalY] = previewPosition(preview);
  advance(500);
  move(1, { x: 350 });
  await flush();
  assert.ok(previewPosition(preview)[0] < 382, 'Changing columns does not teleport the image');
  step();
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
  assert.equal(preview.hidden, false, 'Navigation preparation preserves the clicked hover state');
  assert.equal(activeText(columns[0]), true);
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
