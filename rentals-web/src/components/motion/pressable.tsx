"use client";

import Link from "next/link";
import { useRef, type ComponentProps } from "react";

import { cn } from "@/lib/cn";
import { usePress } from "@/lib/use-motion";

/**
 * Two controls that acknowledge a press while the finger is still down.
 *
 * `kind` is the size of the thing being pressed, not a style: a 44px button and
 * a 380px card cannot scale by the same amount, because the same ratio moves
 * the card's edges several times further and the press stops reading as a press
 * and starts reading as a jolt. The CSS in `globals.css` holds the two values.
 */
type Kind = "control" | "card";

export const PressLink = ({
  kind = "control",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { kind?: Kind }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const { pressed } = usePress(ref);

  return (
    <Link
      ref={ref}
      data-pressable={kind}
      data-pressed={pressed}
      className={cn("outline-offset-4", className)}
      {...props}
    >
      {children}
    </Link>
  );
};

export const PressButton = ({
  kind = "control",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { kind?: Kind }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const { pressed } = usePress(ref);

  return (
    <button
      ref={ref}
      data-pressable={kind}
      data-pressed={pressed}
      className={cn("outline-offset-4", className)}
      {...props}
    >
      {children}
    </button>
  );
};

export const PressAnchor = ({
  kind = "control",
  className,
  children,
  ...props
}: ComponentProps<"a"> & { kind?: Kind }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const { pressed } = usePress(ref);

  return (
    <a
      ref={ref}
      data-pressable={kind}
      data-pressed={pressed}
      className={cn("outline-offset-4", className)}
      {...props}
    >
      {children}
    </a>
  );
};
