import { ArrowLeft, Check, Fuel, Gauge, Settings2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Button, Container, Eyebrow } from "@/components/ui";
import { getCar, getCars } from "@/lib/api";
import { telHref, whatsappLink } from "@/lib/config";
import { getContact } from "@/lib/site";
import { pkr, titleCase } from "@/lib/format";
import { CarCard } from "@/components/car-card";

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
  return {
    title: `${car.make} ${car.model}`,
    description:
      car.description ??
      `Rent a ${car.make} ${car.model} in Lahore from Musafir, by the day, with a driver or self-drive.`,
  };
};

const CarPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const [car, contact] = await Promise.all([getCar(id), getContact()]);
  if (!car) notFound();

  const others = (await getCars()).filter((other) => other.id !== car.id).slice(0, 3);
  const selfDrive = contact.selfDriveEnabled && car.selfDriveRate;

  return (
    <>
      <section className="border-b border-line bg-paper-deep">
        <Container className="py-10 sm:py-14">
          <Link
            href="/cars"
            className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All cars
          </Link>

          <div className="mt-6 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-line">
              {car.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={car.photos[0]}
                  alt={`${car.make} ${car.model}`}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="car-placeholder flex aspect-[16/10] w-full flex-col items-center justify-center gap-1">
                  <span className="font-display text-4xl font-semibold text-paper/85">
                    {car.make}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-brass-bright">
                    {car.model}
                  </span>
                </div>
              )}
              {car.photos.length > 1 ? (
                <div className="grid grid-cols-4 gap-1 bg-line/40 p-1">
                  {car.photos.slice(1, 5).map((photo) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={photo}
                      src={photo}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>

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
                  <Users className="size-4 text-brass" aria-hidden />
                  {car.seats} seats
                </li>
                {car.transmission ? (
                  <li className="flex items-center gap-2">
                    <Settings2 className="size-4 text-brass" aria-hidden />
                    {titleCase(car.transmission)}
                  </li>
                ) : null}
                <li className="flex items-center gap-2">
                  <Fuel className="size-4 text-brass" aria-hidden />
                  {titleCase(car.fuelType)}
                </li>
                {car.kmIncludedPerDay ? (
                  <li className="flex items-center gap-2 tnum">
                    <Gauge className="size-4 text-brass" aria-hidden />
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
                    <Badge key={feature} tone="brass">
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
                <div className="rounded-2xl border border-forest/20 bg-card p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    With a driver
                  </p>
                  <p className="font-display mt-1 text-3xl font-semibold text-forest tnum">
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
                <Button href={`/book?car=${car.id}`} variant="brass" size="lg">
                  Check dates and book
                </Button>
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
              </div>

              <p className="mt-4 text-xs text-muted">
                Or call{" "}
                <a href={telHref(contact.phone)} className="font-semibold text-forest tnum">
                  {contact.phone}
                </a>
                . Nothing is held until we confirm it with you.
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
              <CarCard key={other.id} car={other} />
            ))}
          </div>
        </Container>
      ) : null}
    </>
  );
};

export default CarPage;
