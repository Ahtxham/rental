/**
 * The motion engine for everything a finger can touch.
 *
 * A spring rather than a duration, for one reason: a duration-based animation
 * has already decided how the next 400ms will go, so new input has to wait its
 * turn or cut in with a visible jump. A spring only ever knows a target, so
 * changing the target mid-flight is not an interruption at all, it is just the
 * next frame. That is what makes a moving thing feel grabbable.
 *
 * Parameters are Apple's two rather than the physics triplet, because mass,
 * stiffness and damping are three numbers you have to tune together and these
 * two can each be reasoned about alone:
 *
 *   damping   1 settles without overshoot. Below 1 it overshoots and comes
 *             back. Reach for bounce only when the gesture that started the
 *             motion carried momentum, a flick or a throw. A menu that simply
 *             appeared has no momentum to express, and bouncing it reads as
 *             decoration.
 *   response  roughly how long the value takes to arrive, in seconds. It is
 *             not a duration: a spring has no end time, the settle emerges
 *             from the numbers. Lower is snappier.
 */

export interface SpringConfig {
  /** Damping ratio. 1 = critically damped, < 1 overshoots. */
  damping: number;
  /** Response, in seconds. Lower is snappier. */
  response: number;
}

/** Apple's shipped values, named for the situation rather than the number. */
export const SPRING = {
  /** Repositioning something under the finger. No overshoot. */
  move: { damping: 1, response: 0.4 },
  /** After a flick. The small overshoot is the momentum, made visible. */
  fling: { damping: 0.82, response: 0.4 },
  /** Sheets and drawers arriving. */
  sheet: { damping: 0.82, response: 0.3 },
  /**
   * Sheets leaving.
   *
   * Quicker than the way in, and with the bounce taken out. Arriving is the
   * system introducing something and can afford a moment; leaving is the
   * system answering a decision already made, and anything that lingers there
   * reads as the interface not having heard you. Overshoot on the way out is
   * worse still: it puts a wobble on a thing you asked to go away.
   */
  sheetOut: { damping: 1, response: 0.24 },
  /** Small, immediate feedback: a press, a hover lift. */
  press: { damping: 1, response: 0.22 },
} as const satisfies Record<string, SpringConfig>;

/**
 * How far a flick would travel if nothing stopped it.
 *
 * This is the exponential decay a scroll view uses, not the textbook
 * v^2 / 2a. The difference is not academic: the textbook form under-throws at
 * low speed and over-throws at high speed, and the gap is exactly the range a
 * thumb flick lives in.
 *
 * Use it to pick the target, then hand the same velocity to the spring, so the
 * animation continues at the speed the finger left at instead of restarting.
 */
export const project = (velocity: number, decelerationRate = 0.998): number =>
  ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);

/**
 * Resistance past an edge, rather than a wall.
 *
 * A hard stop is indistinguishable from a frozen interface: the finger moves
 * and nothing does. Continuous resistance says "this is the end" while still
 * proving the surface is listening.
 */
export const rubberband = (overshoot: number, dimension: number, constant = 0.55): number =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * One scalar under spring control.
 *
 * Deliberately one dimension. A 2D spring solved on the distance between two
 * points desynchronises the moment x and y have different velocities, which is
 * most of the time, and the result drifts along a curve nobody asked for. Two
 * of these, one per axis, stay honest.
 */
export class SpringValue {
  value: number;
  velocity = 0;
  target: number;
  private config: SpringConfig;
  private epsilon: number;

  constructor(initial: number, config: SpringConfig = SPRING.move, epsilon = 0.4) {
    this.value = initial;
    this.target = initial;
    this.config = config;
    this.epsilon = epsilon;
  }

  /**
   * Aim somewhere new without touching the current velocity.
   *
   * Carrying the velocity across a re-target is the whole trick behind
   * reversing a gesture without hitting a brick wall. Zeroing it here, which is
   * what replacing one animation with another does, puts a discontinuity in the
   * exact frame the user changed their mind.
   */
  setTarget(target: number, config?: SpringConfig): this {
    this.target = target;
    if (config) this.config = config;
    return this;
  }

  /** Hand the spring the speed the finger was doing, in units per second. */
  setVelocity(velocity: number): this {
    this.velocity = velocity;
    return this;
  }

  /** Put the value somewhere immediately, mid-drag. */
  set(value: number): this {
    this.value = value;
    return this;
  }

  get settled(): boolean {
    return Math.abs(this.value - this.target) < this.epsilon && Math.abs(this.velocity) < this.epsilon * 10;
  }

  /**
   * Advance by `dt` seconds. Returns true once there is nothing left to do.
   *
   * Integrated in fixed sub-steps rather than one step of whatever the frame
   * happened to be. A stiff spring given a 200ms step, which is what a
   * backgrounded tab hands you on its first frame back, does not slow down, it
   * diverges, and the element leaves the building.
   */
  step(dt: number): boolean {
    if (this.settled) {
      this.value = this.target;
      this.velocity = 0;
      return true;
    }

    const omega = (2 * Math.PI) / this.config.response;
    const stiffness = omega * omega;
    const damping = 2 * this.config.damping * omega;

    let remaining = Math.min(dt, 0.064);
    const slice = 1 / 240;
    while (remaining > 0) {
      const h = Math.min(slice, remaining);
      const acceleration = -stiffness * (this.value - this.target) - damping * this.velocity;
      this.velocity += acceleration * h;
      this.value += this.velocity * h;
      remaining -= h;
    }

    if (this.settled) {
      this.value = this.target;
      this.velocity = 0;
      return true;
    }
    return false;
  }
}

/**
 * One requestAnimationFrame loop, shared.
 *
 * Every spring on the page ticks from the same frame, which keeps things that
 * move together actually together, and means a page with a rail, a sheet and
 * four hover states does not have six loops competing for the same 16ms.
 */
class Ticker {
  private subscribers = new Set<(dt: number) => void>();
  private frame = 0;
  private last = 0;

  add(fn: (dt: number) => void): () => void {
    this.subscribers.add(fn);
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
    return () => this.remove(fn);
  }

  private remove(fn: (dt: number) => void): void {
    this.subscribers.delete(fn);
    if (this.subscribers.size === 0 && this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private tick = (now: number): void => {
    const dt = (now - this.last) / 1000;
    this.last = now;
    for (const fn of this.subscribers) fn(dt);
    this.frame = this.subscribers.size > 0 ? requestAnimationFrame(this.tick) : 0;
  };
}

export const ticker = new Ticker();

/**
 * A short history of where the pointer has been, so a release knows how fast
 * it was going.
 *
 * The last two events are not enough. Fingers stop moving for a frame or two
 * before they lift, and a velocity read from that window is zero, which turns
 * every flick into a gentle placement. Measuring across a window that ignores
 * the dead tail is the difference between throwing something and putting it
 * down.
 */
export class VelocityTracker {
  private samples: { value: number; time: number }[] = [];

  reset(value: number): void {
    this.samples = [{ value, time: performance.now() }];
  }

  add(value: number): void {
    const now = performance.now();
    this.samples.push({ value, time: now });
    while (this.samples.length > 2 && now - this.samples[0].time > 120) this.samples.shift();
  }

  /** Units per second. */
  get velocity(): number {
    if (this.samples.length < 2) return 0;
    const last = this.samples[this.samples.length - 1];
    const first = this.samples[0];
    const elapsed = (last.time - first.time) / 1000;
    if (elapsed <= 0.001) return 0;
    return (last.value - first.value) / elapsed;
  }
}
