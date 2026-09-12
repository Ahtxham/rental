import { ArrowLeft, Check, Fuel, Gauge, Settings2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Button, Container, Eyebrow } from "@/components/ui";
import { getCar, getCars } from "@/lib/api";
import { carSearch, withSearch } from "@/lib/search-params";
import { telHref, whatsappLink } from "@/lib/config";
import { SITE_URL } from "@/lib/config";
import { getContact } from "@/lib/site";
import { pkr, titleCase } from "@/lib/format";
import { CarCard } from "@/components/car-card";
import { CarGallery } from "@/components/car-gallery";
import { BreadcrumbSchema, CarSchema } from "@/components/structured-data";

/**
 * One car, on its own page.
 *
 * Musafir's own cars only, a borrowed car is on the site for the days its
 * owner offered it and gone again after, and a URL that 404s half the year is
 * worse than no URL. Those are booked from the search results instead.
 */
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> => {
  const car = await getCar((await params).id);
  if (!car) return { title: "Car not found" };
  const title = `Rent a ${car.make} ${car.model} in Lahore`;
  const description =
    car.description ??
    `Rent a ${car.make} ${car.model} in Lahore from Musafir, by the day, with a driver or self-drive.`;

  return {
    title,
    description,
    alternates: { canonical: `/cars/${car.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/cars/${car.id}`,
      // The car's own photograph where there is one, so a shared link shows
      // the car rather than the generic brand card.
      images: car.photos.length ? [{ url: car.photos[0] }] : undefined,
    },
  };
};

const CarPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /**
   * The dates the visitor already chose, if they came from a search.
   *
   * Read here purely so they can be handed on. This page does not filter by
   * them: it is one car's page and it exists whether or not that car is free
   * next Tuesday. What it must not do is lose them.
   */
  searchParams: Promise<{ from?: string; to?: string; drive?: string }>;
}) => {
  const { id } = await params;
  const [car, contact, query] = await Promise.all([getCar(id), getContact(), searchParams]);
  if (!car) notFound();

  const search = carSearch(query);

  const others = (await getCars()).filter((other) => other.id !== car.id).slice(0, 3);
  const selfDrive = contact.selfDriveEnabled && car.selfDriveRate;

  return (
    <>
      <CarSchema car={car} />
      <BreadcrumbSchema
        trail={[
          { name: "Musafir Rent A Car", path: "/" },
          { name: "Cars", path: "/cars" },
          { name: `${car.make} ${car.model}`, path: `/cars/${car.id}` },
        ]}
      />
      <section className="border-b border-line bg-paper-deep">
        <Container className="py-10 sm:py-14">
          <Link
            href="/cars"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All cars
          </Link>

          <div className="mt-6 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
            {/* One slider rather than a big photograph and a row of stamps
                underneath it. The thumbnails were four pictures nobody could
                see properly and a fifth that was simply not shown; this way
                every photograph is the same size as the first one, and any of
                them opens full screen. */}
            <CarGallery
              photos={car.photos}
              alt={`${car.make} ${car.model}`}
              aspect="aspect-[16/10]"
              rounded="rounded-2xl"
              fallback={
                <div className="car-placeholder flex size-full flex-col items-center justify-center gap-1">
                  <span className="font-display text-4xl font-semibold text-paper/85">
                    {car.make}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-amber">
                    {car.model}
                  </span>
                </div>
              }
            />

            <div>
              <Eyebrow>Lahore · By the day</Eyebrow>
              <h1 className="font-display mt-2 text-4xl font-semibold sm:text-5xl">
                {car.make} {car.model}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {[car.year, car.color ? titleCase(car.color) : null].filter(Boolean).join(" · ")}
              </p>

              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
                <li className="flex items-center gap-2">
                  <Users className="size-4 text-muted" aria-hidden />
                  {car.seats} seats
                </li>
                {car.transmission ? (
                  <li className="flex items-center gap-2">
                    <Settings2 className="size-4 text-muted" aria-hidden />
                    {titleCase(car.transmission)}
                  </li>
                ) : null}
                <li className="flex items-center gap-2">
                  <Fuel className="size-4 text-muted" aria-hidden />
                  {titleCase(car.fuelType)}
                </li>
                {car.kmIncludedPerDay ? (
                  <li className="flex items-center gap-2 tnum">
                    <Gauge className="size-4 text-muted" aria-hidden />
                    {car.kmIncludedPerDay} km a day
                  </li>
                ) : null}
              </ul>

              {car.description ? (
                <p className="mt-5 text-base leading-relaxed text-ink-soft">{car.description}</p>
              ) : null}

              {car.features.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {car.features.map((feature) => (
                    <Badge key={feature} tone="neutral">
                      <Check className="size-3" aria-hidden />
                      {feature}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {/* The prices, side by side where both are offered. Two panels
                  rather than a line of small print, because "which of these
                  two am I paying" is the decision this page exists for. */}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink/15 bg-card p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    With a driver
                  </p>
                  <p className="font-display mt-1 text-3xl font-semibold text-ink tnum">
                    {pkr(car.withDriverRate)}
                    <span className="ms-1 font-body text-xs font-medium text-muted">/ day</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">Their time is in the rate.</p>
                </div>

                {selfDrive ? (
                  <div className="rounded-2xl border border-line bg-card p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Self-drive
                    </p>
                    <p className="font-display mt-1 text-3xl font-semibold text-ink tnum">
                      {pkr(car.selfDriveRate)}
                      <span className="ms-1 font-body text-xs font-medium text-muted">/ day</span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      CNIC and a security deposit required.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Self-drive
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Not offered on this car. Every booking goes out with one of
                      our drivers.
                    </p>
                  </div>
                )}
              </div>

              {car.extraKmRate && car.kmIncludedPerDay ? (
                <p className="mt-4 text-sm text-muted tnum">
                  {car.kmIncludedPerDay} km included each day · {pkr(car.extraKmRate)} per km
                  after that. Fuel is yours; the car goes out full and comes back full.
                </p>
              ) : null}

              <div className="mt-7 flex flex-wrap gap-3">
                <Button href={withSearch(`/book?car=${car.id}`, search)} size="lg">
                  Check dates and book
                </Button>
                {contact.whatsapp ? (
                <a
                  href={whatsappLink(
                    contact.whatsapp,
                    `Assalam o alaikum, I am interested in the ${car.make} ${car.model}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-ink/5"
                >
                  Ask on WhatsApp
                </a>
                ) : null}
              </div>

              <p className="mt-4 text-xs text-muted">
                {contact.phone ? (
                  <>
                    Or call{" "}
                    <a href={telHref(contact.phone)} className="font-semibold text-ink tnum">
                      {contact.phone}
                    </a>
                    .{" "}
                  </>
                ) : null}
                Nothing is held until we confirm it with you.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {others.length > 0 ? (
        <Container className="py-14">
          <h2 className="font-display text-2xl font-semibold">Other cars</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((other) => (
              <CarCard key={other.id} car={other} search={search} />
            ))}
          </div>
        </Container>
      ) : null}
    </>
  );
};

export default CarPage;
