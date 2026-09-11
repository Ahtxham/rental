import type { MetadataRoute } from "next";

import { getCars } from "@/lib/api";
import { SITE_URL } from "@/lib/config";

/**
 * Every page worth indexing, with the cars generated from what is actually
 * published rather than a hand-kept list that goes stale the first time
 * somebody adds a Corolla.
 *
 * Only Musafir's own cars get a URL. A partner's car is on the site for the
 * days its owner offered it and gone again after, so a permanent URL for one
 * would be a permanent 404 in Google's index for most of the year.
 *
 * `priority` is a hint search engines mostly ignore now; `lastModified` is the
 * one they actually use, so it is real where a real date exists.
 */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/cars`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/book`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/rent-your-car`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/policies`, changeFrequency: "yearly", priority: 0.4 },
  ];

  // A sitemap that throws takes the whole file down, and an empty sitemap is
  // worse than one missing its car pages. The static list always ships.
  let cars: MetadataRoute.Sitemap = [];
  try {
    cars = (await getCars())
      .filter((car) => car.source === "fleet")
      .map((car) => ({
        url: `${SITE_URL}/cars/${car.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    cars = [];
  }

  return [...staticPages, ...cars];
};

export default sitemap;
