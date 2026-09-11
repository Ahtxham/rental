import { Camera, CarFront, CreditCard, KeyRound, PhoneCall, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbSchema, FaqSchema } from "@/components/structured-data";
import { Button, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { telHref } from "@/lib/config";
import { FAQ } from "@/lib/faq";
import { getContact } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/how-it-works" },
  title: "How it works",
  description:
    "What happens between asking Musafir for a car and handing the keys back, how a day is counted, what the deposit is for, and who pays for what.",
};

/**
 * The whole transaction, start to finish.
 *
 * A separate page from the terms on purpose. `/policies` is the document you
 * read when something has gone wrong; this is the one you read before deciding
 * to rent at all, and mixing the two produces a page that does neither job.
 */
const STAGES = [
  {
    icon: CarFront,
    title: "You send us dates",
    body: "From the booking page, on WhatsApp, or on the phone. If you have a car in mind, say so; if not, tell us what you need it for and we will suggest one.",
    note: "This holds nothing and costs nothing.",
  },
  {
    icon: PhoneCall,
    title: "We come back with a price",
    body: "The car, the daily rate, the kilometres each day includes, what a kilometre past that costs, and the deposit. One number for the whole booking, not a rate to multiply.",
    note: "Still nothing held.",
  },
  {
    icon: CreditCard,
    title: "You confirm, and the car is held",
    body: "Once you say yes, that car is off the board for your dates. We usually take an advance at this point; the balance is due at handover.",
    note: "This is the moment the booking becomes real.",
  },
  {
    icon: Camera,
    title: "Handover",
    body: "We meet, you check the car, and we photograph the odometer, the fuel gauge and any marks on the bodywork together. You sign the agreement and keep a copy of it.",
    note: "Five minutes, and it settles every argument that could follow.",
  },
  {
    icon: KeyRound,
    title: "The car is yours for the booking",
    body: "Drive it, or sit in the back and let our driver do it. Fuel is yours. If your plans change mid-booking, call us, extending is usually easy if nobody is waiting on the car.",
    note: null,
  },
  {
    icon: RotateCcw,
    title: "Return, and the final number",
    body: "We read the odometer with you, photograph it again, and settle: kilometres over the allowance, anything charged separately, and the deposit back.",
    note: "The car goes out full and should come back full.",
  },
];


const HowItWorksPage = async () => {
  const contact = await getContact();

  return (
    <>
      <FaqSchema faq={FAQ} />
      <BreadcrumbSchema
        trail={[
          { name: "Musafir Rent A Car", path: "/" },
          { name: "How it works", path: "/how-it-works" },
        ]}
      />
      <section className="border-b border-line bg-paper-deep">
        <Container className="py-14 sm:py-16">
          <Eyebrow>How it works</Eyebrow>
          <h1 className="font-display mt-3 max-w-2xl text-4xl font-semibold sm:text-5xl">
            From your dates to the keys, and back again
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            Six stages, and you can stop at any of the first three without owing
            anything. Nothing is held until you have seen the whole price and
            said yes to it.
          </p>
        </Container>
      </section>

      <Container className="py-14 sm:py-16">
        <ol className="space-y-10">
          {STAGES.map((stage, index) => (
            <li key={stage.title} className="reveal grid gap-5 sm:grid-cols-[auto_1fr]">
              <div className="flex items-start gap-4">
                <span className="font-display text-3xl font-semibold text-brass/40 tnum">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <stage.icon className="mt-1.5 size-5 shrink-0 text-brass" aria-hidden />
              </div>
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl font-semibold">{stage.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-ink-soft">{stage.body}</p>
                {stage.note ? (
                  <p className="mt-2 text-sm font-semibold text-forest">{stage.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Container>

      <section className="border-y border-line bg-card">
        <Container className="py-14 sm:py-16">
          <SectionHeading className="reveal" eyebrow="Questions" title="The ones we are asked most" />
          <dl className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q} className="reveal">
                <dt className="font-display text-lg font-semibold text-ink">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{item.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-sm text-muted">
            Anything we have not covered is in the{" "}
            <Link href="/policies" className="font-semibold text-forest underline underline-offset-4">
              full terms
            </Link>
            {contact.phone ? (
              <>
                , or you can just call{" "}
                <a href={telHref(contact.phone)} className="font-semibold text-forest tnum">
                  {contact.phone}
                </a>
              </>
            ) : (
              <>
                , or{" "}
                <Link href="/contact" className="font-semibold text-forest underline underline-offset-4">
                  get in touch
                </Link>
              </>
            )}
            .
          </p>
        </Container>
      </section>

      <Container className="flex flex-wrap items-center justify-between gap-6 py-14">
        <div>
          <h2 className="font-display text-3xl font-semibold">Ready when you are</h2>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Send your dates and we will come back with what is free and what it
            costs.
          </p>
        </div>
        <Button href="/book" variant="brass" size="lg">
          Book a car
        </Button>
      </Container>
    </>
  );
};

export default HowItWorksPage;
