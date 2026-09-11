import { BadgeCheck, CalendarRange, Car, HandCoins, ShieldCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";

import Link from "next/link";

import { LenderAuthForm } from "@/components/lender-auth-form";
import { Button, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  alternates: { canonical: "/rent-your-car" },
  title: "Rent your car when it is free",
  description:
    "Your car sits idle most of the week. List it with Musafir, pick the dates it is free, and earn from it, with our drivers, our customers and our paperwork.",
};

const STEPS = [
  {
    icon: Car,
    title: "Tell us about the car",
    body: "Make, model, year, a few photos. Two minutes, and you can add more photos later.",
  },
  {
    icon: CalendarRange,
    title: "Say when it is free",
    body: "Only the dates you choose. Your car never appears to a customer on a day you have not offered, and you can change the dates whenever you like without re-applying.",
  },
  {
    icon: BadgeCheck,
    title: "We check it, then list it",
    body: "Somebody from the office looks at every car before it goes on the site, and agrees a rate with you.",
  },
  {
    icon: HandCoins,
    title: "It goes out, you get paid",
    body: "We handle the customer, the agreement, the handover and the return. Once the car is back and the charges are final, our commission comes off and the rest is sent to you.",
  },
];

/**
 * The money, spelled out.
 *
 * Deliberately its own section rather than a line in a list: "what do I
 * actually get" is the question every owner asks second, and a page that
 * dances around it is a page that reads like it has something to hide.
 */
const MONEY = [
  {
    title: "You are paid on the rent",
    body: "The customer pays us the whole booking. Our commission comes off the rent and any kilometres over the allowance; the rest is yours. A driver's allowance and a delivery charge are our costs and stay with us.",
  },
  {
    title: "The split is agreed before your car is listed",
    body: "It is written onto the booking the day we confirm it, so a change to our standard rate later never moves money you have already been promised.",
  },
  {
    title: "Paid after the car is back",
    body: "Not before, a late return adds days and the kilometres are not known until the odometer is read. Once it is settled we send the transfer and note the reference against the booking, where you can see it.",
  },
];

const REVEAL = ["reveal", "reveal reveal-2", "reveal reveal-3", "reveal reveal-4"] as const;

const RentYourCarPage = () => (
  <>
    <section className="bg-forest text-paper">
      <Container className="py-16 sm:py-20">
        <Eyebrow className="text-brass-bright">For car owners</Eyebrow>
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Your car is parked five days a week. It could be working three of them.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-paper/75">
          Musafir has the customers, the drivers and the paperwork already. Tell
          us the days your car is free, and we will put it to work on exactly
          those days, and not one more.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="#start" variant="brass">
            List your car
          </Button>
          <Button
            href="/lender/login"
            variant="outline"
            className="border-paper/30 text-paper hover:bg-paper/10"
          >
            I already have an account
          </Button>
        </div>
      </Container>
    </section>

    <Container className="py-16">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">Four steps</h2>
      <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className={REVEAL[Math.min(index, 3)]}>
            <span className="font-display text-4xl font-semibold text-brass/40 tnum">
              {String(index + 1).padStart(2, "0")}
            </span>
            <step.icon className="mt-3 size-5 text-brass" aria-hidden />
            <h3 className="font-display mt-2 text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
          </li>
        ))}
      </ol>
    </Container>

    <section className="border-y border-line bg-brass-wash/50">
      <Container className="py-16">
        <Eyebrow>The money</Eyebrow>
        <h2 className="font-display mt-2 max-w-2xl text-3xl font-semibold sm:text-4xl">
          What you get, and when
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {MONEY.map((item, index) => (
            <div key={item.title} className={REVEAL[Math.min(index, 3)]}>
              <h3 className="font-display text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>

    <section className="border-b border-line bg-card">
      <Container className="py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>What you keep control of</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold">It stays your car</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
              {[
                "You choose the dates. Take them all back whenever you want, the car simply stops appearing.",
                "You can pause or withdraw the listing at any time, without an explanation.",
                "Your name, your number and the registration number are never on the website. To a customer it is a silver Corolla, nothing more.",
                "We agree the rate with you before the car is listed, and it does not change without you.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            {/* Said here, plainly, rather than buried in terms nobody reads.
                The honest version is what keeps a car owner from finding out
                the hard way, and it is the question every serious owner asks
                first. */}
            <Eyebrow>Before you decide</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold">The part to check</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-soft">
              <p className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden />
                <span>
                  <strong className="text-ink">Insurance.</strong> A normal private
                  motor policy usually does not cover a car while it is rented out.
                  Ask your insurer, in writing, what your policy says about hire,
                  and talk to us before your car goes out for the first time. We
                  would rather lose a listing than have you find this out after a
                  crash.
                </span>
              </p>
              <p className="flex gap-3">
                <Wallet className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden />
                <span>
                  <strong className="text-ink">Wear and tear.</strong> A rented car
                  does the kilometres of a working car. The rate accounts for it,
                  but a car you are attached to is a car to think twice about.
                </span>
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>

    {/* The page ends in the actual form, not a link to it.
        Somebody who has read this far is convinced; making them click through
        and wait for a page is where a good share of them stop. */}
    <section id="start" className="bg-paper-deep">
      <Container className="py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
          <div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Ready to list it?
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">
              Signing up takes a minute and commits you to nothing. Your car only
              goes on the website once you and the office have agreed on it.
            </p>

            <ul className="mt-7 space-y-4 text-sm leading-relaxed text-ink-soft">
              {[
                "Make an account, then tell us about the car. Two minutes.",
                "Somebody from the office calls you to agree a rate.",
                "You set the dates it is free, and change them whenever you like.",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="font-display text-lg font-semibold text-brass/60 tnum">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <p className="mt-7 text-sm text-muted">
              Rather talk to somebody first?{" "}
              <Link
                href="/contact"
                className="font-semibold text-forest underline underline-offset-4"
              >
                Get in touch
              </Link>
              .
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-card p-6 sm:p-7">
            <LenderAuthForm initialMode="signup" embedded />
          </div>
        </div>
      </Container>
    </section>
  </>
);

export default RentYourCarPage;
