"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { SPRING, VelocityTracker, rubberband } from "@/lib/spring";
import { useReducedMotion, useSpringValue } from "@/lib/use-motion";

/**
 * A panel that comes up from the bottom edge and can be pushed back down.
 *
 * Two rules decide almost everything here.
 *
 * It leaves the way it arrived. Up from the bottom, down to the bottom. A
 * surface that slides in from one edge and disappears towards another has no
 * position in the reader's head, and they stop being able to predict where
 * anything is.
 *
 * And a drag is answered by where it was GOING, not where it stopped. Flick it
 * downwards and it goes, even from near the top, because the flick already said
 * so. Drag it down slowly, change your mind, and push it back up and it stays,
 * even from near the bottom, because the last thing your hand did was the
 * answer. Deciding on position alone overrules people at the exact moment they
 * have changed their mind, which is when being overruled is most annoying.
 */
export const Sheet = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  const [mounted, setMounted] = useState(open);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const height = useRef(0);
  const restoreFocus = useRef<HTMLElement | null>(null);

  /**
   * One spring paints both the panel and the dimming behind it.
   *
   * Tying the scrim to the same value is what makes a half-finished drag
   * readable: the background comes back as the sheet goes down, continuously,
   * so at every point on the way the screen is showing you how far through the
   * gesture you are rather than waiting to find out at the end.
   */
  const paint = useCallback((y: number) => {
    const box = panel.current;
    if (box) {
      box.style.transform = `translate3d(0, ${y}px, 0)`;
      // Blur and scale move together so the surface reads as glass arriving
      // rather than a rectangle being faded in.
      const progress = height.current > 0 ? 1 - Math.min(y / height.current, 1) : 1;
      box.style.opacity = String(0.35 + 0.65 * progress);
    }
    if (scrim.current) {
      const progress = height.current > 0 ? 1 - Math.min(Math.max(y, 0) / height.current, 1) : 1;
      scrim.current.style.opacity = String(progress);
    }
  }, []);

  const spring = useSpringValue(0, paint, SPRING.sheet, 0.5);

  const dismiss = useCallback(
    (velocity: number) => {
      spring.to(height.current || 600, { velocity, config: SPRING.sheet });
      // Long enough for the spring to have arrived, and it is the unmount that
      // is being delayed rather than the motion, so a slow frame shows a
      // settled sheet rather than a stutter.
      window.setTimeout(() => {
        setMounted(false);
        onClose();
      }, 340);
    },
    [onClose, spring],
  );

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const box = panel.current;
    if (!box) return;

    height.current = box.offsetHeight;
    restoreFocus.current = document.activeElement as HTMLElement | null;

    if (reduced) {
      paint(0);
    } else {
      spring.set(height.current);
      spring.to(0, { config: SPRING.sheet });
    }

    // The page behind must not scroll while a modal surface is over it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previous;
      restoreFocus.current?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, reduced, paint]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, dismiss]);

  /* ── The drag ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    const box = panel.current;
    if (!box || !mounted || reduced) return;

    const tracker = new VelocityTracker();
    let pointer: number | null = null;
    let startY = 0;
    let startOffset = 0;
    let committed = false;

    const onDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      // A drag that starts on a control is that control's, not the sheet's.
      // Sheets that steal from their own buttons are sheets you fight.
      if (target.closest("input, select, textarea, button, a")) return;
      pointer = event.pointerId;
      startY = event.clientY;
      committed = false;
      spring.stop();
      startOffset = spring.current;
      tracker.reset(0);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const dy = event.clientY - startY;
      if (!committed) {
        if (Math.abs(dy) < 8) return;
        committed = true;
        box.setPointerCapture(event.pointerId);
      }
      const raw = startOffset + dy;
      // Upwards there is nothing to reveal, so it resists rather than opening
      // a gap above itself.
      tracker.add(dy);
      spring.set(raw < 0 ? rubberband(raw, height.current || 600) : raw);
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      if (!committed) return;
      if (box.hasPointerCapture(event.pointerId)) box.releasePointerCapture(event.pointerId);

      const velocity = tracker.velocity;
      const travelled = spring.current;
      const far = travelled > (height.current || 600) * 0.4;

      // Sign first. Only a gesture with no opinion falls back to position.
      if (velocity > 350 || (far && velocity > -120)) dismiss(velocity);
      else spring.to(0, { velocity, config: SPRING.sheet });
    };

    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onUp);
    return () => {
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
    };
  }, [mounted, reduced, dismiss, spring]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Dimmed, because this is a task that blocks the page rather than a
          panel alongside it. A parallel surface would use translucency and an
          offset and leave the flow open. */}
      <div
        ref={scrim}
        onClick={() => dismiss(0)}
        className={cn("absolute inset-0 bg-night/55", reduced && "transition-opacity duration-200")}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "material-thick absolute inset-x-0 bottom-0 rounded-t-[28px] bg-paper/85 p-5 pb-8 outline-none",
          reduced && "transition-opacity duration-200",
        )}
        style={{ touchAction: "none" }}
      >
        {/* A real grab handle. The sheet is draggable anywhere, but nothing on
            screen says so unless something looks grabbable. */}
        <div className="mx-auto mb-5 h-1.5 w-11 rounded-full bg-ink/20" aria-hidden />
        {children}
      </div>
    </div>
  );
};
