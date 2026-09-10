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
  /** `dark` sits on the forest hero; `light` on a paper page. */
  tone?: "dark" | "light";
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

  const dark = tone === "dark";

  const inputClass = cn(
    "w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors duration-150 tnum",
    dark
      ? "border border-paper/20 bg-forest/40 text-paper focus:border-brass-bright"
      : "border border-line bg-card text-ink focus:border-brass",
  );
  const labelClass = cn(
    "text-[11px] font-semibold uppercase tracking-[0.14em]",
    dark ? "text-paper/70" : "text-muted",
  );

  return (
    <form
      onSubmit={go}
      className={cn(
        "rounded-2xl p-4",
        dark ? "border border-paper/15 bg-paper/10 backdrop-blur" : "border border-line bg-paper-deep",
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
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brass px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brass-bright sm:mt-[22px]"
        >
          See cars
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {selfDriveEnabled ? (
          <div
            className={cn(
              "inline-flex rounded-full p-1",
              dark ? "bg-forest/50" : "bg-ink/[0.05]",
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
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-150",
                  withDriver === option.value
                    ? "bg-brass text-white"
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
