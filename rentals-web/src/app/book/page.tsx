import type { Metadata } from "next";

import { BookingFlow } from "@/components/booking-flow";
import { getContact } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a car",
  description:
    "Send Musafir your dates and we will come back with the cars that are free and a price for the whole booking.",
};

const BookPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; car?: string; drive?: string }>;
}) => {
  const [params, contact] = await Promise.all([searchParams, getContact()]);

  return (
    <BookingFlow
      initialFrom={params.from}
      initialTo={params.to}
      initialCarId={params.car}
      initialSelfDrive={params.drive === "self"}
      selfDriveEnabled={contact.selfDriveEnabled}
    />
  );
};

export default BookPage;
