import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { indicatorPlacement } from '../src/lib/nav-indicator.ts';

test('the shared underline travels from the previous label and changes width', () => {
  const result = indicatorPlacement(
    { left: 900, top: 46, width: 84 },
    { left: 780, top: 46, width: 60 },
    { left: 780, top: 0 },
  );
  assert.deepEqual(result.from, { transform: 'translate3d(0px, 46px, 0)', width: '60px' });
  assert.deepEqual(result.to, { transform: 'translate3d(120px, 46px, 0)', width: '84px' });
});

test('a new header origin preserves the old viewport position during navigation', () => {
  const result = indicatorPlacement(
    { left: 290, top: 61, width: 48 },
    { left: 180, top: 30, width: 70 },
    { left: 200, top: 8 },
  );
  assert.deepEqual(result.from, { transform: 'translate3d(-20px, 22px, 0)', width: '70px' });
  assert.deepEqual(result.to, { transform: 'translate3d(90px, 53px, 0)', width: '48px' });
});

test('initial loads and reduced motion place the underline without sliding', () => {
  const label = { left: 290, top: 61, width: 48 };
  const origin = { left: 200, top: 8 };
  assert.equal(indicatorPlacement(label, null, origin).from, null);
  const reduced = indicatorPlacement(label, { left: 180, top: 30, width: 70 }, origin, false);
  assert.equal(reduced.from, null);
  assert.deepEqual(reduced.box, { left: 290, top: 61, width: 48 });
});

test('staying in the same section does not restart the underline animation', () => {
  assert.equal(indicatorPlacement(
    { left: 290, top: 61, width: 48 },
    { left: 290, top: 61, width: 48 },
    { left: 200, top: 8 },
  ).from, null);
});

test('pages without a selected menu item hide the underline', () => {
  assert.equal(indicatorPlacement(null, { left: 200, top: 20, width: 60 }, { left: 0, top: 0 }), null);
});

function createIndicatorEnvironment() {
  const document = new EventTarget();
  const window = new EventTarget();
  const motion = Object.assign(new EventTarget(), { matches: false });
  const frames = new Map();
  const observers = [];
  const animations = [];
  let frameId = 0;
  let selected = 0;
  const origin = { left: 700, top: 0 };
  const labels = [
    { left: 700, bottom: 45, width: 60 },
    { left: 820, bottom: 45, width: 84 },
    { left: 960, bottom: 45, width: 48 },
  ].map((bounds) => ({
    getBoundingClientRect: () => bounds,
    querySelector: () => ({ getBoundingClientRect: () => ({ top: bounds.bottom + 1 }) }),
  }));
  const links = ['/projekte', '/leistungen', '/studio', 'mailto:post@studioschatzi.at'].map((href, index) => ({
    href: new URL(href, 'https://studioschatzi.at').href,
    querySelector: () => labels[index] ?? null,
  }));
  const indicator = {
    dataset: {}, style: {},
    getBoundingClientRect() {
      const coordinates = this.style.transform.match(/-?[\d.]+px/g).map(parseFloat);
      return { left: origin.left + coordinates[0], top: origin.top + coordinates[1], width: parseFloat(this.style.width) };
    },
    animate(keyframes, options) {
      let resolve;
      let reject;
      const animation = {
        keyframes, options, cancelled: false,
        finished: new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; }),
        finish() { resolve(); },
        cancel() { this.cancelled = true; reject(new Error('cancelled')); },
      };
      animations.push(animation);
      return animation;
    },
  };
  const makeNav = () => ({
    dataset: {},
    getBoundingClientRect: () => origin,
    querySelector(selector) {
      if (selector === '[data-nav-indicator]') return indicator;
      if (selector === 'a[aria-current="page"]') return links[selected] ?? null;
      if (selector === 'a[href="/leistungen"]') return links[1];
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'a[href]') return links;
      if (selector === '.header-label') return labels;
      return [];
    },
  });
  let nav = makeNav();
  document.querySelector = () => nav;
  document.fonts = { ready: Promise.resolve() };
  window.matchMedia = () => motion;

  const source = readFileSync(new URL('../src/scripts/nav-indicator.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(compiled.outputText, {
    exports: {}, require: () => ({ indicatorPlacement }), document, window, Event, AbortController, URL, queueMicrotask,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
      disconnect() {}
    },
  });
  const flush = async () => {
    await Promise.resolve();
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback());
  };
  const navigate = (index) => {
    document.dispatchEvent(new Event('astro:before-swap'));
    selected = index;
    nav = makeNav();
    document.dispatchEvent(new Event('astro:after-swap'));
  };
  const beginNavigation = (path) => {
    const controller = new AbortController();
    const event = Object.assign(new Event('astro:before-preparation', { cancelable: true }), {
      to: new URL(path, 'https://studioschatzi.at'), signal: controller.signal,
    });
    document.dispatchEvent(event);
    return { controller, event };
  };

  return { document, motion, observers, animations, indicator, flush, navigate, beginNavigation };
}

