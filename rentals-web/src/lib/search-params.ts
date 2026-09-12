/**
 * Carrying the visitor's dates from one page to the next.
 *
 * Somebody who has already told this site when they need a car should never be
 * asked again. That sounds obvious and it is exactly what a site loses on every
 * link that is written as a bare path: the dates live in the URL, so a link
 * that does not repeat them throws them away, and the customer lands on the
 * booking page with two empty date fields and no idea why.
 *
 * So every link that moves between a car and a booking goes through here.
 */
export interface CarSearch {
  from?: string;
  to?: string;
  /** Present only when they picked self-drive, so the default stays absent. */
  drive?: string;
}

/**
 * The query string for what the visitor has chosen so far, or "" if nothing.
 *
 * Dates are only carried as a pair. Half a date range in a URL is worse than
 * none: it fills one field, leaves the other empty, and looks like the page
 * lost the second one.
 */
export const carSearch = (params: CarSearch): string => {
  const query = new URLSearchParams();
  if (params.from && params.to && params.to > params.from) {
    query.set("from", params.from);
    query.set("to", params.to);
  }
  if (params.drive === "self") query.set("drive", "self");
  const value = query.toString();
  return value ? `?${value}` : "";
};

/** Append a query string to a path that may already have one of its own. */
export const withSearch = (path: string, search: string): string => {
  if (!search) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${search.replace(/^\?/, "")}`;
};
