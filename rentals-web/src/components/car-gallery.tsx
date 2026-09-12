"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/use-motion";

/**
 * A car's photographs, in a strip you can swipe and a screen you can fill.
 *
 * Two deliberate choices about the mechanics.
 *
 * The strip is a native scroll container with snap points rather than a
 * transform driven by JavaScript. A photograph slider is the one carousel on a
 * page that people expect to behave exactly like every other one on their
 * phone, and the operating system's own scrolling already has the momentum,
 * the rubber-band at the ends and the two-finger trackpad gesture. Writing it
 * again by hand can only be a worse version of something already in the
 * browser. The row this component does NOT replace is `motion/rail.tsx`, where
 * the physics is the point.
 *
 * The full-screen view is portalled to the body. A lightbox rendered in place
 * is at the mercy of every ancestor: one `transform` anywhere above it and
 * `position: fixed` starts resolving against that element instead of the
 * viewport, which puts the "full screen" image in a 300px box and is
 * impossible to spot until it happens on somebody's phone.
 */
export const CarGallery = ({
  photos,
  alt,
  className,
  aspect = "aspect-[16/10]",
  rounded = "rounded-[26px]",
  fallback,
}: {
  photos: string[];
  alt: string;
  className?: string;
  aspect?: string;
  rounded?: string;
  /** Drawn instead of a photograph when there are none. */
  fallback?: React.ReactNode;
}) => {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const many = photos.length > 1;

  /**
   * Which photograph is in front, worked out from where the strip is scrolled.
   *
   * Read from the scroller rather than tracked alongside it, so that a swipe,
   * an arrow press and a trackpad flick all end up agreeing about the answer
   * without any of them having to tell the others.
   */
  const onScroll = useCallback(() => {
    const box = strip.current;
    if (!box) return;
    const width = box.clientWidth || 1;
    setIndex(Math.round(box.scrollLeft / width));
  }, []);

  const goTo = useCallback((next: number, smooth = true) => {
    const box = strip.current;
    if (!box) return;
    const clamped = Math.max(0, Math.min(next, box.children.length - 1));
    box.scrollTo({ left: clamped * box.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);

  if (photos.length === 0) {
    return (
      <div className={cn(aspect, rounded, "overflow-hidden", className)}>
        {fallback}
      </div>
    );
  }

  return (
    <>
      <div className={cn("group/gallery relative", className)}>
        <div
          ref={strip}
          onScroll={onScroll}
          className={cn(
            aspect,
            rounded,
            "flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-night",
            // The scrollbar is noise under a photograph; the dots say the same
            // thing and say it better.
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {photos.map((photo, position) => (
            <button
              key={photo}
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`${alt}, photo ${position + 1} of ${photos.length}. Open full screen`}
              className="relative w-full shrink-0 snap-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={position === 0 ? alt : ""}
                draggable={false}
                loading={position === 0 ? "eager" : "lazy"}
                decoding="async"
                className="size-full select-none object-cover"
              />
            </button>
          ))}
        </div>

        {/* Only ever a hint. The strip is swipeable with or without it, and on
            a phone it is in the way of the thing it is pointing at. */}
        <span
          className="vibrant pointer-events-none absolute start-3 top-3 hidden items-center gap-1.5 rounded-full bg-night/55 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur-sm sm:inline-flex"
          aria-hidden
        >
          <Expand className="size-3" />
          {photos.length}
        </span>

        {many ? (
          <>
            <GalleryArrow side="start" disabled={index === 0} onClick={() => goTo(index - 1)} />
            <GalleryArrow
              side="end"
              disabled={index === photos.length - 1}
              onClick={() => goTo(index + 1)}
            />
            <Dots count={photos.length} index={index} onSelect={goTo} />
          </>
        ) : null}
      </div>

      {open ? (
        <Lightbox photos={photos} alt={alt} start={index} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
};

/**
 * An arrow, shown to pointers and hidden from thumbs.
 *
 * A touch device has a better way of doing this and does not need a control
 * sitting on top of a third of the picture to do it.
 */
const GalleryArrow = ({
  side,
  disabled,
  onClick,
}: {
  side: "start" | "end";
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    tabIndex={-1}
    aria-hidden
    disabled={disabled}
    onClick={onClick}
    data-pressable="control"
    className={cn(
      "pointer-only absolute top-1/2 size-9 -translate-y-1/2 items-center justify-center rounded-full bg-paper/85 text-ink shadow-[0_2px_10px_rgba(19,19,22,0.25)] backdrop-blur-sm",
      "opacity-0 group-hover/gallery:opacity-100 focus-visible:opacity-100",
      "transition-opacity duration-200",
      disabled && "pointer-events-none !opacity-0",
      side === "start" ? "start-3" : "end-3",
    )}
  >
    {side === "start" ? (
      <ChevronLeft className="size-5" aria-hidden />
    ) : (
      <ChevronRight className="size-5" aria-hidden />
    )}
  </button>
);

const Dots = ({
  count,
  index,
  onSelect,
  tone = "light",
}: {
  count: number;
  index: number;
  onSelect: (next: number) => void;
  tone?: "light" | "dark";
}) => (
  <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
    {Array.from({ length: count }, (_, position) => (
      <button
        key={position}
        type="button"
        onClick={() => onSelect(position)}
        aria-label={`Photo ${position + 1}`}
        aria-current={position === index}
        className={cn(
          "pointer-events-auto size-1.5 rounded-full transition-[width,background-color] duration-200",
          position === index
            ? cn("w-5", tone === "light" ? "bg-paper" : "bg-paper")
            : "bg-paper/45 hover:bg-paper/70",
        )}
      />
    ))}
  </div>
);

/**
 * The photographs, filling the screen.
 *
 * Modal, so it takes the scroll and the Escape key, and it hands focus back
 * where it came from on the way out. The same snapping strip as above, because
 * somebody who has just learned to swipe the small one should not have to
 * learn anything else to use the big one.
 */
const Lightbox = ({
  photos,
  alt,
  start,
  onClose,
}: {
  photos: string[];
  alt: string;
  start: number;
  onClose: () => void;
}) => {
  const strip = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Jumped to without animating: the strip has to open ON the photograph the
    // visitor was already looking at, and sliding there from the first one
    // would be the interface showing its workings.
    strip.current?.scrollTo({ left: start * (strip.current.clientWidth || 0), behavior: "auto" });
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previous;
      restoreFocus.current?.focus?.({ preventScroll: true });
    };
  }, [start]);

  const goTo = useCallback((next: number) => {
    const box = strip.current;
    if (!box) return;
    const clamped = Math.max(0, Math.min(next, photos.length - 1));
    box.scrollTo({ left: clamped * box.clientWidth, behavior: "smooth" });
  }, [photos.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={`${alt}, ${photos.length} photos`}
      tabIndex={-1}
      className={cn(
        "fixed inset-0 z-[60] bg-night outline-none",
        !reduced && "transition-opacity duration-200",
        mounted || reduced ? "opacity-100" : "opacity-0",
      )}
    >
      {/* Behind the photographs and covering everything, so that anywhere the
          picture is not is somewhere you can press to leave. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 size-full cursor-zoom-out"
      />

      <div
        ref={strip}
        onScroll={() => {
          const box = strip.current;
          if (box) setIndex(Math.round(box.scrollLeft / (box.clientWidth || 1)));
        }}
        className="relative flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, position) => (
          <div key={photo} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4 sm:p-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={`${alt}, photo ${position + 1}`}
              draggable={false}
              className="max-h-full max-w-full select-none rounded-2xl object-contain"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        data-pressable="control"
        className="absolute end-4 top-4 flex size-11 items-center justify-center rounded-full bg-paper/15 text-paper backdrop-blur-sm hover:bg-paper/25"
      >
        <X className="size-5" aria-hidden />
      </button>

      {photos.length > 1 ? (
        <>
          <span className="vibrant absolute start-1/2 top-5 -translate-x-1/2 rounded-full bg-paper/12 px-3 py-1 text-xs font-semibold text-paper tnum">
            {index + 1} / {photos.length}
          </span>
          <LightboxArrow side="start" disabled={index === 0} onClick={() => goTo(index - 1)} />
          <LightboxArrow
            side="end"
            disabled={index === photos.length - 1}
            onClick={() => goTo(index + 1)}
          />
          <Dots count={photos.length} index={index} onSelect={goTo} tone="dark" />
        </>
      ) : null}
    </div>,
    document.body,
  );
};

const LightboxArrow = ({
  side,
  disabled,
  onClick,
}: {
  side: "start" | "end";
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    aria-label={side === "start" ? "Previous photo" : "Next photo"}
    data-pressable="control"
    className={cn(
      "absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-paper/15 text-paper backdrop-blur-sm hover:bg-paper/25 sm:flex",
      disabled && "pointer-events-none opacity-25",
      side === "start" ? "start-4" : "end-4",
    )}
  >
    {side === "start" ? (
      <ChevronLeft className="size-6" aria-hidden />
    ) : (
      <ChevronRight className="size-6" aria-hidden />
    )}
  </button>
);
