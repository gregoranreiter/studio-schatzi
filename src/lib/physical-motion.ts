import Matter from 'matter-js';

const { Bodies, Body, Composite, Engine, Sleeping } = Matter;
const step = 1000 / 120;

interface Spring {
  frequency: number;
  damping: number;
  launch?: number;
  precision?: number;
}

interface Drop {
  gravity: number;
  restitution: number;
}

export interface PhysicalValue {
  readonly value: number;
  readonly velocity: number;
  to(target: number): void;
  drop(floor: number, options: Drop): void;
  kick(velocity: number): void;
  snap(value: number): void;
  stop(): void;
  bounds(min: number, max: number): void;
}

/** Scalar Matter bodies keep DOM movement on its intended axis, without a canvas. */
export function createPhysicalMotion(clock: {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
}) {
  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
  const values: Array<{
    body: Matter.Body;
    spring: Spring;
    target: number;
    moving: boolean;
    min: number;
    max: number;
    fall: Drop | null;
    impact: number;
    render: (value: number, velocity: number, impact: number) => void;
  }> = [];
  let frame = 0;
  let previous: number | null = null;
  let accumulator = 0;
  let disposed = false;

  const cancelIdle = () => {
    if (values.some((value) => value.moving)) return;
    clock.cancel(frame);
    frame = 0;
    previous = null;
    accumulator = 0;
  };
  const tick: FrameRequestCallback = (time) => {
    frame = 0;
    if (disposed) return;
    // Fixed steps make springs independent of display refresh rate. Discard tab pauses.
    accumulator += previous === null ? step : Math.min(50, Math.max(0, time - previous));
    previous = time;
    const changed = values.filter((value) => value.moving);
    changed.forEach((value) => { value.impact = 0; });
    while (accumulator + 1e-6 >= step) {
      for (const value of values) {
        if (!value.moving) continue;
        const { body, spring, target } = value;
        const speed = Body.getVelocity(body).x * 60;
        const acceleration = value.fall?.gravity ?? (spring.frequency ** 2 * (target - body.position.x)
          - 2 * spring.damping * spring.frequency * speed);
        // Matter integrates force in milliseconds; spring constants use seconds.
        Body.applyForce(body, body.position, { x: body.mass * acceleration / 1e6, y: 0 });
      }
      Engine.update(engine, step);
      for (const value of values) {
        if (!value.moving) continue;
        const { body, spring, target, min, max } = value;
        if (value.fall && body.position.x >= target) {
          const impact = Math.max(0, Body.getVelocity(body).x * 60);
          const rebound = impact * value.fall.restitution;
          value.impact = Math.max(value.impact, impact);
          Body.setPosition(body, { x: target, y: 0 });
          // Resolve a small elastic landing on the original baseline.
          if (rebound < 65) {
            Body.setVelocity(body, { x: 0, y: 0 });
            Sleeping.set(body, true);
            value.moving = false;
          } else Body.setVelocity(body, { x: -rebound / 60, y: 0 });
          continue;
        }
        const bounded = Math.min(max, Math.max(min, body.position.x));
        if (bounded !== body.position.x) {
          Body.setPosition(body, { x: bounded, y: 0 });
          Body.setVelocity(body, { x: 0, y: 0 });
        }
        const precision = spring.precision ?? .1;
        if (!value.fall && Math.abs(target - body.position.x) <= precision
          && Math.abs(Body.getVelocity(body).x * 60) <= precision * spring.frequency) {
          Body.setPosition(body, { x: target, y: 0 });
          Body.setVelocity(body, { x: 0, y: 0 });
          Sleeping.set(body, true);
          value.moving = false;
        }
      }
      accumulator -= step;
    }
    changed.forEach((value) => value.render(value.body.position.x, Body.getVelocity(value.body).x * 60, value.impact));
    // A render callback can wake another body, which may already have queued a frame.
    if (values.some((value) => value.moving)) {
      if (!frame) frame = clock.request(tick);
    } else cancelIdle();
  };

  return {
    value(initial: number, spring: Spring, render: (value: number, velocity: number, impact: number) => void): PhysicalValue {
      const body = Bodies.rectangle(initial, 0, 1, 1, {
        frictionAir: 0, inertia: Infinity, collisionFilter: { mask: 0 },
      });
      Sleeping.set(body, true);
      Composite.add(engine.world, body);
      const state = { body, spring, target: initial, moving: false, min: -Infinity, max: Infinity, fall: null as Drop | null, impact: 0, render };
      values.push(state);
      const snap = (position: number) => {
        if (disposed) return;
        state.target = Math.min(state.max, Math.max(state.min, position));
        state.moving = false;
        state.fall = null;
        state.impact = 0;
        Body.setPosition(body, { x: state.target, y: 0 });
        Body.setVelocity(body, { x: 0, y: 0 });
        Sleeping.set(body, true);
        render(state.target, 0, 0);
        cancelIdle();
      };
      return {
        get value() { return body.position.x; },
        get velocity() { return Body.getVelocity(body).x * 60; },
        to(target) {
          if (disposed) return;
          target = Math.min(state.max, Math.max(state.min, target));
          if (target === state.target && !state.fall) return;
          state.fall = null;
          state.target = target;
          // An initial impulse avoids a slow ease-in; retargeting retains momentum.
          if (!state.moving && spring.launch) {
            Body.setVelocity(body, { x: (target - body.position.x) * spring.frequency * spring.launch / 60, y: 0 });
          }
          state.moving = true;
          Sleeping.set(body, false);
          if (!frame) frame = clock.request(tick);
        },
        drop(floor, options) {
          if (disposed) return;
          floor = Math.min(state.max, Math.max(state.min, floor));
          if (state.fall && floor === state.target) return;
          if (!state.moving && body.position.x === floor) return;
          state.target = floor;
          state.fall = options;
          // Releasing the grip cancels the upward pull without moving the body.
          Body.setVelocity(body, { x: Math.max(0, Body.getVelocity(body).x), y: 0 });
          state.moving = true;
          Sleeping.set(body, false);
          if (!frame) frame = clock.request(tick);
        },
        kick(velocity) {
          if (disposed || !velocity) return;
          state.fall = null;
          Body.setVelocity(body, { x: Body.getVelocity(body).x + velocity / 60, y: 0 });
          state.moving = true;
          Sleeping.set(body, false);
          if (!frame) frame = clock.request(tick);
        },
        snap,
        stop() { snap(body.position.x); },
        bounds(min, max) {
          if (disposed) return;
          state.min = min;
          state.max = Math.max(min, max);
          state.target = Math.min(state.max, Math.max(min, state.target));
          const position = Math.min(state.max, Math.max(min, body.position.x));
          if (position !== body.position.x) {
            Body.setPosition(body, { x: position, y: 0 });
            Body.setVelocity(body, { x: 0, y: 0 });
            render(position, 0, 0);
          }
        },
      };
    },
    dispose() {
      disposed = true;
      clock.cancel(frame);
      frame = 0;
      values.length = 0;
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    },
  };
}
