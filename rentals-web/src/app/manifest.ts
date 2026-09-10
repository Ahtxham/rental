import type { MetadataRoute } from "next";

/**
 * The manifest, as a route rather than a static file.
 *
 * `start_url` is the booking page, not the home page: somebody who installs
 * this has already decided they rent cars from us, and the one thing they open
 * it for is to ask for another. The home page is a first impression, and they
 * have had it.
 */
const manifest = (): MetadataRoute.Manifest => ({
  name: "Musafir Rent A Car",
  short_name: "Musafir",
  description:
    "Chauffeur-driven car rental in Lahore. Ask for a car, or earn from yours while it sits.",
  start_url: "/book",
  scope: "/",
  display: "standalone",
  background_color: "#faf7f2",
  theme_color: "#0f3a2f",
  lang: "en",
  categories: ["travel", "business"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    // Separate file, not the same one relabelled: a launcher may crop a
    // maskable icon to a circle, so its mark is drawn inside the safe zone.
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
  shortcuts: [
    { name: "Rent a car", short_name: "Rent", url: "/book" },
    { name: "My cars", short_name: "My cars", url: "/lender" },
  ],
});

export default manifest;
