import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseGlyphContrast, chooseHeaderContrast, composite, contrastRatio, imagePoint, luminance } from '../src/lib/header-contrast.ts';

test('relative luminance and contrast match black/white reference values', () => {
  assert.equal(luminance([0, 0, 0]), 0);
  assert.equal(luminance([255, 255, 255]), 1);
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]), 21);
});

test('solid page surfaces select a readable tone', () => {
  assert.deepEqual(chooseHeaderContrast([[255, 255, 255]]), { tone: 'dark' });
  assert.deepEqual(chooseHeaderContrast([[9, 9, 9]]), { tone: 'light' });
  assert.deepEqual(chooseHeaderContrast([[255, 250, 145]]), { tone: 'dark' });
  assert.deepEqual(chooseHeaderContrast([[128, 128, 128]]), { tone: 'dark' });
});

test('mixed photographs choose the stronger local contrast without a background', () => {
  const photograph = [...Array(14).fill([240, 240, 240]), [5, 5, 5]];
  assert.deepEqual(chooseHeaderContrast(photograph, 'dark'), { tone: 'light' });
});

test('unreadable or missing image data retains the previous tone when available', () => {
  assert.deepEqual(chooseHeaderContrast([[255, 255, 255]], 'light', true), { tone: 'light' });
  assert.deepEqual(chooseHeaderContrast([], 'light'), { tone: 'light' });
  assert.deepEqual(chooseHeaderContrast([]), { tone: 'dark' });
});

test('the foreground switches when its previous colour loses contrast', () => {
  assert.deepEqual(chooseHeaderContrast([[120, 120, 120]], 'light'), { tone: 'dark' });
  assert.deepEqual(chooseHeaderContrast([[118, 118, 118]], 'dark'), { tone: 'light' });
});

test('page-coloured light tones are scored instead of pure white', () => {
  const gray = [[118, 118, 118]];
  assert.deepEqual(chooseHeaderContrast(gray, 'dark', false, [250, 249, 246]), { tone: 'dark' });
  assert.deepEqual(chooseHeaderContrast(gray, 'dark', false, [255, 250, 145]), { tone: 'dark' });
  assert.deepEqual(chooseHeaderContrast([[110, 110, 110]], 'dark', false, [255, 250, 145]), { tone: 'light' });
});

test('the stronger tone wins even when neither reaches the contrast target', () => {
  const gray = [119, 119, 119];
  assert.ok(contrastRatio([9, 9, 9], gray) < 4.5);
  assert.ok(contrastRatio([255, 255, 255], gray) < 4.5);
  assert.deepEqual(chooseHeaderContrast([gray], 'dark'), { tone: 'light' });
});

test('transparent surface colours composite with the visible layer underneath', () => {
  const foreground = [255, 255, 255];
  const background = [9, 9, 9];
  assert.deepEqual(composite(foreground, 0, background), background);
  assert.deepEqual(composite(foreground, 1, background), foreground);
  assert.deepEqual(composite(foreground, 0.5, background), [132, 132, 132]);
});

test('neighbouring letters react independently as a dark image edge moves beneath them', () => {
  const viewport = { width: 200, height: 100 };
  const letters = [
    { left: 10, top: 20, width: 8, height: 16 },
    { left: 20, top: 20, width: 8, height: 16 },
  ];
  const sampleAtEdge = (edge) => (x) => ({
    color: x < edge ? [9, 9, 9] : [255, 255, 255],
    uncertain: false,
  });
  const first = letters.map((bounds) => chooseGlyphContrast(bounds, viewport, sampleAtEdge(19)).tone);
  assert.deepEqual(first, ['light', 'dark']);
  const moved = letters.map((bounds, index) => chooseGlyphContrast(bounds, viewport, sampleAtEdge(30), first[index]).tone);
  assert.deepEqual(moved, ['light', 'light']);
  const reversed = letters.map((bounds, index) => chooseGlyphContrast(bounds, viewport, sampleAtEdge(0), moved[index]).tone);
  assert.deepEqual(reversed, ['dark', 'dark']);
});

test('stacked logo letters sample their own row', () => {
  const viewport = { width: 200, height: 100 };
  const sample = (_x, y) => ({ color: y < 40 ? [9, 9, 9] : [255, 255, 255], uncertain: false });
  assert.deepEqual(chooseGlyphContrast({ left: 10, top: 20, width: 10, height: 15 }, viewport, sample), { tone: 'light' });
  assert.deepEqual(chooseGlyphContrast({ left: 10, top: 45, width: 10, height: 15 }, viewport, sample), { tone: 'dark' });
});

test('unreadable image data retains only the affected letter colour', () => {
  const viewport = { width: 200, height: 100 };
  const sample = (x) => ({ color: [255, 255, 255], uncertain: x < 20 });
  assert.deepEqual(chooseGlyphContrast({ left: 10, top: 20, width: 8, height: 16 }, viewport, sample, 'light'), { tone: 'light' });
  assert.deepEqual(chooseGlyphContrast({ left: 20, top: 20, width: 8, height: 16 }, viewport, sample, 'light'), { tone: 'dark' });
});

test('hidden and offscreen letters do not read outside the viewport', () => {
  const viewport = { width: 200, height: 100 };
  let samples = 0;
  const sample = (x, y) => {
    samples++;
    assert.ok(x >= 0 && x < viewport.width && y >= 0 && y < viewport.height);
    return { color: [255, 255, 255], uncertain: false };
  };
  assert.deepEqual(chooseGlyphContrast({ left: 0, top: 0, width: 0, height: 0 }, viewport, sample, 'light'), { tone: 'light' });
  assert.deepEqual(chooseGlyphContrast({ left: -30, top: 20, width: 8, height: 16 }, viewport, sample, 'light'), { tone: 'light' });
  assert.equal(samples, 0);
  assert.deepEqual(chooseGlyphContrast({ left: -4, top: 20, width: 8, height: 16 }, viewport, sample), { tone: 'dark' });
  assert.ok(samples > 0);
});

const box = { width: 200, height: 200 };
const source = { width: 400, height: 200 };

test('cover sampling follows the actual cropped part of a wide photograph', () => {
  assert.deepEqual(imagePoint({ x: 0, y: 100 }, box, source, 'cover', '50% 50%'), { x: 100, y: 100 });
  assert.deepEqual(imagePoint({ x: 200, y: 100 }, box, source, 'cover', '50% 50%'), { x: 300, y: 100 });
  assert.deepEqual(imagePoint({ x: 0, y: 100 }, box, source, 'cover', '100% 50%'), { x: 200, y: 100 });
});

test('contain sampling excludes letterboxing and maps the image centre', () => {
  assert.equal(imagePoint({ x: 100, y: 20 }, box, source, 'contain', '50% 50%'), null);
  assert.deepEqual(imagePoint({ x: 100, y: 100 }, box, source, 'contain', '50% 50%'), { x: 200, y: 100 });
});
