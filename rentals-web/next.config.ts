import type { NextConfig } from "next";

/**
 * musafircars.com — the public face of Musafir Rent A Car.
 *
 * Deliberately a separate application from `web/`, not another route inside
 * it. The portal is a signed-in tool for one fleet's staff, gated by a proxy
 * that redirects anything without a session to a login page; this is a
 * marketing site whose whole job is to be reachable by strangers and indexed
 * by Google. Sharing a codebase would mean every public page living as an
 * exception to that gate, and one careless matcher edit taking the business's
 * website off the internet.
 *
 * They meet at the backend instead, over `/api/public/rentals/*`.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * `next dev` answers 403 to requests for `/_next/*` whose Origin is not on
   * this list, and the list does not include `127.0.0.1` even though that is
   * the same machine as `localhost`. The failure is silent and looks nothing
   * like a config problem: the page renders, the chunks arrive, and it simply
   * never becomes interactive. Development only — Next ignores it in a build.
   */
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"],

  /**
   * Connectivity-aware UI, and retries of navigations and actions that were
   * blocked while the connection was down. Next's own — see `useOffline` in
   * `components/pwa.tsx`; without this flag the hook always answers false.
   */
  experimental: {
    useOffline: true,
  },

  /**
   * The service worker's headers are not optional decoration.
   *
   * A cached `/sw.js` is a worker you cannot update: browsers will keep serving
   * the old one, and the bug you fixed lives on every phone that ever opened
   * the site. `no-store` is what makes a deploy reach them.
   */
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
      ],
    },
  ],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
