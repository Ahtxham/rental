/** ₨ 9,000, the way a price is written on a Pakistani rate card. */
export const pkr = (amount: number | null | undefined): string =>
  amount === null || amount === undefined
    ? "-"
    : `₨ ${Math.round(amount).toLocaleString("en-PK")}`;

/** "Thu 11 Sep", enough for a customer to recognise their own dates. */
export const shortDate = (value: string | Date): string =>
  new Date(value).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/**
 * A rental day is 24 hours, rounded up, with an hour of grace, the same rule
 * the backend charges by (`RENTAL_GRACE_MINUTES`). Printed here so a customer
 * sees the number of days they are about to be quoted for before they send the
 * request, rather than discovering it in a reply.
 */
export const rentalDays = (from: string, to: string): number => {
  const ms = new Date(to).getTime() - new Date(from).getTime() - 60 * 60_000;
  return Math.max(1, Math.ceil(ms / 86_400_000));
};

export const titleCase = (value: string): string =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());

/**
 * A calendar day as a Karachi instant.
 *
 * Owners think in days, "the car is free from the 12th to the 20th", and the
 * backend compares instants. `end: true` takes the day to its last second, so
 * a car offered "to the 20th" is still offered at six in the evening on the
 * 20th rather than having quietly expired at midnight the night before.
 *
 * The +05:00 is written in rather than left to the browser: an owner setting
 * dates from a laptop on another timezone would otherwise offer their car for
 * a window five hours out from the one they picked.
 */
export const karachiDay = (ymd: string, end = false): string =>
  `${ymd}T${end ? "23:59:59" : "00:00:00"}+05:00`;

/** The reverse, for putting a stored window back into a date box. */
export const ymdInKarachi = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};
