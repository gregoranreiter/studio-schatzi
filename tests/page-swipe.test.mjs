import assert from 'node:assert/strict';
import test from 'node:test';
import { initializePageSwipe } from '../src/scripts/page-swipe.ts';

const flush = () => new Promise(setImmediate);
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function environment({ reduced = false } = {}) {
  const document = new EventTarget();
  document.documentElement = { dataset: {} };
  const window = new EventTarget();
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const timers = new Map();
  const animations = [];
  let timerId = 0;
  const overlay = {
    style: {}, dataset: {},
    getAnimations: () => animations.filter((animation) => !animation.cancelled),
    animate(keyframes, options) {
      const completion = deferred();
      const animation = {
        keyframes, options, cancelled: false, finished: completion.promise,
        finish: completion.resolve,
        cancel() { this.cancelled = true; completion.reject(new Error('Animation cancelled')); },
      };
      animations.push(animation);
      return animation;
    },
  };
  document.querySelector = () => overlay;
  window.matchMedia = () => media;
  window.setTimeout = (callback) => { timers.set(++timerId, callback); return timerId; };
  window.clearTimeout = (id) => timers.delete(id);
  let cleanup = initializePageSwipe(document, window);
  const begin = ({ loader = async () => {}, type = 'push', from = '/', to = '/kontakt', afterPreparation } = {}) => {
    const controller = new AbortController();
    const event = Object.assign(new Event('astro:before-preparation', { cancelable: true }), {
      from: new URL(from, 'https://studioschatzi.at'),
      to: new URL(to, 'https://studioschatzi.at'),
      loader, signal: controller.signal, navigationType: type,
    });
    document.dispatchEvent(event);
    afterPreparation?.(document);
    const loading = event.loader();
    return { controller, event, loading };
  };
  const finishCover = async (navigation) => {
    animations.at(-1).finish();
    await flush();
    for (const [id, callback] of timers) { timers.delete(id); callback(); }
    await navigation.loading;
  };
  const swap = (navigation) => {
    const native = deferred();
    const ready = deferred();
    let skips = 0;
    const viewTransition = {
      ready: ready.promise, finished: native.promise,
      skipTransition() { skips++; ready.reject(new Error('Transition was skipped')); },
    };
    document.dispatchEvent(Object.assign(new Event('astro:before-swap'), {
      signal: navigation.controller.signal, viewTransition,
    }));
    // Astro replaces the root attributes, but persists the overlay element itself.
    document.documentElement.dataset = {};
    document.dispatchEvent(new Event('astro:after-swap'));
    return { finish: native.resolve, reject: native.reject, get skips() { return skips; } };
  };
  return { document, window, media, overlay, animations, timers, begin, finishCover, swap,
    dispose: () => cleanup(), restart: () => { cleanup = initializePageSwipe(document, window); } };
}

test('primary navigation wipes travel with the underline', async () => {
  const env = environment();
  for (const [from, to, enter, name] of [
    ['/projekte', '/leistungen', 'translate3d(-105%, 0, 0)', 'left'],
    ['/projekte/ein-projekt', '/studio', 'translate3d(-105%, 0, 0)', 'left'],
    ['/studio', '/leistungen', 'translate3d(105%, 0, 0)', 'right'],
    ['/leistungen/eine-leistung', '/projekte', 'translate3d(105%, 0, 0)', 'right'],
  ]) {
    const navigation = env.begin({ from, to });
    assert.equal(env.animations.at(-1).keyframes[0].transform, enter);
    assert.equal(env.overlay.dataset.swipeDirection, name);
    navigation.controller.abort();
    await navigation.loading;
  }
  env.dispose();
});

