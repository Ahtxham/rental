import { Fuel, Settings2, Users } from "lucide-react";
import Link from "next/link";

import { CarGallery } from "@/components/car-gallery";
import { Badge } from "@/components/ui";
import type { PublicCar } from "@/lib/api";
import { pkr, titleCase } from "@/lib/format";
import { cn } from "@/lib/cn";
import { withSearch } from "@/lib/search-params";

/**
 * One car, as a customer is allowed to see it.
 *
 * No registration number, by design and not by omission: a plate is what
 * somebody needs to pretend to be the car, and a customer choosing a Corolla
 * does not need to know which Corolla until they are standing next to it. The
 * cars page says so out loud rather than leaving a gap where people expect one.
 *
 * Nor is there anything about whose car it is. Some of these belong to people
 * who lend them to us; to whoever is renting, that is not a distinction, and
 * publishing it would be publishing something about a private individual.
 */
export const CarCard = ({
  car,
  href,
  linked = true,
  search = "",
  gallery = false,
  className,
}: {
  car: PublicCar;
  /** Where the card goes. Defaults to the car's own page. */
  href?: string;
  /**
   * The dates the visitor has already chosen, as a query string.
   *
   * Passed on to wherever this card leads, so that choosing a car never costs
   * somebody the dates they picked two screens ago.
   */
  search?: string;
  /**
   * Show every photograph instead of just the first one.
   *
   * Off by default, and off in lists on purpose. A slider inside a card that
   * is itself a button puts controls inside a control, which is invalid markup
   * and, more to the point, means a tap meant for the next photograph selects
   * the car instead. Turn it on where the card is a showcase rather than a
   * choice.
   */
  gallery?: boolean;
  /**
   * Whether the card is its own link.
   *
   * Off where the card sits INSIDE a control, the booking flow makes each one
   * a selectable button, and an anchor nested in a button is invalid markup
   * that keyboard users land on before the thing they are trying to press.
   */
  linked?: boolean;
  className?: string;
}) => {
  const photo = car.photos?.[0];
  const unavailable = car.available === false;
  const target = withSearch(
    href ?? (car.source === "fleet" ? `/cars/${car.id}` : `/book?car=${car.id}`),
    search,
  );

  // One wrapper for both shapes, so the layout cannot drift between them.
  const Wrap = ({ className: wrapClass, children }: { className?: string; children: React.ReactNode }) =>
    linked ? (
      <Link href={target} className={wrapClass}>
        {children}
      </Link>
    ) : (
      <span className={wrapClass}>{children}</span>
    );

  return (
    <article className={cn("group flex flex-col", unavailable && "opacity-60", className)}>
      {gallery && car.photos.length > 0 ? (
        <div className="relative">
          <CarGallery
            photos={car.photos}
            alt={`${car.make} ${car.model}`}
            aspect="aspect-[4/3]"
          />
          {car.available !== null ? (
            <span
              className={cn(
                "pointer-events-none absolute end-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                unavailable ? "vibrant material-night text-paper" : "bg-paper/90 text-ink",
              )}
            >
              {unavailable ? "Taken on these dates" : "Free on your dates"}
            </span>
          ) : null}
        </div>
      ) : (
      <Wrap className="relative block aspect-[4/3] overflow-hidden rounded-[26px] bg-night">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={`${car.make} ${car.model}`}
            draggable={false}
            loading="lazy"
            decoding="async"
            className="photo-zoom size-full select-none object-cover"
          />
        ) : (
          <div className="car-placeholder flex size-full flex-col items-center justify-center gap-1">
            <span className="font-display text-3xl font-semibold text-paper/85">{car.make}</span>
            <span className="t-eyebrow text-paper/55">{car.model}</span>
          </div>
        )}
        {unavailable ? (
          <span className="vibrant material-night absolute end-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-semibold text-paper">
            Taken on these dates
          </span>
        ) : car.available === true ? (
          <span className="absolute end-4 top-4 rounded-full bg-paper/90 px-3 py-1.5 text-[11px] font-semibold text-ink">
            Free on your dates
          </span>
        ) : null}
      </Wrap>
      )}

      {/* The words sit on the page rather than inside a panel with the
          picture. A border round every car turns a list of cars into a list
          of boxes, and the photograph is the thing being chosen between. */}
      <div className="flex flex-1 flex-col pt-5">
        <h3 className="t-headline font-display text-ink">
          <Wrap className={linked ? "hover:text-ink" : undefined}>
            {car.make} {car.model}
          </Wrap>
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          {[car.year, car.color ? titleCase(car.color) : null].filter(Boolean).join(" · ")}
        </p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
          <li className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted" aria-hidden />
            {car.seats} seats
          </li>
          {car.transmission ? (
            <li className="flex items-center gap-1.5">
              <Settings2 className="size-3.5 text-muted" aria-hidden />
              {titleCase(car.transmission)}
            </li>
          ) : null}
          <li className="flex items-center gap-1.5">
            <Fuel className="size-3.5 text-muted" aria-hidden />
            {titleCase(car.fuelType)}
          </li>
        </ul>

        {car.features.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {car.features.slice(0, 3).map((feature) => (
              <Badge key={feature}>{feature}</Badge>
            ))}
          </div>
        ) : null}

        {car.description ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{car.description}</p>
        ) : null}

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t border-line/80 pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                With a driver
              </p>
              <p className="font-display text-2xl font-semibold text-ink tnum">
                {pkr(car.withDriverRate)}
                <span className="ms-1 font-body text-xs font-medium text-muted">/ day</span>
              </p>
              {/* Only where it is actually offered. A blank line here would
                  read as "we do not do self-drive", which is not the same as
                  "not on this car". */}
              {car.selfDriveRate ? (
                <p className="mt-0.5 text-xs text-muted tnum">
                  Self-drive {pkr(car.selfDriveRate)} / day
                </p>
              ) : null}
            </div>
            {linked ? (
              <Link
                href={target}
                className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
              >
                {unavailable ? "Details" : "Book"}
              </Link>
            ) : null}
          </div>

          {car.kmIncludedPerDay ? (
            <p className="mt-3 text-xs text-muted tnum">
              {car.kmIncludedPerDay} km a day included
              {car.extraKmRate ? ` · ${pkr(car.extraKmRate)} per km after that` : ""}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
};
