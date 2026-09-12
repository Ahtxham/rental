import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  FileText,
  HandCoins,
  KeyRound,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CarTile } from "@/components/car-tile";
import { HeroDates } from "@/components/hero-dates";
import { PressLink } from "@/components/motion/pressable";
import { Rail } from "@/components/motion/rail";
import { BusinessSchema } from "@/components/structured-data";
import { Container, Eyebrow } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getCars } from "@/lib/api";
import { getContact } from "@/lib/site";
import { pkr } from "@/lib/format";

/**
 * The one page most visitors will read, and probably the only one.
 *
 * It answers, in this order, the four things somebody renting a car actually
 * asks: can I have one on my dates, what does it cost, what am I getting, and
 * who are you. Everything else on this site is a longer version of one of
 * those. The car-owner pitch comes last on purpose, it is a real part of the
 * business, but a visitor who arrived to rent a car should not have to scroll
 * past an offer aimed at somebody else to find a price.
 *
 * Laid out in a small number of large sections rather than a long run of small
 * ones. Simplicity is not the same as minimalism: nothing has been hidden a
 * level down, the page says the same things it always said. But each of them
 * now gets a screen to itself, alternating dark and light, so the eye is told
 * where one idea ends and the next begins by the room around it rather than by
 * a rule drawn across the page.
 */

const REVEAL = ["reveal", "reveal reveal-2", "reveal reveal-3", "reveal reveal-4"] as const;
const revealAt = (index: number) => REVEAL[Math.min(index, REVEAL.length - 1)];

const HOW_IT_WORKS = [
  {
    title: "Pick your dates",
    body: "Tell us the days you need a car. You will see what is free on exactly those dates, and what each one costs for the whole booking, not a per-day figure you have to do arithmetic on.",
  },
  {
    title: "We confirm it with you",
    body: "One car is held for you and we call to confirm. You will know the model, the kilometre allowance, and what happens if you go over it, before you have paid anything.",
  },
  {
    title: "Keys, and the road",
    body: "We photograph the odometer and the fuel gauge with you standing there, you keep a copy of the agreement, and off you go.",
  },
];

const PROMISES = [
  {
    icon: FileText,
    title: "One quoted price",
    body: "The daily rate, the kilometres it includes and the cost of going over are all written down before you pay anything. No arrival-day surprises.",
  },
  {
    icon: ShieldCheck,
    title: "Drivers we know",
    body: "Chauffeur-driven bookings go out with a driver on our own roster, with a licence we have seen and a record we keep. Not a number somebody passed us this morning.",
  },
  {
    icon: Sparkles,
    title: "Clean and full",
    body: "Serviced, washed, and with a full tank. Bring it back full and there is nothing to settle on fuel.",
  },
  {
    icon: BadgeCheck,
    title: "Photographed both ways",
    body: "Odometer, fuel and condition, recorded at handover and at return, with you there. Every argument about a scratch ends with a picture.",
  },
];

