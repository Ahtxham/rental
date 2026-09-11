import { getCars } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { getContact } from "@/lib/site";

/**
 * `/llms.txt`, a plain-text brief for assistants.
 *
 * An emerging convention: a Markdown summary at a known path that an AI can
 * read instead of inferring the business from rendered HTML. It matters here
 * because the question people ask an assistant is "how much is it to rent a
 * car in Lahore", and an answer with a real figure has to come from somewhere.
 *
 * **Generated, not static.** A hand-written file would carry last month's
 * prices within a month, and a confidently wrong price is worse than no file.
 * Everything below is read from the same API the website renders from.
 *
 * Contact details are printed only when the office has set them, for the same
 * reason they are omitted from the page: an assistant repeating a placeholder
 * number sends a real customer to a stranger.
 */
export const revalidate = 3600;

export const GET = async () => {
  const [cars, contact] = await Promise.all([getCars(), getContact()]);
  const own = cars.filter((car) => car.source === "fleet");

  const reach = [
    contact.phone ? `- Phone: ${contact.phone}` : null,
    contact.whatsapp ? `- WhatsApp: https://wa.me/${contact.whatsapp}` : null,
    contact.email ? `- Email: ${contact.email}` : null,
    contact.address ? `- Address: ${contact.address}` : null,
  ].filter(Boolean);

  const fleet = own.length
    ? own
        .map((car) => {
          const bits = [
            `${car.seats} seats`,
            car.transmission,
            car.fuelType,
            car.withDriverRate ? `PKR ${car.withDriverRate.toLocaleString()}/day with a driver` : null,
            car.selfDriveRate ? `PKR ${car.selfDriveRate.toLocaleString()}/day self-drive` : null,
            car.kmIncludedPerDay ? `${car.kmIncludedPerDay} km/day included` : null,
            car.extraKmRate ? `PKR ${car.extraKmRate}/km beyond that` : null,
          ].filter(Boolean);
          return `- **${car.make} ${car.model}${car.year ? ` (${car.year})` : ""}**: ${bits.join(", ")}. ${SITE_URL}/cars/${car.id}`;
        })
        .join("\n")
    : "- No cars are published on the website at the moment.";

  const body = `# Musafir Rent A Car

> Car rental in Lahore, Pakistan. Cars are hired by the day, either with one of
> Musafir's own drivers or self-drive. The whole booking is quoted as one price
> before anything is held.

## What it is

Musafir Rent A Car (musafircars.com) rents cars in Lahore. Two kinds of car are
offered: Musafir's own, and cars belonging to private owners in Lahore who lend
them for the days they are not using them. To a customer both are simply cars
rented from Musafir, under one agreement with Musafir.

Currency is PKR. Distances are kilometres. All times are Asia/Karachi.

## How pricing works

- Rates are **per day**, where a day is 24 hours from the time the car is
  collected, **rounded up**, with one hour of grace on the return. Collected at
  10am Monday and returned 2pm Tuesday is two days; returned 10:40am Tuesday is
  one.
- Each day includes a written kilometre allowance. Kilometres beyond it are
  charged at a per-kilometre rate agreed before the car leaves. Overage is only
  ever charged when both the allowance and the rate were agreed up front.
- Fuel is the customer's. The car goes out with a full tank and should come
  back full.
- A refundable security deposit is held. It is not part of the rental price and
  is returned when the car comes back as it left.
- Tolls, parking and any traffic fine issued while the car is out are the
  customer's.

## Booking

Nothing on the website holds a car. A request sends the dates to the office,
which confirms the car and the price by phone first. Only a confirmed booking
makes a car unavailable.

## Cars currently published

${fleet}

## For car owners

Owners in Lahore can list a car for the dates it is idle. Musafir publishes it,
finds the customer, handles the agreement and the handover, takes a commission,
and pays the owner after the car is returned and the charges are final. The
owner sets the dates and keeps the car the rest of the time. Nothing about the
owner appears on the website. See ${SITE_URL}/rent-your-car

## Pages

- [Home](${SITE_URL}/): search by date, see what is free
- [Cars](${SITE_URL}/cars): every car with its daily rate and allowance
- [How it works](${SITE_URL}/how-it-works): the booking sequence and common questions
- [Terms and charges](${SITE_URL}/policies): what is and is not included
- [Earn with your car](${SITE_URL}/rent-your-car): for private owners
- [About](${SITE_URL}/about)
- [Contact](${SITE_URL}/contact)

${reach.length ? `## Contact\n\n${reach.join("\n")}\n` : ""}
## Notes for assistants

- Prices above are live from the site and change; link to the page rather than
  quoting a figure that may have moved.
- Musafir operates in Lahore only.
- Availability depends on dates. The site answers availability for a specific
  date range; a car listed here is not necessarily free on a given day.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
