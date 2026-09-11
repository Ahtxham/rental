import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";

import { InstallPrompt, OfflineBanner, ServiceWorkerRegistration } from "@/components/pwa";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL } from "@/lib/config";
import { getContact } from "@/lib/site";

/**
 * Fraunces for the voice, Public Sans for the work.
 *
 * Fraunces has optical sizing and a slightly soft, old-catalogue warmth that
 * suits a travel name; it is set only at heading sizes, where that character
 * reads as confidence rather than noise. Public Sans carries everything a
 * customer actually has to get through, prices, policies, a booking form,
 * and stays out of the way. Both are self-hosted by `next/font`, so the page
 * does not wait on a font CDN to paint.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Musafir Rent A Car, rent a car in Lahore, by the day",
    template: "%s · Musafir Rent A Car",
  },
  description:
    "Rent a car in Lahore by the day, with one of our drivers or on your own. One quoted price, the kilometres written down, and nothing held until we confirm it with you.",
  applicationName: "Musafir",
  appleWebApp: {
    capable: true,
    title: "Musafir",
    // The status bar sits over the page in standalone mode, and the page's own
    // hero is the bottle green the bar has to blend into.
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // The apex is canonical. Set here so every page inherits it and only the
  // ones that differ have to say so, rather than each page remembering.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Musafir Rent A Car",
    title: "Musafir Rent A Car, rent a car in Lahore, by the day",
    description:
      "Rent a car in Lahore by the day, with a driver or self-drive. One quoted price, kilometres written down.",
    url: SITE_URL,
    locale: "en_PK",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Musafir Rent A Car, Lahore",
      },
    ],
  },
  /**
   * Twitter's card type also drives the preview WhatsApp and most chat apps
   * render, which is how a link to this site will actually be shared here.
   */
  twitter: {
    card: "summary_large_image",
    title: "Musafir Rent A Car, rent a car in Lahore",
    description: "Rent a car in Lahore by the day, with a driver or self-drive.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "Car rental",
};

/**
 * The browser chrome takes the hero's colour, so an installed Musafir opens
 * as one surface rather than a green page under a white bar.
 */
export const viewport: Viewport = {
  themeColor: "#0f3a2f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * The contact details are fetched once here and handed down, rather than read
 * again in the header and the footer. Both render on every page, and two calls
 * per request for one phone number is one too many.
 */
const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const contact = await getContact();

  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader contact={contact} />
        <OfflineBanner />
        <main className="flex-1">{children}</main>
        <SiteFooter contact={contact} />
        <ServiceWorkerRegistration />
        <InstallPrompt />
      </body>
    </html>
  );
};

export default RootLayout;
