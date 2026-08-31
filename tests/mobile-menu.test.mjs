import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeMobileMenu } from '../src/scripts/mobile-menu.ts';

function environment() {
  const document = new EventTarget();
  const window = new EventTarget();
  const attributes = new Map();
  const root = { dataset: {}, toggleAttribute: (name, enabled) => enabled ? attributes.set(name, '') : attributes.delete(name) };
  const trigger = Object.assign(new EventTarget(), { hidden: true, setAttribute: (name, value) => attributes.set(name, value) });
  const dismiss = new EventTarget();
  const links = [new EventTarget(), new EventTarget()];
  const header = { dataset: {} };
  const menu = Object.assign(new EventTarget(), {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; this.dispatchEvent(new Event('close')); },
    querySelector: () => dismiss,
    querySelectorAll: () => links,
  });
  const mobile = Object.assign(new EventTarget(), { matches: true });
  document.documentElement = root;
  document.querySelector = (selector) => ({ '[data-menu-toggle]': trigger, '#mobile-navigation': menu, '.site-header': header })[selector];
  window.matchMedia = () => mobile;
  const mount = () => initializeMobileMenu(document, window);
  const dispose = mount();
  const open = () => trigger.dispatchEvent(new Event('click'));
  const assertClosed = () => {
    assert.equal(menu.open, false);
    assert.equal(attributes.get('aria-expanded'), 'false');
    assert.equal(attributes.has('data-mobile-menu-open'), false, 'Closing must release the page scroll lock');
  };
  return { document, window, root, header, trigger, menu, dismiss, links, mobile, attributes, mount, dispose, open, assertClosed };
}

test('mobile menu opens with its expanded state and closes through button or keyboard', () => {
  const env = environment();
  assert.equal(env.trigger.hidden, false);
  for (const dismiss of [
    () => env.dismiss.dispatchEvent(new Event('click')),
    () => env.menu.dispatchEvent(new Event('cancel', { cancelable: true })),
    () => env.menu.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' })),
  ]) {
    env.open();
    assert.equal(env.menu.open, true);
    assert.equal(env.attributes.get('aria-expanded'), 'true');
    assert.equal(env.attributes.has('data-mobile-menu-open'), true);
    dismiss();
    env.assertClosed();
  }
  env.dispose();
});

test('page links, navigation and history restoration always release the menu', () => {
  const env = environment();
  for (const [target, type] of [
    [env.links[0], 'click'], [env.links[1], 'click'],
    [env.document, 'astro:before-preparation'], [env.document, 'astro:before-swap'],
    [env.window, 'pagehide'], [env.window, 'pageshow'],
  ]) {
    env.open();
    target.dispatchEvent(new Event(type));
    env.assertClosed();
  }
  env.dispose();
});

test('resizing to desktop closes the mobile dialog and cannot reopen it', () => {
  const env = environment();
  env.open();
  env.mobile.matches = false;
  env.mobile.dispatchEvent(new Event('change'));
  env.assertClosed();
  env.open();
  env.assertClosed();
  env.mobile.matches = true;
  env.mobile.dispatchEvent(new Event('change'));
  env.open();
  assert.equal(env.menu.open, true);
  env.dispose();
});

test('disposal releases scroll and removes old listeners before remounting', () => {
  const env = environment();
  env.open();
  env.dispose();
  env.assertClosed();
  assert.equal(env.trigger.hidden, true);
  assert.equal(env.root.dataset.mobileMenuReady, undefined);
  assert.equal(env.header.dataset.mobileMenuReady, undefined);
  env.open();
  env.assertClosed();
  const dispose = env.mount();
  env.open();
  assert.equal(env.menu.open, true);
  dispose();
  env.assertClosed();
});
