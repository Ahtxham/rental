"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { SPRING, VelocityTracker, clamp, project, rubberband } from "@/lib/spring";
import { useReducedMotion, useSpringValue } from "@/lib/use-motion";

/**
 * A row of cards you can take hold of.
 *
 * The whole point of this component is the half-second after you let go. A
 * carousel that jumps to the next slide on release has thrown away everything
 * the gesture told it; this one keeps the speed your finger was doing, works
 * out where that speed would have carried the row, and picks the card nearest
 * to THAT. Flick it hard and it travels. Nudge it and it moves one card. You
 * never had to learn the difference.
 *
 * Three things it also does, all of which are the reason this is not twenty
 * lines:
 *
 * - It can be caught. Grab the row while it is still gliding and it stops dead
 *   under your finger, at the speed it was doing, and carries on from there.
 * - It resists at the ends instead of stopping. The row still follows your
 *   finger past the last card, just less and less, which says "this is the end"
 *   while proving the surface is still listening.
 * - It is not only a drag. Trackpads get their own path, arrows move a card at
 *   a time, and tabbing to a card brings it into view. Making a gesture the
 *   only way to reach something is how you lose the people who cannot perform
 *   it.
 */
export const Rail = ({
  children,
  className,
  label,
  trackClassName,
}: {
  children: React.ReactNode;
  className?: string;
  /** Announced to screen readers, which have no heading nearby to go on. */
  label: string;
  /**
   * Padding on the track, which is also the row's alignment.
   *
   * A class rather than a number, and the maths below reads the resulting
   * padding back off the element: the inset that lines a full-bleed row up
   * with the page's text margin is a `max()` of two viewport expressions, and
   * that belongs in CSS, where it re-evaluates on resize by itself.
   */
  trackClassName?: string;
}) => {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const offset = useRef(0);
  const bounds = useRef({ min: 0, max: 0 });
  const snaps = useRef<number[]>([]);
  const gutter = useRef(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const paint = useCallback((value: number) => {
    offset.current = value;
    if (track.current) track.current.style.transform = `translate3d(${value}px, 0, 0)`;
    const { min } = bounds.current;
    setAtStart(value > -4);
    setAtEnd(value < min + 4);
  }, []);

  const spring = useSpringValue(0, paint, SPRING.move, 0.3);

  /**
   * Where a card would sit if it were the first one on screen.
   *
   * Measured from the DOM rather than from a card width passed in as a prop,
   * so the row is still correct when the cards are not all the same width, and
   * still correct after a font loads and reflows them. A hard-coded width is a
   * carousel that is subtly wrong on exactly one device.
   */
  const measure = useCallback(() => {
    const view = viewport.current;
    const row = track.current;
    if (!view || !row) return;
    const min = Math.min(0, view.clientWidth - row.scrollWidth);
    bounds.current = { min, max: 0 };
    gutter.current = parseFloat(getComputedStyle(row).paddingInlineStart) || 0;
    snaps.current = Array.from(row.children).map((child) =>
      clamp(-((child as HTMLElement).offsetLeft - gutter.current), min, 0),
    );
    if (offset.current < min) spring.to(min, { config: SPRING.move });
    else paint(offset.current);
    // `spring` is a stable controller object; listing it would re-run this on
    // every render for no change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint]);

  useEffect(() => {
    measure();
    const view = viewport.current;
    const row = track.current;
    if (!view || !row) return;
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(row);
    return () => observer.disconnect();
  }, [measure]);

  const nearestSnap = useCallback((value: number): number => {
    const list = snaps.current;
    if (list.length === 0) return value;
    return list.reduce((best, point) =>
      Math.abs(point - value) < Math.abs(best - value) ? point : best,
    );
  }, []);

  /** Land the row somewhere sensible, carrying whatever speed it had. */
  const settle = useCallback(
    (velocity: number) => {
      const { min } = bounds.current;
      const current = offset.current;

      // Past an edge is not a throw, it is a return, so it comes back
      // critically damped. Bouncing at a boundary on top of the rubber-band
      // stretch reads as two separate effects arguing.
      if (current > 0 || current < min) {
        spring.to(clamp(current, min, 0), { velocity, config: SPRING.move });
        return;
      }

      const projected = current + project(velocity);
      const target = clamp(nearestSnap(projected), min, 0);
      spring.to(target, {
        velocity,
        // Bounce only where momentum earned it. A slow drag that settles one
        // card along has none to express.
        config: Math.abs(velocity) > 120 ? SPRING.fling : SPRING.move,
      });
    },
    [nearestSnap, spring],
  );

  /* ── Dragging ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    const view = viewport.current;
    if (!view || reduced) return;

    const tracker = new VelocityTracker();
    let pointer: number | null = null;
    let startX = 0;
    let startY = 0;
    let startOffset = 0;
    let committed = false;
    let abandoned = false;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      committed = false;
      abandoned = false;
      // Catch it in flight. Reading the live transform rather than the target
      // is what stops the row jumping to where it was going the instant you
      // touch it.
      spring.stop();
      startOffset = offset.current;
      tracker.reset(0);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer || abandoned) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      /**
       * Decide what this gesture is before acting on it, then stop asking.
       *
       * Ten pixels of hysteresis, and whichever axis wins takes the whole
       * gesture. Without the axis test a horizontal row eats every attempt to
       * scroll the page that happens to begin on top of it, which on a phone
       * is most of them.
       */
      if (!committed) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          abandoned = true;
          pointer = null;
          return;
        }
        committed = true;
        view.setPointerCapture(event.pointerId);
      }

      const { min } = bounds.current;
      const raw = startOffset + dx;
      const width = view.clientWidth;
      let next = raw;
      if (raw > 0) next = rubberband(raw, width);
      else if (raw < min) next = min + rubberband(raw - min, width);

      tracker.add(dx);
      spring.set(next);
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      if (!committed) return;
      if (view.hasPointerCapture(event.pointerId)) view.releasePointerCapture(event.pointerId);
      settle(tracker.velocity);
    };

    /**
     * Swallow the click that follows a drag.
     *
     * Every card is a link, and without this, letting go of a 300px throw
     * navigates to whichever car happened to be under the finger. Capture
     * phase, so it never reaches the anchor.
     */
    const onClick = (event: MouseEvent) => {
      if (committed) {
        event.preventDefault();
        event.stopPropagation();
        committed = false;
      }
    };

    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onUp);
    view.addEventListener("pointercancel", onUp);
    view.addEventListener("click", onClick, true);
    return () => {
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onUp);
      view.removeEventListener("pointercancel", onUp);
      view.removeEventListener("click", onClick, true);
    };
  }, [reduced, settle, spring]);

  /* ── Trackpads ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const view = viewport.current;
    if (!view || reduced) return;

    let idle: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (event: WheelEvent) => {
      const dx = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
      if (dx === 0) return; // A vertical wheel belongs to the page, not to us.
      event.preventDefault();
      const { min } = bounds.current;
      spring.set(clamp(offset.current - dx, min - 40, 40));
      if (idle) clearTimeout(idle);
      // A trackpad has no "let go" event, so the end of the gesture is
      // inferred from the gap. The snap carries no velocity because by the
      // time we know the gesture is over, it has none.
      idle = setTimeout(() => settle(0), 90);
    };

    view.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      view.removeEventListener("wheel", onWheel);
      if (idle) clearTimeout(idle);
    };
  }, [reduced, settle, spring]);

  /* ── Everything that is not a gesture ──────────────────────────────────── */

  const step = useCallback(
    (direction: 1 | -1) => {
      const { min } = bounds.current;
      const list = snaps.current;
      const current = offset.current;
      const index = list.findIndex((point) => Math.abs(point - current) < 8);
      const next =
        index === -1
          ? clamp(current - direction * viewport.current!.clientWidth * 0.8, min, 0)
          : (list[clamp(index + direction, 0, list.length - 1)] ?? current);
      spring.to(next, { config: SPRING.move });
    },
    [spring],
  );

  /**
   * Tab into a card that is off screen and the row brings it to you.
   *
   * Without this, keyboard focus walks off the edge of a viewport that is
   * `overflow: hidden` and the focus ring is simply gone, which is the exact
   * moment a keyboard user stops being able to use the page.
   */
  const onFocusCapture = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const row = track.current;
      const view = viewport.current;
      if (!row || !view) return;
      const card = (event.target as HTMLElement).closest("[data-rail-item]") as HTMLElement | null;
      if (!card) return;
      const { min } = bounds.current;
      const left = card.offsetLeft + offset.current;
      const right = left + card.offsetWidth;
      if (left >= gutter.current && right <= view.clientWidth) return;
      spring.to(clamp(-(card.offsetLeft - gutter.current), min, 0), { config: SPRING.move });
    },
    [spring],
  );

  /**
   * Asking for less motion gets the native scroller, not a frozen row.
   *
   * This is the right substitute rather than a cop-out: it keeps every card
   * reachable, keeps the snapping, and hands the physics back to the operating
   * system, which is already obeying the same preference. The arrows stay,
   * because they were never decoration: they are how this row works for
   * somebody who cannot or would rather not drag it.
   */
  if (reduced) {
    return <PlainRail label={label} trackClassName={trackClassName} className={className}>{children}</PlainRail>;
  }

  return (
    <div className="relative">
      <div
        ref={viewport}
        role="group"
        aria-label={label}
        onFocusCapture={onFocusCapture}
        className={cn("overflow-hidden", className)}
        // Vertical panning stays with the page; horizontal is ours. Without
        // this a phone scrolls the document and drags the row at once.
        style={{ touchAction: "pan-y" }}
      >
        <div ref={track} className={cn("flex w-max gap-5 will-change-transform", trackClassName)}>
          {children}
        </div>
      </div>

      <div className={cn("mt-6 flex gap-2", trackClassName)}>
        <RailArrow onClick={() => step(-1)} disabled={atStart} label="Previous cars">
          <ChevronLeft className="size-5" aria-hidden />
        </RailArrow>
        <RailArrow onClick={() => step(1)} disabled={atEnd} label="More cars">
          <ChevronRight className="size-5" aria-hidden />
        </RailArrow>
      </div>
    </div>
  );
};

