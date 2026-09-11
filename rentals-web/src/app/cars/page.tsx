import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CarCard } from "@/components/car-card";
import { BreadcrumbSchema } from "@/components/structured-data";
import { SearchForm } from "@/components/search-form";
import { Button, Container, Eyebrow } from "@/components/ui";
import { getCars } from "@/lib/api";
import { getContact } from "@/lib/site";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = {
  alternates: { canonical: "/cars" },
  title: "Our cars",
  description:
    "Every car Musafir rents in Lahore, with the daily rate, the kilometre allowance and what each one seats.",
};

/** Staggered by column, so each ROW of cards arrives as one movement. */
const REVEAL = ["reveal", "reveal reveal-2", "reveal reveal-3"] as const;

const CarsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) => {
  const params = await searchParams;
  const dated = Boolean(params.from && params.to && params.to > params.from);

  const [cars, contact] = await Promise.all([
    getCars(params.from, params.to),
    getContact(),
  ]);

  // With dates, the free ones come first. A customer scanning this page is
  // looking for a car they can actually have, and burying it under four they
  // cannot is how they leave for another site.
  const sorted = dated
    ? [...cars].sort((a, b) => Number(b.available) - Number(a.available))
    : cars;
  const freeCount = dated ? cars.filter((car) => car.available).length : null;

  return (
    <>
      <BreadcrumbSchema
        trail={[
          { name: "Musafir Rent A Car", path: "/" },
          { name: "Cars", path: "/cars" },
        ]}
      />
      <section className="border-b border-line bg-paper-deep">
        <Container className="py-14 sm:py-16">
          <Eyebrow>The cars</Eyebrow>
          <h1 className="font-display mt-3 max-w-2xl text-4xl font-semibold sm:text-5xl">
            Every car we rent, and what it costs
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            Rates are per day. Each one includes a kilometre allowance; anything
            past it is charged at the rate printed on the card, and you will have
            agreed to both before the car leaves.
          </p>

          <Suspense fallback={<div className="mt-8 h-40 rounded-2xl bg-ink/5" />}>
            <SearchForm
              className="mt-8 max-w-3xl"
              tone="light"
              destination="/cars"
              selfDriveEnabled={contact.selfDriveEnabled}
            />
          </Suspense>

          {dated ? (
            <p className="mt-4 text-sm font-semibold text-forest tnum">
              {freeCount} of {cars.length} free from {shortDate(params.from!)} to{" "}
              {shortDate(params.to!)}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Pick your dates to see what is actually free, and to see the cars
              our partners are offering that week.
            </p>
          )}
        </Container>
      </section>

      <Container className="py-14">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-12 text-center">
            <p className="font-display text-2xl text-ink">Nothing to show for those dates</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {contact.phone || contact.whatsapp ? (
                "Call or WhatsApp us with your dates and we will tell you exactly what is free, the phone is faster than this page on a busy week anyway."
              ) : (
                <>
                  <Link href="/book" className="font-semibold text-forest underline underline-offset-4">
                    Send us your dates
                  </Link>{" "}
                  and we will come back with exactly what is free.
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((car, index) => (
              <CarCard
                key={car.id}
                car={car}
                className={REVEAL[Math.min(index % 3, 2)]}
              />
            ))}
          </div>
        )}

        {/* Said plainly, because the gap is deliberate and people notice it. */}
        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-muted">
          We do not publish registration numbers. You will see the plate when you
          see the car, it is on the agreement you sign at handover, and there is
          no reason for it to sit on a public web page before then.
        </p>

        {/* Aimed at somebody who came to rent and owns a car of their own.
            This page is where that thought occurs, because they have just
            spent a minute looking at what cars like theirs go out for. */}
        <div className="reveal mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-brass/25 bg-brass-wash/60 p-6">
          <div className="flex items-start gap-4">
            <KeyRound className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden />
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">
                Some of these belong to people like you
              </h2>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-ink-soft">
                If your car sits outside most of the week, tell us the days it is
                free and we will put it to work on those days, and no others. You
                keep the keys the rest of the time.
              </p>
            </div>
          </div>
          <Button href="/rent-your-car" variant="brass">
            Earn with your car
          </Button>
        </div>
      </Container>
    </>
  );
};

export default CarsPage;
