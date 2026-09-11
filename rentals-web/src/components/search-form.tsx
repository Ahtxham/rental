"use client";

import { ArrowRight, CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { rentalDays } from "@/lib/format";

/**
 * The one thing the front page is for.
 *
 * A rental is shopped for by DATE before it is shopped for by car, nobody
 * browses a Corolla in the abstract, they need something for Thursday. So the
 * first control on the page is the question every phone call opens with, and
 * answering it carries the dates through rather than making somebody type them
 * twice.
 *
 * The day count appears as soon as both dates are in, because "3 days" is what
 * the price will be multiplied by and finding that out at the end is how a
 * quote becomes an argument.
 */
export const SearchForm = ({
  tone = "dark",
  selfDriveEnabled = false,
  destination = "/book",
  className,
}: {
  /**
   * `light` on a paper page, `dark` on a coloured panel, `glass` on the hero,
   * where the form lies on top of a photograph and has to be a material rather
   * than a box.
   */
  tone?: "dark" | "light" | "glass";
  selfDriveEnabled?: boolean;
  destination?: string;
  className?: string;
}) => {
  const router = useRouter();
  const params = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [withDriver, setWithDriver] = useState(params.get("drive") !== "self");

  const days = from && to && to > from ? rentalDays(from, to) : null;

  const go = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    if (selfDriveEnabled && !withDriver) next.set("drive", "self");
    router.push(`${destination}${next.toString() ? `?${next.toString()}` : ""}`);
  };

  const dark = tone !== "light";
  const glass = tone === "glass";

  const inputClass = cn(
    "w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-colors duration-150 tnum",
    dark
      ? "border border-paper/20 bg-paper/10 text-paper focus:border-paper/25"
      : "border border-line bg-card text-ink focus:border-ink",
  );
  const labelClass = cn(
    "text-[11px] font-semibold uppercase tracking-[0.14em]",
    dark ? "text-paper/70" : "text-muted",
  );

  return (
    <form
      onSubmit={go}
      className={cn(
        "rounded-[22px] p-4",
        glass
          ? "material-night vibrant"
          : dark
            ? "border border-paper/15 bg-paper/10 backdrop-blur"
            : "border border-line bg-paper-deep",
        className,
      )}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className={labelClass}>Pick-up</span>
          <input
            type="date"
            value={from}
            min={today}
            onChange={(event) => {
              setFrom(event.target.value);
              // A return before the pick-up is not a shorter booking, it is a
              // typo, and leaving it there produces a form that refuses to
              // submit with nothing visibly wrong.
              if (to && event.target.value && to <= event.target.value) setTo("");
            }}
            className={cn(inputClass, "mt-1")}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Return</span>
          <input
            type="date"
            value={to}
            min={from || today}
            onChange={(event) => setTo(event.target.value)}
            className={cn(inputClass, "mt-1")}
          />
        </label>
        <button
          type="submit"
          data-pressable="control"
          className={cn(
            "mt-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold sm:mt-[23px]",
            dark
              ? "bg-action-invert text-night hover:bg-action-invert-deep"
              : "bg-action text-white hover:bg-action-deep",
          )}
        >
          See cars
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {selfDriveEnabled ? (
          /* A segmented control, not two buttons.
           *
           * The chosen side is a raised neutral pill rather than the accent:
           * picking which of two things you are looking at is not an action,
           * and painting it the same colour as the button that submits the
           * form makes the page look like it has two things to press. */
          <div
            className={cn(
              "inline-flex rounded-full p-1",
              dark ? "bg-paper/10" : "bg-ink/[0.06]",
            )}
            role="radiogroup"
            aria-label="How you will drive"
          >
            {[
              { label: "With a driver", value: true },
              { label: "Self-drive", value: false },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={withDriver === option.value}
                onClick={() => setWithDriver(option.value)}
                data-pressable="control"
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold",
                  withDriver === option.value
                    ? dark
                      ? "bg-paper text-night shadow-sm"
                      : "bg-card text-ink shadow-[0_1px_2px_rgba(16,22,20,0.16)]"
                    : dark
                      ? "text-paper/70 hover:text-paper"
                      : "text-ink-soft hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        {days ? (
          <p
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold tnum",
              dark ? "text-paper/70" : "text-muted",
            )}
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {days} {days === 1 ? "day" : "days"}
          </p>
        ) : null}
      </div>
    </form>
  );
};
