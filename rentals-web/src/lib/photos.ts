/**
 * A stored photo URL, as a signed-in browser can actually fetch it.
 *
 * Uploads are saved either to S3, which hands back an absolute URL, or to
 * local disk, which hands back `/uploads/<name>`. That second form is a path on
 * the BACKEND; the browser is on this origin, so rendering it directly gives a
 * broken image. `/api/photo/<name>` streams it back with the caller's session.
 *
 * This is for the office and for a car owner's own garage. Photos on the public
 * website use a different route that needs no session, see
 * `/api/public/rentals/photos/:filename`, and the API has already rewritten
 * those before the website sees them.
 *
 * Display only: what gets SAVED is always the URL the upload returned. Storing
 * a display path would tie the database to how this website happens to serve
 * files today.
 */
export const photoSrc = (url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;
  const name = url.split("?")[0].split("/").pop();
  return name ? `/api/photo/${name}` : url;
};
