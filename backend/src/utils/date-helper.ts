// Everything in this business happens in Asia/Karachi wall-clock time. Pakistan
// does not observe DST, so the offset is a fixed +05:00, but the formatter is
// still used rather than an offset constant, so a date printed here matches the
// date printed on an agreement.
const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" for a moment, in Karachi. */
export const karachiDateStr = (date: Date = new Date()): string => dateFmt.format(date);

/** A Karachi wall-clock time on a given day, as a real instant. */
export const dateAtKarachiTime = (dateStr: string, hhmm: string): Date =>
  new Date(`${dateStr}T${hhmm}:00+05:00`);

/** Shift a "YYYY-MM-DD" string by `days` (positive or negative). */
export const addDaysToDateStr = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Built in UTC so the arithmetic cannot be nudged across a boundary by the
  // server's own timezone, then formatted back in Karachi.
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

export const startOfKarachiDay = (dateStr: string): Date => dateAtKarachiTime(dateStr, "00:00");

/** The end of a Karachi day, as the instant the next one begins. */
export const endOfKarachiDay = (dateStr: string): Date =>
  startOfKarachiDay(addDaysToDateStr(dateStr, 1));

export const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const minutesBetween = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 60_000);
