import assert from 'node:assert/strict';
import test from 'node:test';
import { createPhysicalMotion } from '../src/lib/physical-motion.ts';

function simulation() {
  const frames = new Map();
  let id = 0;
  let time = 0;
  const motion = createPhysicalMotion({
    request(callback) { frames.set(++id, callback); return id; },
    cancel(key) { frames.delete(key); },
  });
  const tick = (milliseconds = 1000 / 60) => {
    time += milliseconds;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(time));
  };
  const settle = () => {
    for (let index = 0; frames.size && index < 120; index++) tick();
    assert.equal(frames.size, 0, 'The simulation must stop requesting frames at rest');
  };
  return { motion, frames, tick, settle };
}

test('Matter springs start with an impulse and settle after a small overshoot', () => {
  const { motion, frames, tick, settle } = simulation();
  const positions = [];
  const title = motion.value(0, { frequency: 36, damping: .72, launch: .65 }, (value) => positions.push(value));
  assert.equal(frames.size, 0, 'No idle engine loop');
  title.to(400);
  assert.equal(title.value, 0, 'An impulse changes velocity without teleporting the title');
  assert.ok(title.velocity > 0, 'Motion starts immediately');
  for (let index = 0; index < 5; index++) tick();
  assert.ok(title.value > 380, 'The title covers most of its distance in the first 85ms');
  settle();
  assert.equal(title.value, 400);
  assert.equal(title.velocity, 0);
  assert.ok(Math.max(...positions) > 400 && Math.max(...positions) < 412, 'A restrained spring overshoot');
  motion.dispose();
});

test('retargeting preserves position and momentum, with one shared frame loop', () => {
  const { motion, frames, tick, settle } = simulation();
  const first = motion.value(0, { frequency: 22, damping: .82 }, () => {});
  const second = motion.value(0, { frequency: 24, damping: 1 }, () => {});
  first.to(400);
  second.to(200);
  for (let index = 0; index < 4; index++) tick();
  const before = [first.value, first.velocity];
  first.to(-100);
  assert.deepEqual([first.value, first.velocity], before, 'A reversal keeps the current physical state');
  assert.equal(frames.size, 1, 'Both bodies share one engine and frame loop');
  settle();
  assert.equal(first.value, -100);
  assert.equal(second.value, 200);
  motion.dispose();
});

test('a release drops from the current height, accelerates downward, and lands with a small rebound', () => {
  const { motion, tick, settle } = simulation();
  const impacts = [];
  const title = motion.value(0, { frequency: 36, damping: .72, launch: .65 }, (_, __, impact) => {
    if (impact) impacts.push(impact);
  });
  title.bounds(-408, 0);
  title.to(-400);
  tick();
  tick();
  const releasedAt = title.value;
  assert.ok(releasedAt < 0 && releasedAt > -400, 'Release before the pickup finishes');
  title.drop(0, { gravity: 12000, restitution: .1 });
  assert.equal(title.value, releasedAt, 'Releasing cannot teleport to the top or bottom');
  assert.equal(title.velocity, 0, 'Release immediately stops the upward pull');
  let previousSpeed = 0;
  let elapsed = 0;
  while (!impacts.length && elapsed < 400) {
    tick();
    elapsed += 1000 / 60;
    assert.ok(title.value >= releasedAt && title.value <= 0, 'Never finish the ascent after release');
    if (!impacts.length) {
      assert.ok(title.velocity > previousSpeed, 'The fall accelerates rather than easing into its destination');
      previousSpeed = title.velocity;
    }
  }
  assert.ok(impacts.length > 0 && elapsed < 300, 'The first landing is quick');
  assert.ok(title.velocity < 0, 'Landing rebounds upward instead of penetrating the floor');
  settle();
  assert.equal(title.value, 0);
  assert.equal(title.velocity, 0);
  motion.dispose();
});

test('picking up a falling body retains its current position and momentum', () => {
  const { motion, tick, settle } = simulation();
  const title = motion.value(-400, { frequency: 36, damping: .72, launch: .65 }, () => {});
  title.drop(0, { gravity: 12000, restitution: .1 });
  for (let i = 0; i < 5; i++) tick();
  assert.ok(title.velocity > 0);
  const before = [title.value, title.velocity];
  title.to(-400);
  assert.deepEqual([title.value, title.velocity], before, 'Regrabbing does not restart from either endpoint');
  for (let i = 0; i < 4; i++) tick();
  assert.ok(title.velocity < 0, 'The grip overcomes downward momentum');
  settle();
  assert.equal(title.value, -400);
  motion.dispose();
});

test('a render callback can wake another body without duplicating the frame loop', () => {
  const { motion, frames, tick, settle } = simulation();
  const material = motion.value(0, { frequency: 32, damping: .65, precision: .0001 }, () => {});
  const title = motion.value(0, { frequency: 36, damping: .72, launch: .65 }, () => material.to(.02));
  title.to(-400);
  for (let i = 0; i < 10; i++) {
    tick();
    assert.equal(frames.size, 1, 'Coupled motion shares one pending frame');
  }
  settle();
  material.kick(-1);
  tick();
  material.snap(0);
  assert.equal(frames.size, 0, 'Stopping coupled motion cancels every pending frame');
  motion.dispose();
});

test('fixed steps give the same position at different refresh rates and cap long pauses', () => {
  const snapshots = [60, 120, 144].map((rate) => {
    const { motion, tick } = simulation();
    const value = motion.value(0, { frequency: 10, damping: .82 }, () => {});
    value.to(400);
    tick(0);
    for (let index = 0; index < rate / 4; index++) tick(1000 / rate);
    const position = value.value;
    motion.dispose();
    return position;
  });
  assert.ok(snapshots.every((position) => position > 0 && position < 400), 'Compare trajectories before they settle');
  assert.ok(Math.max(...snapshots) - Math.min(...snapshots) < .001);
  const { motion, tick } = simulation();
  const value = motion.value(0, { frequency: 22, damping: .82 }, () => {});
  value.to(400);
  tick(0);
  tick(60_000);
  assert.ok(value.value > 0 && value.value < 300, 'A suspended tab cannot cause a huge physics step');
  motion.dispose();
});

test('bounds, snapping, and disposal stop movement without leaked callbacks', () => {
  const { motion, frames, tick, settle } = simulation();
  let updates = 0;
  const value = motion.value(0, { frequency: 36, damping: .72, launch: .65 }, () => updates++);
  value.bounds(0, 250);
  value.to(500);
  settle();
  assert.equal(value.value, 250);
  value.to(0);
  tick();
  value.bounds(100, 120);
  assert.ok(value.value >= 100 && value.value <= 120);
  value.snap(110);
  assert.equal(value.value, 110);
  assert.equal(value.velocity, 0);
  assert.equal(frames.size, 0);
  value.to(100);
  const staleFrame = [...frames.values()][0];
  motion.dispose();
  const count = updates;
  staleFrame(500);
  value.to(120);
  assert.equal(updates, count);
  assert.equal(frames.size, 0);
});
