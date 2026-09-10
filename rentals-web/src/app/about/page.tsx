import type { Metadata } from "next";

import { Button, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Musafir Rent A Car is a Lahore car rental built around one idea: quote the whole price once, write down what it covers, and photograph the car both ways.",
};

const AboutPage = () => (
  <>
    <section className="bg-forest text-paper">
      <Container className="py-16 sm:py-20">
        <Eyebrow className="text-brass-bright">About</Eyebrow>
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Renting a car should not feel like a negotiation.
        </h1>
      </Container>
    </section>

    <Container className="py-14 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="reveal space-y-5 text-base leading-relaxed text-ink-soft">
          <p>
            Most people in Lahore have rented a car the hard way: a price on the
            phone, a different one at the counter, a kilometre limit nobody
            mentioned, and an argument about a scratch that was already there.
            Musafir exists because none of that is difficult to fix. It is just
            rarely bothered with.
          </p>
          <p>
            So we quote the whole booking, not a daily rate you have to multiply.
            The kilometres are written on the agreement, and so is what each one
            past them costs. The odometer, the fuel gauge and the condition are
            photographed at handover with you standing there, and again when the
            car comes back. When there is nothing to argue about, nobody argues.
          </p>
          <p>
            Some of the cars are ours. Some belong to people in Lahore who lend
            them to us on the days they are not using them, which is how we can
            offer more than a small company usually could. Either way the car is
            checked before it is listed, the rate is one we set, and the
            agreement is with us, not with a stranger.
          </p>
          <p className="font-display text-2xl text-ink">
            The word musafir means traveller. It is the person we built this for,
            not the car.
          </p>
        </div>

        <aside className="reveal reveal-2 h-fit rounded-2xl border border-line bg-card p-6">
          <h2 className="font-display text-xl font-semibold">What we will not do</h2>
          <ul className="mt-4 space-y-4 text-sm leading-relaxed text-ink-soft">
            <li>
              <strong className="text-ink">Quote one price and charge another.</strong>{" "}
              The rate, the kilometre allowance and the overage are agreed before
              the car moves, and they are on the agreement you keep.
            </li>
            <li>
              <strong className="text-ink">Hand you a car we have not checked.</strong>{" "}
              Odometer, fuel and condition are photographed at handover with you
              there, and again when it comes back.
            </li>
            <li>
              <strong className="text-ink">Send a driver we do not know.</strong>{" "}
              Every driver on a Musafir booking is on our own roster, with a
              licence we have seen.
            </li>
            <li>
              <strong className="text-ink">Take money before we have confirmed it.</strong>{" "}
              A request from this website holds nothing. We call you, agree the
              car and the price, and only then does anything change hands.
            </li>
          </ul>
          <Button href="/book" className="mt-6 w-full">
            Book a car
          </Button>
        </aside>
      </div>
    </Container>
  </>
);

export default AboutPage;