test('page swaps keep one indicator, survive font notifications, and respect reduced motion', async () => {
  const { motion, observers, animations, indicator, flush, navigate } = createIndicatorEnvironment();
  await flush();
  assert.equal(indicator.dataset.visible, 'true');
  assert.equal(animations.length, 0);
  navigate(1);
  assert.equal(animations.length, 1);
  assert.deepEqual(animations[0].keyframes[0], { transform: 'translate3d(0px, 46px, 0)', width: '60px' });
  observers.at(-1).callback();
  await flush();
  assert.equal(animations[0].cancelled, false, 'Initial layout/font notifications must not interrupt the slide');

  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  await flush();
  assert.equal(animations[0].cancelled, true);
  assert.equal(indicator.dataset.moving, undefined);
  assert.equal(indicator.style.width, '84px');
  navigate(2);
  assert.equal(animations.length, 1, 'Reduced motion must not create another slide');
  assert.equal(indicator.style.width, '48px');

  motion.matches = false;
  navigate(0);
  assert.equal(animations.length, 2, 'Back navigation should slide to the selected section');
  navigate(0);
  assert.equal(animations.length, 2, 'A project detail page must retain the Projects indicator');
  navigate(-1);
  assert.equal(indicator.dataset.visible, undefined);
  assert.equal(indicator.style.width, '0px');
});

test('the underline starts before page loading and keeps its destination through the page swap', async () => {
  const { observers, animations, indicator, flush, navigate, beginNavigation } = createIndicatorEnvironment();
  await flush();
  beginNavigation('/leistungen/markenentwicklung');
  assert.equal(animations.length, 1, 'The slide must start before the next document arrives');
  assert.equal(animations[0].keyframes[1].transform, 'translate3d(120px, 46px, 0)');
  observers.at(-1).callback();
  await flush();
  assert.equal(animations[0].cancelled, false, 'Font and resize notifications must retain the pending selection');
  animations[0].finish();
  await flush();
  navigate(1);
  assert.equal(animations.length, 1, 'The page swap must not repeat the completed slide');
  assert.equal(indicator.style.width, '84px');
});

test('cancelled navigation restores the current item without interrupting a newer destination', async () => {
  const { animations, indicator, flush, beginNavigation } = createIndicatorEnvironment();
  await flush();
  const first = beginNavigation('/leistungen');
  first.controller.abort();
  const second = beginNavigation('/studio');
  await flush();
  assert.equal(animations.length, 2, 'An aborted older route must not cause a detour to the current item');
  assert.equal(indicator.style.width, '48px');

  second.controller.abort();
  await flush();
  assert.equal(animations.length, 3);
  assert.equal(indicator.style.width, '60px');
  assert.equal(indicator.style.transform, 'translate3d(0px, 46px, 0)');
});

test('prevented navigation restores selection and reduced motion responds immediately without a slide', async () => {
  const { motion, animations, indicator, flush, beginNavigation } = createIndicatorEnvironment();
  await flush();
  beginNavigation('/studio').event.preventDefault();
  await flush();
  assert.equal(indicator.style.width, '60px');

  motion.matches = true;
  const count = animations.length;
  beginNavigation('/leistungen');
  assert.equal(animations.length, count);
  assert.equal(indicator.style.width, '84px');
  beginNavigation('/');
  assert.equal(indicator.dataset.visible, undefined);
});
