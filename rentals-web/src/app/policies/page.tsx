import type { Metadata } from "next";

import { Button, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  alternates: { canonical: "/policies" },
  title: "How it works & terms",
  description:
    "What a Musafir booking includes, what you need to bring, how fuel and kilometres are charged, and how to cancel.",
};

/**
 * The page that prevents arguments.
 *
 * Written as prose a person can read at the kerb, not as a wall of clauses,
 * every rule here corresponds to a field the booking actually carries, so what
 * a customer reads and what the system charges are the same thing.
 *
 * The wording is the office's to change. The AMOUNTS are deliberately not
 * printed as fixed numbers where they vary per car or per booking; the ones
 * that would be wrong on some bookings are described instead of quoted.
 */
const SECTIONS = [
  {
    id: "booking",
    title: "Making a booking",
    points: [
      "Send us your dates and we will tell you what is free. Nothing is held until we confirm it back to you, an enquiry costs you nothing and reserves nothing.",
      "Once you confirm, one specific car is held for your dates and taken off the list for everyone else.",
      "An advance secures the booking. What is left is due at handover unless we have agreed otherwise in writing.",
    ],
  },
  {
    id: "documents",
    title: "What to bring",
    points: [
      "Your original CNIC. We take a copy at handover and it goes with the agreement, no exceptions, including for repeat customers.",
      "For self-drive, a valid Pakistani driving licence, and we may ask for a second form of verification.",
      "A refundable security deposit, in cash or by transfer. It is held, not spent, and returned when the car comes back as it left.",
    ],
  },
  {
    id: "days",
    title: "How a day is counted",
    points: [
      "A rental day is 24 hours from the time you take the car, not a calendar date. Out at 10am Monday, back by 10am Tuesday, is one day.",
      "You have an hour of grace on the return. Past that, the next day begins, an extra hour and an extra afternoon are not the same thing, and we would rather say so than argue about it later.",
      "If you need the car longer, tell us before the return time. Extending is usually easy; extending after the fact is a phone call nobody enjoys.",
    ],
  },
  {
    id: "kilometres",
    title: "Kilometres and fuel",
    points: [
      "Each booking includes a set number of kilometres per day. The figure is on the car's card and on your agreement before you accept it.",
      "Kilometres past the allowance are charged at the per-kilometre rate agreed at booking. The odometer is photographed at handover and again at return, so the distance is never in dispute.",
      "Fuel is full to full. The car goes out with a full tank and should come back with one. If it does not, we charge for what is missing at the pump price of the day.",
      "Tolls, parking and any traffic challan issued while the car is with you are yours.",
    ],
  },
  {
    id: "driver",
    title: "With a driver",
    points: [
      "Chauffeur-driven is our normal way of renting. The driver's time is in the daily rate.",
      "For long days or out-of-city trips we agree a driver allowance up front, which covers their food and rest. It is on the booking, not sprung on you at the end.",
      "Our drivers work legal hours. On a long trip, a second driver or a rest stop is part of the plan rather than a surprise.",
    ],
  },
  {
    id: "care",
    title: "Looking after the car",
    points: [
      "The car comes to you clean and photographed. We record any existing marks with you standing there, so you are never asked about damage that was already there.",
      "Smoking in the car, carrying anything illegal, taking the car out of the agreed area, or letting somebody who is not on the agreement drive it, all end the booking immediately.",
      "If something goes wrong mechanically, call us. It is our car and our problem, do not arrange repairs yourself and send us the bill.",
    ],
  },
  {
    id: "cancelling",
    title: "Changing or cancelling",
    points: [
      "Plans change. Tell us as early as you can and we will move the dates where we still can.",
      "Cancel well ahead and the advance is returned in full. Cancel at short notice, when we have turned other work away for your dates, and part of it may be retained, we will tell you which applies when you call, not afterwards.",
      "We will only cancel on you for something genuine, an accident on a previous booking, a breakdown. If that happens we will find you another car or return every rupee.",
    ],
  },
];

const PoliciesPage = () => (
  <>
    <section className="border-b border-line bg-paper-deep">
      <Container className="py-14 sm:py-16">
        <Eyebrow>How it works</Eyebrow>
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold sm:text-5xl">
          The rules, in the words we would use on the phone
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
          Nothing on this page is a surprise waiting to happen. Every figure that
          varies, the daily rate, the kilometre allowance, the deposit, is
          agreed with you before a car moves, and written on the agreement you
          keep a copy of.
        </p>
      </Container>
    </section>

    <Container className="py-14">
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="h-fit lg:sticky lg:top-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            On this page
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-ink-soft transition-colors hover:text-ink">
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-2xl space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">{section.title}</h2>
              <ul className="mt-4 space-y-3.5">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-action" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Something not covered here?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Ask before you book rather than after. We would much rather spend
              five minutes on the phone than have you find out something at the
              kerb.
            </p>
            <Button href="/contact" className="mt-5">
              Ask us
            </Button>
          </div>
        </div>
      </div>
    </Container>
  </>
);

export default PoliciesPage;
