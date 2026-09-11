"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { SPRING, SpringValue, ticker, type SpringConfig } from "./spring";

/**
 * Whether this visitor has asked for less movement.
 *
 * Read as a subscription rather than once on mount: it can change while the
 * page is open, on a Mac from the menu bar, and a component that sampled it at
 * mount keeps animating at somebody who just asked it to stop.
 *
 * Starts false and corrects itself after mount. The server has no idea what
 * the visitor prefers, so any other starting value is a hydration mismatch.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
};

export interface SpringController {
  /** Animate to a target, optionally handing over the gesture's velocity. */
  to: (target: number, options?: { velocity?: number; config?: SpringConfig }) => void;
  /** Put the value there this frame. For 1:1 tracking under a finger. */
  set: (value: number) => void;
  /** Freeze wherever it currently is on screen. */
  stop: () => void;
  /** The live, on-screen value. Read this on interrupt, never the target. */
  readonly current: number;
  readonly velocity: number;
  readonly target: number;
}

/**
 * A spring wired to a React component, without React re-rendering per frame.
 *
 * `apply` writes straight to the DOM node. Sixty state updates a second would
 * be sixty reconciliations for a number that only ever ends up in a transform,
 * and the frame budget goes on React instead of on the animation.
 *
 * The loop only runs while something is moving, and unsubscribes the moment the
 * spring settles, so an idle page costs nothing.
 */
export const useSpringValue = (
  initial: number,
  apply: (value: number) => void,
  config: SpringConfig = SPRING.move,
  epsilon = 0.4,
): SpringController => {
  const spring = useRef<SpringValue>(null as unknown as SpringValue);
  if (spring.current === null) spring.current = new SpringValue(initial, config, epsilon);

  const applyRef = useRef(apply);
  applyRef.current = apply;

  const unsubscribe = useRef<(() => void) | null>(null);

  const halt = useCallback(() => {
    unsubscribe.current?.();
    unsubscribe.current = null;
  }, []);

  const run = useCallback(() => {
    if (unsubscribe.current) return;
    unsubscribe.current = ticker.add((dt) => {
      const done = spring.current.step(dt);
      applyRef.current(spring.current.value);
      if (done) halt();
    });
  }, [halt]);

  useEffect(() => halt, [halt]);

  return {
    to: (target, options) => {
      if (options?.velocity !== undefined) spring.current.setVelocity(options.velocity);
      spring.current.setTarget(target, options?.config);
      run();
    },
    set: (value) => {
      halt();
      spring.current.set(value).setTarget(value).setVelocity(0);
      applyRef.current(value);
    },
    stop: () => {
      halt();
      // Leave the value where it is on screen and keep the velocity: a finger
      // landing on something in flight should catch it at that speed, not
      // reset it to a standstill under the fingertip.
      spring.current.setTarget(spring.current.value);
    },
    get current() {
      return spring.current.value;
    },
    get velocity() {
      return spring.current.velocity;
    },
    get target() {
      return spring.current.target;
    },
  };
};

/**
 * Press feedback that arrives on the way down.
 *
 * Waiting for the click event to show anything is the single most common way a
 * web interface gives itself away: the press is acknowledged after the decision
 * has already been made, which is too late to be feedback. This fires on
 * pointerdown.
 *
 * It also lets go properly. Drag off the control and the highlight drops, drag
 * back and it returns, which is what every native button does and what makes it
 * safe to commit on release rather than on touch.
 */
export const usePress = <T extends HTMLElement>(
  ref: RefObject<T | null>,
): { pressed: boolean } => {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let active = false;

    const within = (event: PointerEvent): boolean => {
      const box = node.getBoundingClientRect();
      // Ten pixels of slack all round. Fingers drift during a press, and a
      // control that cancels on two pixels of drift feels broken rather than
      // precise.
      const slack = 10;
      return (
        event.clientX >= box.left - slack &&
        event.clientX <= box.right + slack &&
        event.clientY >= box.top - slack &&
        event.clientY <= box.bottom + slack
      );
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      active = true;
      setPressed(true);
    };
    const onMove = (event: PointerEvent) => {
      if (!active) return;
      setPressed(within(event));
    };
    const onUp = () => {
      active = false;
      setPressed(false);
    };

    node.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      node.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ref]);

  return { pressed };
};