test('service breadcrumb wipes consume the live underline direction', async () => {
  const env = environment();
  for (const [travel, enter, name] of [
    ['left', 'translate3d(105%, 0, 0)', 'right'],
    ['right', 'translate3d(-105%, 0, 0)', 'left'],
  ]) {
    const navigation = env.begin({
      from: '/leistungen/kampagnen',
      to: '/leistungen',
      afterPreparation: (document) => { document.documentElement.dataset.headerIndicatorTravel = travel; },
    });
    assert.equal(env.animations.at(-1).keyframes[0].transform, enter);
    assert.equal(env.overlay.dataset.swipeDirection, name);
    assert.equal(env.document.documentElement.dataset.headerIndicatorTravel, undefined);
    navigation.controller.abort();
    await navigation.loading;
  }
  env.dispose();
});

test('project detail wipes always rise from below', async () => {
  const env = environment();
  for (const from of ['/projekte', '/leistungen/kampagnen', '/studio']) {
    const navigation = env.begin({
      from,
      to: '/projekte/auf-der-matte',
      // A project detail overrides any horizontal underline travel.
      afterPreparation: (document) => { document.documentElement.dataset.headerIndicatorTravel = 'left'; },
    });
    assert.equal(env.animations.at(-1).keyframes[0].transform, 'translate3d(0, 105%, 0)');
    assert.equal(env.overlay.dataset.swipeDirection, 'bottom');
    navigation.controller.abort();
    await navigation.loading;
  }
  env.dispose();
});

test('logo transitions to the homepage always descend from above', async () => {
  const env = environment();
  for (const from of ['/projekte', '/projekte/auf-der-matte', '/leistungen/kampagnen', '/']) {
    const navigation = env.begin({
      from,
      to: '/',
      afterPreparation: (document) => { document.documentElement.dataset.headerIndicatorTravel = 'right'; },
    });
    assert.equal(env.animations.at(-1).keyframes[0].transform, 'translate3d(0, -105%, 0)');
    assert.equal(env.overlay.dataset.swipeDirection, 'top');
    navigation.controller.abort();
    await navigation.loading;
  }
  env.dispose();
});

test('one cover and reveal run per navigation, after native snapshots are gone', async () => {
  const env = environment();
  for (const type of ['push', 'traverse', 'replace']) {
    const first = env.animations.length;
    const navigation = env.begin({ type });
    assert.equal(env.animations.length, first + 1);
    const entry = env.animations.at(-1).keyframes[0].transform;
    await env.finishCover(navigation);
    assert.equal(env.overlay.style.transform, 'translate3d(0, 0, 0)');
    const native = env.swap(navigation);
    assert.equal(native.skips, 1, 'The native snapshot transition must be skipped, not just its CSS fade');
    await flush();
    assert.equal(env.animations.length, first + 1, 'Reveal cannot start during the browser render pause');
    assert.equal(env.document.documentElement.dataset.swipePhase, 'swapped');
    env.document.dispatchEvent(new Event('astro:after-swap'));
    native.finish();
    await flush();
    assert.equal(env.animations.length, first + 2, 'Duplicate swap notifications cannot start a second reveal');
    const reveal = env.animations.at(-1);
    assert.equal(reveal.keyframes[0].transform, 'translate3d(0, 0, 0)', 'Reveal always starts fully covered');
    assert.equal(reveal.keyframes[1].transform, entry.replace(/(-?)105%/, (_, sign) => sign ? '105%' : '-105%'));
    assert.equal(env.overlay.getAnimations().length, 1);
    reveal.finish();
    await flush();
    assert.equal(env.overlay.getAnimations().length, 0);
    assert.equal(env.document.documentElement.dataset.swipePhase, undefined);
  }
  env.dispose();
});

test('slow page loading keeps the cover in place without replaying the animation', async () => {
  const env = environment();
  const response = deferred();
  const navigation = env.begin({ loader: () => response.promise });
  env.animations[0].finish();
  await flush();
  assert.equal(env.overlay.style.transform, 'translate3d(0, 0, 0)');
  assert.equal(env.animations.length, 1);
  assert.equal(env.timers.size, 0, 'The hold starts only when both the cover and response are ready');
  response.resolve();
  await env.finishCover(navigation);
  env.dispose();
});

