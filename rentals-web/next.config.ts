import type { NextConfig } from "next";

/**
 * musafircars.com, the whole of Musafir on one Next application.
 *
 * The public site, the car owner's portal (`/lender`) and the office
 * (`/admin`) all live here. They share a design system and a session pattern,
 * and the two private areas are gated in their own layouts rather than by a
 * proxy in front of everything, so a careless matcher edit cannot take the
 * public site off the internet.
 *
 * The browser talks only to this origin. Every call to the API goes through
 * this app's own `/api/*` route handlers, which means the backend needs no
 * public hostname, no certificate and no CORS: it listens on loopback and
 * nothing outside the box can reach it.
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
   * One canonical hostname: the apex.
   *
   * Done here rather than in nginx on purpose. That nginx serves seventeen
   * sites and is fully restarted by certbot twice a day, so every edit to it
   * is a chance to take all of them down; this is version-controlled, reviewed
   * with the rest of the code, and testable before it ships. nginx stays a
   * dumb proxy to one port.
   *
   * `permanent` is a 308, which search engines treat as a permanent move and
   * browsers cache. That is the right answer and also the unforgiving one: if
   * the apex ever stops being canonical, visitors who have the redirect cached
   * keep following it until it expires.
   */
  redirects: async () => [
    {
      source: "/:path*",
      has: [{ type: "host", value: "www.musafircars.com" }],
      destination: "https://musafircars.com/:path*",
      permanent: true,
    },
  ],

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
