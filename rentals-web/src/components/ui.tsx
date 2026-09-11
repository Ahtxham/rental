import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export const Container = ({ className, ...props }: ComponentProps<"div">) => (
  <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)} {...props} />
);

/** A small grey label above a heading. Used where the section needs naming. */
export const Eyebrow = ({ className, ...props }: ComponentProps<"p">) => (
  <p
    className={cn("text-[11px] font-semibold uppercase tracking-[0.18em] text-muted", className)}
    {...props}
  />
);

type ButtonProps = ComponentProps<"button"> & {
  href?: string;
  /**
   * `solid` is near-black with white text, and it is the only thing on a page
   * that should look pressable at full strength. `outline` and `ghost` are the
   * second and third choice beside it.
   *
   * `onDark` is the same button on a dark surface, inverted: white with
   * near-black text. There is no third colour to reach for, and that is the
   * point. On a page whose only colour comes from the photographs, one black
   * rectangle is unmissable and nothing has to be explained.
   */
  variant?: "solid" | "onDark" | "outline" | "ghost";
  size?: "md" | "lg";
};

export const Button = ({
  href,
  variant = "solid",
  size = "md",
  className,
  ...props
}: ButtonProps) => {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-150",
    size === "md" ? "px-6 py-3 text-sm" : "px-7 py-3.5 text-[15px]",
    variant === "solid" && "bg-action text-white hover:bg-action-deep",
    variant === "onDark" && "bg-action-invert text-night hover:bg-action-invert-deep",
    variant === "outline" && "border border-ink/20 text-ink hover:bg-ink/5",
    variant === "ghost" && "text-ink hover:bg-ink/5",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );

  if (href) {
    return (
      <Link href={href} data-pressable="control" className={classes}>
        {props.children}
      </Link>
    );
  }
  return <button data-pressable="control" className={classes} {...props} />;
};

export const Card = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn(
      "rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(16,22,20,0.04)]",
      className,
    )}
    {...props}
  />
);

/** A small status chip. `tone` is the meaning, not the colour. */
export const Badge = ({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "good" | "warn" }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
      // Filled, tinted, tinted-red. With no accent colour left, the difference
      // between "yes" and "just a fact" has to be carried by weight rather
      // than by hue, so the affirmative one is solid and the rest are not.
      tone === "neutral" && "bg-ink/[0.06] text-ink-soft",
      tone === "good" && "bg-ink text-paper",
      tone === "warn" && "bg-alert-wash text-alert",
      className,
    )}
    {...props}
  />
);

/**
 * A labelled form control.
 *
 * The label is a real `<label>` wrapping its input rather than a `for`/`id`
 * pair: half the fields on this site are rendered in loops, and generated ids
 * are one copy-paste away from colliding, at which point a tap on a label
 * focuses the wrong box and nobody notices for a month.
 */
export const Field = ({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <label className={cn("block", className)}>
    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
      {label}
    </span>
    <div className="mt-1.5">{children}</div>
    {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
  </label>
);

export const inputStyles =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-muted/70 focus:border-ink";

export const Input = ({ className, ...props }: ComponentProps<"input">) => (
  <input className={cn(inputStyles, className)} {...props} />
);

export const Textarea = ({ className, ...props }: ComponentProps<"textarea">) => (
  <textarea className={cn(inputStyles, "min-h-24 resize-y", className)} {...props} />
);

/** The heading block that opens a section. Kept in one place so they match. */
export const SectionHeading = ({
  eyebrow,
  title,
  lede,
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  className?: string;
}) => (
  <div className={cn("max-w-2xl", className)}>
    {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
    <h2 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">{title}</h2>
    {lede ? <p className="mt-3 text-base leading-relaxed text-ink-soft">{lede}</p> : null}
  </div>
);

/**
 * An on/off switch for a single setting.
 *
 * A real `<button data-pressable="control" role="switch">` rather than a styled checkbox: this fires an
 * action the moment it is pressed, and a checkbox implies a form that will be
 * submitted later. `aria-checked` is what a screen reader announces, and
 * `disabled` is what stops a second press landing while the first is in flight.
 */
export const Switch = ({
  checked,
  onChange,
  label,
  disabled,
  busy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Announced to screen readers, which have no column heading to go on. */
  label: string;
  disabled?: boolean;
  busy?: boolean;
}) => (
  <button data-pressable="control"
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled || busy}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
      checked ? "bg-night" : "bg-ink/15",
      (disabled || busy) && "cursor-not-allowed opacity-50",
    )}
  >
    <span
      className={cn(
        "inline-block size-4.5 rounded-full bg-white shadow transition-transform duration-200",
        checked ? "translate-x-6" : "translate-x-1",
      )}
    />
  </button>
);
