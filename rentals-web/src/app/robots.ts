import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/config";

/**
 * What crawlers may read.
 *
 * **AI crawlers are deliberately allowed**, which is the whole point of being
 * findable when somebody asks ChatGPT, Claude, Gemini or Perplexity for a car
 * in Lahore. A blanket `Allow: /` already permits them, so the explicit list
 * below changes nothing technically. It is here so that the decision is
 * visible: anybody who later wants to block them has to remove a named rule
 * rather than quietly flip a default, and anybody who adds a blanket block
 * will see these and ask first.
 *
 * The private areas are excluded. They are already behind a session and answer
 * a redirect to a login page, but a crawler that spends its budget on
 * `/admin/bookings/<id>` is a crawler not reading the cars.
 */
const AI_CRAWLERS = [
  // OpenAI: training, search index, and user-initiated browsing.
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic.
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  // Google's separate opt-in for Gemini, distinct from Googlebot.
  "Google-Extended",
  // Perplexity: index and user-initiated fetch.
  "PerplexityBot",
  "Perplexity-User",
  // Apple Intelligence, Meta, and Common Crawl, which feeds many models.
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
];

const PRIVATE = ["/admin", "/admin/", "/lender", "/lender/", "/api/", "/offline"];

const robots = (): MetadataRoute.Robots => ({
  rules: [
    { userAgent: "*", allow: "/", disallow: PRIVATE },
    ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
  ],
  sitemap: `${SITE_URL}/sitemap.xml`,
  host: SITE_URL,
});

export default robots;