/**
 * The same row with the browser's own scrolling underneath it.
 *
 * Kept as a separate component rather than a branch inside the one above, so
 * that flipping the preference swaps one tree for another cleanly instead of
 * leaving a pile of gesture listeners bound to an element that no longer
 * behaves that way.
 */
const PlainRail = ({
  children,
  className,
  label,
  trackClassName,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  trackClassName?: string;
}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const onScroll = useCallback(() => {
    const box = scroller.current;
    if (!box) return;
    setAtStart(box.scrollLeft < 4);
    setAtEnd(box.scrollLeft > box.scrollWidth - box.clientWidth - 4);
  }, []);

  useEffect(onScroll, [onScroll]);

  const step = (direction: 1 | -1) => {
    const box = scroller.current;
    const card = box?.firstElementChild as HTMLElement | undefined;
    if (!box || !card) return;
    // `auto`, not `smooth`. Somebody who asked for less movement did not ask
    // for a shorter animation, they asked for the content to be where it is
    // going to be.
    box.scrollBy({ left: direction * (card.offsetWidth + 20), behavior: "auto" });
  };

  return (
    <div>
      <div
        ref={scroller}
        onScroll={onScroll}
        role="group"
        aria-label={label}
        className={cn("flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4", trackClassName, className)}
      >
        {children}
      </div>
      <div className={cn("mt-4 flex gap-2", trackClassName)}>
        <RailArrow onClick={() => step(-1)} disabled={atStart} label="Previous cars">
          <ChevronLeft className="size-5" aria-hidden />
        </RailArrow>
        <RailArrow onClick={() => step(1)} disabled={atEnd} label="More cars">
          <ChevronRight className="size-5" aria-hidden />
        </RailArrow>
      </div>
    </div>
  );
};

const RailArrow = ({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    data-pressable="control"
    className={cn(
      "flex size-11 items-center justify-center rounded-full border border-line bg-card/70 text-ink backdrop-blur transition-opacity duration-200",
      disabled ? "pointer-events-none opacity-30" : "hover:bg-card",
    )}
    onPointerDown={(event) => event.currentTarget.setAttribute("data-pressed", "true")}
    onPointerUp={(event) => event.currentTarget.setAttribute("data-pressed", "false")}
    onPointerLeave={(event) => event.currentTarget.setAttribute("data-pressed", "false")}
  >
    {children}
  </button>
);