test('a new navigation cancels an old reveal and its completion cannot reset the new cover', async () => {
  const env = environment();
  const first = env.begin();
  await env.finishCover(first);
  env.swap(first).finish();
  await flush();
  const oldReveal = env.animations.at(-1);
  first.controller.abort();
  const second = env.begin();
  const entering = env.overlay.style.transform;
  assert.equal(oldReveal.cancelled, true);
  oldReveal.finish();
  await flush();
  assert.equal(env.document.documentElement.dataset.swipePhase, 'covering');
  assert.equal(env.overlay.style.transform, entering);
  assert.equal(env.overlay.getAnimations().length, 1);
  await env.finishCover(second);
  env.dispose();
});

test('aborting during preparation or the hold clears animations and timers', async () => {
  for (const duringHold of [false, true]) {
    const env = environment();
    const navigation = env.begin();
    if (duringHold) {
      env.animations[0].finish();
      await flush();
      assert.equal(env.timers.size, 1);
    }
    navigation.controller.abort();
    await navigation.loading;
    assert.equal(env.overlay.getAnimations().length, 0);
    assert.equal(env.timers.size, 0);
    assert.equal(env.document.documentElement.dataset.swipePhase, undefined);
    env.dispose();
  }
});

test('an aborted swap cannot reveal over a newer navigation', async () => {
  const env = environment();
  const first = env.begin();
  await env.finishCover(first);
  const oldNative = env.swap(first);
  first.controller.abort();
  const second = env.begin();
  oldNative.finish();
  await flush();
  assert.equal(env.animations.length, 2, 'Only the two cover animations were started');
  assert.equal(env.document.documentElement.dataset.swipePhase, 'covering');
  await env.finishCover(second);
  env.dispose();
});

test('failed or rejected navigation removes the cover', async () => {
  const env = environment();
  const navigation = env.begin({ loader: async () => { throw new Error('Network failed'); } });
  await assert.rejects(navigation.loading, /Network failed/);
  assert.equal(env.overlay.getAnimations().length, 0);
  assert.equal(env.document.documentElement.dataset.swipePhase, undefined);
  const rejected = env.begin();
  rejected.event.preventDefault();
  await env.finishCover(rejected);
  assert.equal(env.document.documentElement.dataset.swipePhase, undefined);
  env.dispose();
});

test('reloads, cached page restoration, and script replacement never replay a partial swipe', async () => {
  for (const reset of [
    (env) => env.window.dispatchEvent(new Event('pagehide')),
    (env) => env.window.dispatchEvent(new Event('pageshow')),
    (env) => env.restart(),
  ]) {
    const env = environment();
    assert.equal(env.animations.length, 0, 'Initial page loads have no wipe');
    const first = env.begin();
    await env.finishCover(first);
    const native = env.swap(first);
    native.finish();
    await flush();
    reset(env);
    await flush();
    assert.equal(env.overlay.getAnimations().length, 0);
    assert.equal(env.document.documentElement.dataset.swipePhase, undefined);
    const count = env.animations.length;
    const next = env.begin();
    assert.equal(env.animations.length, count + 1, 'Exactly one listener wraps the next navigation');
    await env.finishCover(next);
    env.dispose();
  }
});

test('reduced motion skips both the custom wipe and the native snapshot effect', async () => {
  const env = environment({ reduced: true });
  const first = env.begin();
  await first.loading;
  const native = env.swap(first);
  native.finish();
  await flush();
  assert.equal(native.skips, 1);
  assert.equal(env.animations.length, 0);
  env.media.matches = false;
  const next = env.begin();
  env.media.matches = true;
  env.media.dispatchEvent(new Event('change'));
  await next.loading;
  assert.equal(env.overlay.getAnimations().length, 0);
  assert.equal(env.document.documentElement.dataset.swipePhase, undefined);
  env.dispose();
});
