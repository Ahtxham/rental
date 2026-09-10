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

import { CarCard } from "@/components/car-card";
import { HeroTraffic } from "@/components/hero-traffic";
import { SearchForm } from "@/components/search-form";
import { Button, Container, Eyebrow, SectionHeading } from "@/components/ui";
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
 */

/**
 * Stagger classes by position in a row. Four is as deep as the stagger goes;
 * beyond that the last item is so far behind the first that the row stops
 * reading as one movement, so a fifth card simply joins the fourth.
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
    title: "Handed over clean and full",
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
  const featured = cars.slice(0, 3);
  // The honest version of "from ₨X": the cheapest thing actually on the page.
  const cheapest = cars.reduce<number | null>(
    (low, car) =>
      car.withDriverRate && (low === null || car.withDriverRate < low) ? car.withDriverRate : low,
    null,
  );

  return (
    <>
      {/* Hero. Dark, quiet, and led by the date form rather than a slogan,
          the slogan is above it because a page has to say what it is, but the
          form is what the page is for. */}
      <section className="relative overflow-hidden bg-forest text-paper">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #d2a244 0, transparent 45%), radial-gradient(circle at 85% 60%, #d2a244 0, transparent 40%)",
          }}
        />
        {/* Traffic, behind everything. The search form sits over it with a
            backdrop blur, so vehicles passing under it soften rather than
            fighting the thing the page is actually for. */}
        <HeroTraffic className="hero-parallax" />
        <Container className="relative py-16 sm:py-24">
          <Eyebrow className="intro intro-1 text-brass-bright">Lahore · By the day</Eyebrow>
          <h1 className="font-display intro intro-2 mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Rent a car for the days you need it, at a price you are quoted once.
          </h1>
          <p className="intro intro-3 mt-5 max-w-xl text-base leading-relaxed text-paper/75">
            {contact.selfDriveEnabled
              ? "Take one of our drivers with you, or take the keys and drive yourself. Either way you see the whole cost before anything is held."
              : "Every car goes out with one of our own drivers. You see the whole cost before anything is held."}
          </p>

          <Suspense fallback={<div className="intro intro-4 mt-8 h-40 rounded-2xl bg-paper/5" />}>
            <SearchForm className="intro intro-4 mt-8" selfDriveEnabled={contact.selfDriveEnabled} />
          </Suspense>

          <p className="intro intro-5 mt-4 text-sm text-paper/60">
            {cheapest
              ? `Cars from ${pkr(cheapest)} a day. Or call and we will sort it out in two minutes.`
              : "Or call us and we will sort it out on the phone in two minutes."}
          </p>

          {/* The supply side, above the fold and addressed to somebody else.
              A car owner who lands here is not going to scroll past four
              sections of renter copy to find out we want their car, and the
              whole lending business depends on them finding out. Kept to one
              line and set apart, so a customer can see at a glance it is not
              for them. */}
          <Link
            href="/rent-your-car"
            className="intro intro-5 mt-8 inline-flex items-center gap-2 rounded-full border border-brass-bright/40 bg-brass-bright/10 px-4 py-2 text-sm text-paper/85 transition-colors duration-150 hover:bg-brass-bright/20"
          >
            <KeyRound className="size-4 shrink-0 text-brass-bright" aria-hidden />
            <span>
              <strong className="font-semibold text-paper">Own a car?</strong> Earn from it
              on the days you are not using it
            </span>
            <ArrowRight className="size-4 shrink-0 text-brass-bright" aria-hidden />
          </Link>
        </Container>
      </section>

      {/* Four things we can each stand behind, rather than a wall of adjectives. */}
      <section className="border-b border-line bg-paper-deep">
        <Container className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((item, index) => (
            <div key={item.title} className={revealAt(index)}>
              <item.icon className="size-5 text-brass" aria-hidden />
              <h2 className="font-display mt-3 text-lg font-semibold text-ink">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* The cars, live. */}
      <section id="cars">
        <Container className="py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading className="reveal" eyebrow="The cars" title="What you can take out this week" />
            <Link
              href="/cars"
              className="text-sm font-semibold text-forest underline underline-offset-4"
            >
              See every car
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
              <CarFront className="mx-auto size-6 text-muted" aria-hidden />
              <p className="mt-3 text-sm text-muted">
                Our list is being updated. Call or WhatsApp us and we will tell you
                what is free.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((car, index) => (
                <CarCard key={car.id} car={car} className={revealAt(index)} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* The other half of the business, and the reason the list above is
          longer than a company this size could manage alone.
          
          Placed straight after the cars rather than at the foot of the page:
          "some of these belong to people like you" only lands while somebody
          is still looking at them, and an owner who has to scroll past the
          whole renter journey to find this never finds it. Clearly addressed
          to somebody else, so a customer can see at a glance it is not aimed
          at them and read on. */}
      <section className="border-y border-line bg-brass-wash/60">
        <Container className="py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="reveal">
              <Eyebrow>Own a car?</Eyebrow>
              <h2 className="font-display mt-2 max-w-xl text-3xl font-semibold sm:text-4xl">
                Your car earns nothing sitting outside. Lend it to us for the days
                you are not using it.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft">
                Tell us the dates it is free. We put it on this website, find the
                customer, handle the agreement and the handover, and send you your
                share after the car is back. You keep the car and the keys the rest
                of the time.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {/* The verb, not the topic. It still lands on the pitch page
                    rather than the form, because somebody who has not read it
                    yet converts worse at a signup box than at an explanation. */}
                <Button href="/rent-your-car" variant="brass">
                  List your car
                </Button>
                <Button href="/lender" variant="outline">
                  I already have an account
                </Button>
              </div>
            </div>

            <ul className="space-y-5">
              {[
                {
                  icon: HandCoins,
                  title: "You set the dates",
                  body: "Only the days you choose. Change your mind and pause the listing any time nothing is booked on it.",
                },
                {
                  icon: Wallet,
                  title: "We handle the money",
                  body: "The customer pays us. We take our commission and send you the rest once the car is back and the charges are final.",
                },
                {
                  icon: ShieldCheck,
                  title: "Nobody sees your details",
                  body: "Not your name, not your number, not the registration. To a customer it is simply a car from Musafir.",
                },
              ].map((item, index) => (
                <li key={item.title} className={cn("flex gap-4", revealAt(index))}>
                  <item.icon className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Three steps, numbered because they genuinely happen in this order. */}
      <section className="border-y border-line bg-card">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            className="reveal"
            eyebrow="How it works"
            title="Three steps, and one of them is us calling you back."
          />

          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.title} className={revealAt(index)}>
                <span className="font-display text-4xl font-semibold text-brass/40 tnum">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* What is in the rate, and what is not. Both, side by side, because a
          page that only lists the inclusions is the page people stop trusting. */}
      <section>
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="reveal">
              <Eyebrow>What the rate covers</Eyebrow>
              <h2 className="font-display mt-2 text-3xl font-semibold">In the price</h2>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
                {[
                  "The car, for a full 24-hour day from the time you take it.",
                  "A driver, on a chauffeur-driven booking, their time is in the rate.",
                  "A written kilometre allowance for each day of the booking.",
                  "A car handed to you clean, serviced, and with a full tank.",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="reveal reveal-2">
              <Eyebrow>What it does not</Eyebrow>
              <h2 className="font-display mt-2 text-3xl font-semibold">Charged separately</h2>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
                {[
                  "Fuel. The car goes out full and comes back full, whatever you use is yours.",
                  "Kilometres past the daily allowance, at the per-kilometre rate agreed up front.",
                  "Tolls, parking, and any challan issued while the car is with you.",
                  "A refundable security deposit, returned when the car comes back as it left.",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-line" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/policies"
                className="mt-5 inline-block text-sm font-semibold text-forest underline underline-offset-4"
              >
                Read the full terms
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-forest text-paper">
        <Container className="flex flex-wrap items-center justify-between gap-6 py-14">
          <div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Need a car this week?
            </h2>
            <p className="mt-2 max-w-md text-sm text-paper/70">
              Send us the dates. We will tell you what is free and what it costs,
              and nothing is held until you say yes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/book" variant="brass">
              Book a car
            </Button>
            <Button
              href="/contact"
              variant="outline"
              className="border-paper/30 text-paper hover:bg-paper/10"
            >
              <PhoneCall className="size-4" aria-hidden />
              Talk to us
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;
