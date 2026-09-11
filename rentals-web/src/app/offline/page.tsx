import { PhoneCall, WifiOff } from "lucide-react";
import type { Metadata } from "next";

import { Button, Container } from "@/components/ui";
import { telHref } from "@/lib/config";
import { getContact } from "@/lib/site";

export const metadata: Metadata = {
  title: "No connection",
  robots: { index: false, follow: false },
};

/**
 * What the service worker serves when the network is gone.
 *
 * It carries the phone number, because the whole point of a rental company is
 * reachable by a call and a customer standing in a basement car park with no
 * signal is exactly who needs it.
 */
const OfflinePage = async () => {
  const contact = await getContact();

  return (
  <Container className="py-24">
    <div className="mx-auto max-w-md text-center">
      <WifiOff className="mx-auto size-8 text-muted" aria-hidden />
      <h1 className="font-display mt-4 text-3xl font-semibold">You are offline</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        The pages you have already visited will still open. Anything new needs a
        connection.
      </p>
      {contact.phone ? (
        <Button href={telHref(contact.phone)} className="mt-6">
          <PhoneCall className="size-4" aria-hidden />
          {contact.phone}
        </Button>
      ) : null}
    </div>
  </Container>
  );
};

export default OfflinePage;
