import type { PublicCar } from "@/lib/api";
import type { Contact } from "@/lib/config";
import { SITE_URL } from "@/lib/config";

/**
 * JSON-LD, for search engines and for the assistants people increasingly ask
 * instead of a search engine.
 *
 * Two rules run through all of it.
 *
 * **Only emit what is true.** Every field here is omitted when the office has
 * not set it. A `telephone` of "+92 300 0000000" or an invented street address
 * is worse than no field at all: Google penalises structured data that
 * contradicts the page, and an assistant that repeats a fabricated number
 * sends a real customer to a stranger.
 *
 * **Never say anything the page does not.** Structured data that describes a
 * richer page than the one a crawler can see is the classic way to earn a
 * manual action. Everything below is also rendered as text.
 */

/** Drop empty values so no key is emitted with nothing behind it. */
const compact = <T extends Record<string, unknown>>(object: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as Partial<T>;

const Script = ({ data }: { data: unknown }) => (
  <script
    type="application/ld+json"
    // The content is built here from typed values, never from user input, and
    // JSON.stringify escapes what it emits.
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

/**
 * The business itself.
 *
 * `AutoRental` rather than the generic `LocalBusiness`: it is the specific type
 * for this trade, and specificity is what lets a search engine answer "car
 * hire in Lahore" with this rather than with a list of shops.
 */
export const BusinessSchema = ({
  contact,
  cheapestPerDay,
}: {
  contact: Contact;
  /** Drives `priceRange`. Omitted entirely when no car is published yet. */
  cheapestPerDay?: number | null;
}) => {
  const address = compact({
    "@type": "PostalAddress",
    streetAddress: contact.address ?? undefined,
    addressLocality: "Lahore",
    addressRegion: "Punjab",
    addressCountry: "PK",
  });

  return (
    <Script
      data={compact({
        "@context": "https://schema.org",
        "@type": "AutoRental",
        "@id": `${SITE_URL}/#business`,
        name: "Musafir Rent A Car",
        alternateName: "Musafir",
        url: SITE_URL,
        description:
          "Car rental in Lahore, by the day, with a driver or self-drive. One quoted price for the whole booking, the kilometre allowance written down, and nothing held until the booking is confirmed.",
        telephone: contact.phone ?? undefined,
        email: contact.email ?? undefined,
        address,
        areaServed: { "@type": "City", name: "Lahore", addressCountry: "PK" },
        currenciesAccepted: "PKR",
        paymentAccepted: "Cash, Bank transfer",
        knowsLanguage: ["en", "ur"],
        priceRange: cheapestPerDay ? `From PKR ${cheapestPerDay} per day` : undefined,
        sameAs: contact.whatsapp ? [`https://wa.me/${contact.whatsapp}`] : undefined,
      })}
    />
  );
};

/**
 * One car, as an offer.
 *
 * The price is the daily rate, expressed with a unit so a crawler does not
 * read "9500" as the cost of the whole booking. `availability` reflects what
 * the page says: a car marked taken for the visitor's dates is not in stock.
 */
export const CarSchema = ({ car }: { car: PublicCar }) => {
  const rate = car.withDriverRate ?? car.selfDriveRate;
  if (!rate) return null;

  return (
    <Script
      data={compact({
        "@context": "https://schema.org",
        "@type": "Car",
        "@id": `${SITE_URL}/cars/${car.id}#car`,
        name: `${car.make} ${car.model}`,
        brand: { "@type": "Brand", name: car.make },
        model: car.model,
        vehicleModelDate: car.year ? String(car.year) : undefined,
        color: car.color ?? undefined,
        fuelType: car.fuelType,
        vehicleTransmission: car.transmission ?? undefined,
        vehicleSeatingCapacity: {
          "@type": "QuantitativeValue",
          value: car.seats,
        },
        image: car.photos.length ? car.photos.map((p) => `${SITE_URL}${p}`) : undefined,
        description: car.description ?? undefined,
        offers: compact({
          "@type": "Offer",
          url: `${SITE_URL}/cars/${car.id}`,
          priceCurrency: "PKR",
          availability:
            car.available === false
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: rate,
            priceCurrency: "PKR",
            unitText: "DAY",
            referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" },
          },
          seller: { "@id": `${SITE_URL}/#business` },
        }),
      })}
    />
  );
};

/**
 * The questions on /how-it-works, in the form Google shows as an expandable
 * answer and an assistant quotes directly.
 *
 * Fed from the same array the page renders, so the two cannot drift. A
 * `FAQPage` whose answers differ from the visible text is a manual action
 * waiting to happen.
 */
export const FaqSchema = ({ faq }: { faq: ReadonlyArray<{ q: string; a: string }> }) => (
  <Script
    data={{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    }}
  />
);

/** Where this page sits, so a result shows a path rather than a bare URL. */
export const BreadcrumbSchema = ({
  trail,
}: {
  trail: ReadonlyArray<{ name: string; path: string }>;
}) => (
  <Script
    data={{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: `${SITE_URL}${crumb.path}`,
      })),
    }}
  />
);
