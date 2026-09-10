"use client";

import { CalendarPlus, Trash2 } from "lucide-react";

import { karachiDay, ymdInKarachi } from "@/lib/format";

export interface Window {
  from: string;
  to: string;
}

/**
 * The dates an owner is offering, as a list of ranges.
 *
 * Ranges rather than a calendar of individual days, because that is how the
 * answer actually arrives, "I don't need it for the next two weeks", and
 * because the backend asks one question of this data: does ONE window contain
 * the customer's whole booking. Two adjacent ranges are not the same as one
 * that spans them, and a grid of tickable days would hide that distinction
 * behind an interface that makes them look identical.
 */
export const AvailabilityEditor = ({
  windows,
  onChange,
}: {
  windows: Window[];
  onChange: (windows: Window[]) => void;
}) => {
  const today = new Date().toISOString().slice(0, 10);

  const update = (index: number, patch: Partial<Window>) => {
    onChange(windows.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  };

  return (
    <div className="space-y-3">
      {windows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          No dates yet. Until you add some, your car cannot be offered to anybody.
        </p>
      ) : null}

      {windows.map((window, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-card p-3">
          <label className="flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Free from
            </span>
            <input
              type="date"
              value={window.from ? ymdInKarachi(window.from) : ""}
              min={today}
              onChange={(event) => update(index, { from: karachiDay(event.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest tnum"
            />
          </label>
          <label className="flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Until
            </span>
            <input
              type="date"
              value={window.to ? ymdInKarachi(window.to) : ""}
              min={window.from ? ymdInKarachi(window.from) : today}
              onChange={(event) => update(index, { to: karachiDay(event.target.value, true) })}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest tnum"
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(windows.filter((_, i) => i !== index))}
            aria-label="Remove these dates"
            className="rounded-lg border border-line p-2.5 text-muted transition-colors hover:border-alert/40 hover:text-alert"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...windows, { from: "", to: "" }])}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-paper"
      >
        <CalendarPlus className="size-4" aria-hidden />
        Add dates
      </button>
    </div>
  );
};

/** Drops the half-filled rows a form is bound to collect. */
export const cleanWindows = (windows: Window[]): Window[] =>
  windows.filter((w) => w.from && w.to && new Date(w.to) > new Date(w.from));