const Home = async () => {
  const [cars, contact] = await Promise.all([getCars(), getContact()]);
  // The honest version of "from X": the cheapest thing actually on the page.
  const cheapest = cars.reduce<number | null>(
    (low, car) =>
      car.withDriverRate && (low === null || car.withDriverRate < low) ? car.withDriverRate : low,
    null,
  );

  return (
    <>
      <BusinessSchema contact={contact} cheapestPerDay={cheapest} />

      {/* ── The hero ───────────────────────────────────────────────────────
          One object, one sentence, one control. The photograph is not
          decoration behind the words, it is the thing being sold, so it gets
          the room and the words get out of its way. */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-night text-paper">
        <div className="hero-light pointer-events-none absolute inset-0" aria-hidden />

        {/* The car gets the bottom half and the words get the top, and they
            do not share. A headline lying across a bright roofline is two
            things competing for the same pixels, and the reader loses both. */}
        <div
          /* A phone gets a shallower band, because on a phone the date
             control cannot float over the car: there is not enough width for
             the panel to sit anywhere but straight across it, and the one
             bright line in this photograph runs the length of the car. So on
             small screens the words and the control take the top, and the car
             takes the bottom, and they do not overlap at all. */
          className="hero-object photo-fade-top pointer-events-none absolute inset-x-0 bottom-0 h-[36%] sm:h-[48%] lg:h-[56%]"
          aria-hidden
        >
          {/* A stand-in photograph, not one of Musafir's cars. Swap it for a
              real one before this goes anywhere near a customer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/showcase/hero-sedan.jpg"
            alt=""
            /* The one image the page is judged on before anything else has
               loaded, so it is fetched at the highest priority and never
               deferred. */
            fetchPriority="high"
            className="size-full select-none object-cover object-[56%_58%] sm:object-[50%_58%]"
          />
        </div>
        <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden />

        <Container className="relative flex flex-1 flex-col pt-28 sm:pt-36">
          <div className="hero-copy">
            <p className="t-eyebrow intro intro-1 text-amber">Lahore, by the day</p>
            <h1 className="t-display font-display intro intro-2 mt-5 max-w-[16ch]">
              Rent a car for the days you need it.
            </h1>
            <p className="t-body intro intro-3 mt-6 max-w-lg text-paper/70">
              {contact.selfDriveEnabled
                ? "One quoted price, the kilometres in writing, and a driver if you want one. Nothing is held until you say yes."
                : "One quoted price, the kilometres in writing, and one of our own drivers at the wheel. Nothing is held until you say yes."}
            </p>
          </div>

          <div className="intro intro-4 mt-10 max-w-3xl pb-12 lg:mt-auto lg:pt-20">
            <Suspense fallback={<div className="h-28 rounded-[22px] bg-paper/5" />}>
              <HeroDates selfDriveEnabled={contact.selfDriveEnabled} />
            </Suspense>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="t-caption text-paper/55">
                {cheapest
                  ? `Cars from ${pkr(cheapest)} a day.`
                  : "Or call us and we will sort it out on the phone in two minutes."}
              </p>

              {/* The supply side, above the fold and addressed to somebody
                  else. A car owner who lands here is not going to scroll past
                  four sections of renter copy to find out we want their car,
                  and the whole lending business depends on them finding out.
                  Kept to one line and set apart, so a customer can see at a
                  glance it is not for them. */}
              <PressLink
                href="/rent-your-car"
                className="group inline-flex items-center gap-2 rounded-full border border-paper/25 px-4 py-2 text-[0.8125rem] text-paper/85 hover:border-paper/40"
              >
                <KeyRound className="size-4 shrink-0 text-amber" aria-hidden />
                <span>
                  <strong className="font-semibold text-paper">Own a car?</strong> Earn from it
                </span>
                <ArrowRight className="lean size-4 shrink-0 text-amber" aria-hidden />
              </PressLink>
            </div>
          </div>
        </Container>
      </section>
      {/* What the header watches to know whether it is over a photograph or
          over the page. */}
      <div id="hero-end" aria-hidden />

      {/* ── The cars ───────────────────────────────────────────────────────
          Full width, and draggable. A row you can take hold of and throw is
          not a flourish here: it is how you look through a rack of anything
          in the physical world, and a car is chosen by looking. */}
      <section id="cars" className="overflow-hidden bg-paper py-24 sm:py-32">
        <Container className="flex flex-wrap items-end justify-between gap-6">
          <div className="reveal max-w-xl">
            <Eyebrow>The cars</Eyebrow>
            <h2 className="t-title font-display mt-3">What you can take out this week.</h2>
          </div>
          <PressLink
            href="/cars"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-ink"
          >
            See every car
            <ArrowRight className="lean size-4" aria-hidden />
          </PressLink>
        </Container>

        {cars.length === 0 ? (
          <Container className="mt-10">
            <div className="rounded-[26px] border border-dashed border-line p-12 text-center">
              <CarFront className="mx-auto size-6 text-muted" aria-hidden />
              {/* Only offers to be called if there is a number to call. An
                  empty state that points at a contact method the site is not
                  showing is a dead end. */}
              <p className="mt-4 text-sm text-muted">
                Our list is being updated.{" "}
                {contact.phone || contact.whatsapp ? (
                  "Call or WhatsApp us and we will tell you what is free."
                ) : (
                  <>
                    <Link href="/book" className="font-semibold text-ink underline underline-offset-4">
                      Send us your dates
                    </Link>{" "}
                    and we will come back with what is free.
                  </>
                )}
              </p>
            </div>
          </Container>
        ) : (
          <div className="reveal mt-12">
            <Rail label="Cars available to rent" trackClassName="rail-gutter">
              {cars.map((car) => (
                <CarTile key={car.id} car={car} />
              ))}
            </Rail>
          </div>
        )}
      </section>

      {/* ── Four things we can stand behind ────────────────────────────────
          Rather than a wall of adjectives. */}
      <section className="border-y border-line bg-paper-deep py-20 sm:py-24">
        <Container className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((item, index) => (
            <div key={item.title} className={revealAt(index)}>
              <item.icon className="size-5 text-muted" aria-hidden />
              <h3 className="font-display mt-4 text-lg font-semibold tracking-[-0.01em] text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────
          Three steps, numbered because they genuinely happen in this order. */}
      <section className="relative overflow-hidden bg-night py-24 text-paper sm:py-32">
        <div className="pointer-events-none absolute inset-y-0 end-0 hidden w-[44%] lg:block" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/showcase/drive.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover opacity-40"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--night) 0, rgba(4, 21, 15,0.55) 45%, transparent 100%)",
            }}
          />
        </div>

        <Container className="relative">
          <div className="reveal max-w-xl">
            <Eyebrow className="text-amber">How it works</Eyebrow>
            <h2 className="t-title font-display mt-3">
              Three steps, and one of them is us calling you back.
            </h2>
          </div>

          <ol className="mt-14 grid max-w-3xl gap-10 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.title} className={revealAt(index)}>
                <span className="font-display block text-5xl font-semibold text-paper/25 tnum">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display mt-3 text-xl font-semibold tracking-[-0.015em]">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-paper/65">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── The other half of the business ─────────────────────────────────
          And the reason the row above is longer than a company this size
          could manage alone. Placed after the cars rather than at the foot of
          the page: "some of these belong to people like you" only lands while
          somebody is still looking at them, and an owner who has to scroll
          past the whole renter journey to find this never finds it. Clearly
          addressed to somebody else, so a customer can see at a glance it is
          not aimed at them and read on. */}
      <section className="relative overflow-hidden bg-night text-paper">
        <div className="absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/showcase/road.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
          <div className="photo-scrim-start absolute inset-0" />
        </div>

        <Container className="relative py-28 sm:py-36">
          <div className="reveal max-w-xl">
            <Eyebrow className="text-amber">Own a car?</Eyebrow>
            <h2 className="t-title font-display mt-3">
              Your car earns nothing sitting outside.
            </h2>
            <p className="t-body mt-6 max-w-lg text-paper/75">
              Tell us the dates it is free. We put it on this website, find the customer,
              handle the agreement and the handover, and send you your share after the car
              is back. You keep the car and the keys the rest of the time.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              {/* The verb, not the topic. It still lands on the pitch page
                  rather than the form, because somebody who has not read it
                  yet converts worse at a signup box than at an explanation. */}
              <PressLink
                href="/rent-your-car"
                className="inline-flex items-center justify-center rounded-full bg-action-invert px-6 py-3 text-sm font-semibold text-night hover:bg-action-invert-deep"
              >
                List your car
              </PressLink>
              <PressLink
                href="/lender"
                className="edge-light inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold text-paper hover:bg-paper/10"
              >
                I already have an account
              </PressLink>
            </div>
          </div>

          <ul className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: HandCoins,
                title: "You set the dates",
                body: "Only the days you choose. Pause the listing any time nothing is booked on it.",
              },
              {
                icon: Wallet,
                title: "We handle the money",
                body: "The customer pays us. We take our commission and send you the rest once the car is back.",
              },
              {
                icon: ShieldCheck,
                title: "Nobody sees your details",
                body: "Not your name, not your number, not the registration. To a customer it is simply a car from Musafir.",
              },
            ].map((item, index) => (
              <li key={item.title} className={cn("max-w-xs", revealAt(index))}>
                <item.icon className="size-5 text-amber" aria-hidden />
                <h3 className="font-display mt-3.5 text-lg font-semibold tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/65">{item.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ── What is in the rate, and what is not ───────────────────────────
          Both, side by side, because a page that only lists the inclusions is
          the page people stop trusting. */}
      <section className="bg-paper py-24 sm:py-32">
        <Container className="grid gap-14 lg:grid-cols-2">
          <div className="reveal">
            <Eyebrow>What the rate covers</Eyebrow>
            <h2 className="t-headline font-display mt-3">In the price</h2>
            <ul className="mt-6 space-y-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              {[
                "The car, for a full 24-hour day from the time you take it.",
                "A driver, on a chauffeur-driven booking, their time is in the rate.",
                "A written kilometre allowance for each day of the booking.",
                "A car handed to you clean, serviced, and with a full tank.",
              ].map((item) => (
                <li key={item} className="flex gap-3.5">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-action" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal reveal-2">
            <Eyebrow>What it does not</Eyebrow>
            <h2 className="t-headline font-display mt-3">Charged separately</h2>
            <ul className="mt-6 space-y-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              {[
                "Fuel. The car goes out full and comes back full, whatever you use is yours.",
                "Kilometres past the daily allowance, at the per-kilometre rate agreed up front.",
                "Tolls, parking, and any challan issued while the car is with you.",
                "A refundable security deposit, returned when the car comes back as it left.",
              ].map((item) => (
                <li key={item} className="flex gap-3.5">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-line" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <PressLink
              href="/policies"
              className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-ink"
            >
              Read the full terms
              <ArrowRight className="lean size-4" aria-hidden />
            </PressLink>
          </div>
        </Container>
      </section>

      {/* The same dark as the footer directly beneath it, so the page ends in
          one block rather than in two nearly identical darks meeting in the
          middle, which reads as a rendering fault rather than as two
          sections. */}
      <section className="bg-night py-20 text-paper sm:py-24">
        <Container className="flex flex-wrap items-end justify-between gap-8">
          <div className="reveal">
            <h2 className="t-title font-display max-w-[14ch]">Need a car this week?</h2>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-paper/65">
              Send us the dates. We will tell you what is free and what it costs, and
              nothing is held until you say yes.
            </p>
          </div>
          <div className="reveal reveal-2 flex flex-wrap gap-3">
            <PressLink
              href="/book"
              className="inline-flex items-center justify-center rounded-full bg-action-invert px-7 py-3.5 text-sm font-semibold text-night hover:bg-action-invert-deep"
            >
              Book a car
            </PressLink>
            <PressLink
              href="/contact"
              className="edge-light inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3.5 text-sm font-semibold text-paper hover:bg-paper/10"
            >
              <PhoneCall className="size-4" aria-hidden />
              Talk to us
            </PressLink>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;
