import { Fuel, Settings2, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui";
import type { PublicCar } from "@/lib/api";
import { pkr, titleCase } from "@/lib/format";
import { cn } from "@/lib/cn";

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
  className,
}: {
  car: PublicCar;
  /** Where the card goes. Defaults to the car's own page. */
  href?: string;
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
  const target = href ?? (car.source === "fleet" ? `/cars/${car.id}` : `/book?car=${car.id}`);

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
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-shadow duration-200",
        unavailable ? "opacity-60" : "hover:shadow-[0_8px_28px_rgba(23,20,15,0.10)]",
        className,
      )}
    >
      <Wrap className="relative block aspect-[16/10] overflow-hidden">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={`${car.make} ${car.model}`}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="car-placeholder flex size-full flex-col items-center justify-center gap-1">
            <span className="font-display text-2xl font-semibold text-paper/85">
              {car.make}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brass-bright">
              {car.model}
            </span>
          </div>
        )}
        {unavailable ? (
          <span className="absolute end-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-[11px] font-semibold text-paper">
            Taken on these dates
          </span>
        ) : car.available === true ? (
          <span className="absolute end-3 top-3 rounded-full bg-forest px-3 py-1 text-[11px] font-semibold text-paper">
            Free on your dates
          </span>
        ) : null}
      </Wrap>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold text-ink">
          <Wrap className={linked ? "hover:text-forest" : undefined}>
            {car.make} {car.model}
          </Wrap>
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          {[car.year, car.color ? titleCase(car.color) : null].filter(Boolean).join(" · ")}
        </p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
          <li className="flex items-center gap-1.5">
            <Users className="size-3.5 text-brass" aria-hidden />
            {car.seats} seats
          </li>
          {car.transmission ? (
            <li className="flex items-center gap-1.5">
              <Settings2 className="size-3.5 text-brass" aria-hidden />
              {titleCase(car.transmission)}
            </li>
          ) : null}
          <li className="flex items-center gap-1.5">
            <Fuel className="size-3.5 text-brass" aria-hidden />
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
          <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                With a driver
              </p>
              <p className="font-display text-2xl font-semibold text-forest tnum">
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
                className="rounded-full border border-forest/25 px-4 py-2 text-xs font-semibold text-forest transition-colors duration-150 hover:bg-forest hover:text-paper"
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
