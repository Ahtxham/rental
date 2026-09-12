import { PressLink } from "@/components/motion/pressable";
import type { PublicCar } from "@/lib/api";
import { cn } from "@/lib/cn";
import { withSearch } from "@/lib/search-params";
import { pkr, titleCase } from "@/lib/format";

/**
 * One car, photograph first.
 *
 * The chrome is gone on purpose. A border and a filled panel around every card
 * turn a row of cars into a row of boxes with cars in them, and the picture is
 * the only thing on here anybody is actually choosing between. So the
 * photograph is the object, and the words sit underneath on the page itself,
 * the way a caption sits under a plate rather than inside a frame with it.
 *
 * What a customer is not told is as deliberate as what they are: no
 * registration number, and nothing about whether the car belongs to Musafir or
 * to somebody lending it. See `car-card.tsx`, which says the same at length.
 */
export const CarTile = ({
  car,
  search = "",
  className,
}: {
  car: PublicCar;
  /** The dates the visitor has already chosen, carried on to the next page. */
  search?: string;
  className?: string;
}) => {
  const photo = car.photos?.[0];
  const unavailable = car.available === false;
  const href = withSearch(
    car.source === "fleet" ? `/cars/${car.id}` : `/book?car=${car.id}`,
    search,
  );

  const spec = [
    `${car.seats} seats`,
    car.transmission ? titleCase(car.transmission) : null,
    titleCase(car.fuelType),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PressLink
      href={href}
      kind="card"
      data-rail-item
      className={cn("group block w-[76vw] max-w-[340px] shrink-0 sm:w-[340px]", className)}
    >
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden rounded-[26px] bg-night",
          unavailable && "opacity-60",
        )}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={`${car.make} ${car.model}`}
            /* The browser's own image drag would otherwise start the moment a
               finger moves across the picture, and take the rail's gesture
               with it. */
            draggable={false}
            loading="lazy"
            decoding="async"
            className="photo-zoom size-full select-none object-cover"
          />
        ) : (
          <div className="car-placeholder flex size-full flex-col items-center justify-center gap-1">
            <span className="font-display text-3xl font-semibold text-paper/85">{car.make}</span>
            <span className="t-eyebrow text-amber">{car.model}</span>
          </div>
        )}

        {car.available !== null ? (
          <span
            className={cn(
              "vibrant absolute end-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-semibold",
              unavailable ? "material-night text-paper" : "bg-paper/90 text-ink",
            )}
          >
            {unavailable ? "Taken on your dates" : "Free on your dates"}
          </span>
        ) : null}
      </div>

      {/* Stacked rather than name-left, price-right. A name that wraps to two
          lines drags a price pinned beside it out of line with every other
          card in the row, and "Corolla Altis" is not a name worth truncating
          to keep a column tidy. */}
      <div className="mt-5">
        <h3 className="t-headline font-display text-ink">
          {car.make} {car.model}
        </h3>
        <p className="t-caption mt-1.5 text-muted">{spec}</p>
        {car.withDriverRate ? (
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            <span className="font-display text-lg font-semibold text-ink tnum">
              {pkr(car.withDriverRate)}
            </span>{" "}
            a day, with a driver
          </p>
        ) : null}
      </div>
    </PressLink>
  );
};
