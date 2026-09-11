import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";

import { Button, Container, Eyebrow } from "@/components/ui";
import { telHref, whatsappLink } from "@/lib/config";
import { getContact } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact",
  description: "Call, WhatsApp or email Musafir Rent A Car in Lahore.",
};

const ContactPage = async () => {
  const contact = await getContact();

  return (
  <>
    <section className="border-b border-line bg-paper-deep">
      <Container className="py-14 sm:py-16">
        <Eyebrow>Contact</Eyebrow>
        <h1 className="font-display mt-3 text-4xl font-semibold sm:text-5xl">
          Talk to a person
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          A booking usually takes two minutes on the phone. If you would rather
          send the details and let us come back to you, the booking page does
          that instead.
        </p>
      </Container>
    </section>

    <Container className="py-14">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {contact.phone ? (
        <a
          href={telHref(contact.phone)}
          className="group rounded-2xl border border-line bg-card p-6 transition-colors duration-150 hover:border-forest/30"
        >
          <Phone className="size-5 text-brass" aria-hidden />
          <h2 className="font-display mt-3 text-xl font-semibold">Call us</h2>
          <p className="mt-1 text-sm text-muted">Fastest, and you get an answer straight away.</p>
          <p className="mt-3 font-semibold text-forest tnum">{contact.phone}</p>
        </a>
        ) : null}

        {contact.whatsapp ? (
        <a
          href={whatsappLink(contact.whatsapp, "Assalam o alaikum, I would like to book a car.")}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border border-line bg-card p-6 transition-colors duration-150 hover:border-forest/30"
        >
          <MessageCircle className="size-5 text-brass" aria-hidden />
          <h2 className="font-display mt-3 text-xl font-semibold">WhatsApp</h2>
          <p className="mt-1 text-sm text-muted">
            Send your dates and we will reply with what is free.
          </p>
          <p className="mt-3 font-semibold text-forest">Message us</p>
        </a>
        ) : null}

        {contact.email ? (
        <a
          href={`mailto:${contact.email}`}
          className="group rounded-2xl border border-line bg-card p-6 transition-colors duration-150 hover:border-forest/30"
        >
          <Mail className="size-5 text-brass" aria-hidden />
          <h2 className="font-display mt-3 text-xl font-semibold">Email</h2>
          <p className="mt-1 text-sm text-muted">For corporate accounts and longer bookings.</p>
          <p className="mt-3 break-all font-semibold text-forest">{contact.email}</p>
        </a>
        ) : null}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-line bg-paper-deep p-6">
        {contact.address ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <MapPin className="size-4 text-brass" aria-hidden />
            {contact.address}
          </p>
        ) : (
          <span />
        )}
        <Button href="/book">Send your dates instead</Button>
      </div>
    </Container>
  </>
  );
};

export default ContactPage;
