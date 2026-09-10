import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingDetail } from "@/components/admin/booking-detail";
import { adminFetch, adminList } from "@/lib/admin-api";
import type { AdminCar, AdminDriver, AdminRental } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Booking" };

const BookingPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  // The cars and the roster are needed to price a booking, so they come with
  // it rather than after, a select that populates a beat late is a select
  // somebody has already clicked past.
  const [rental, cars, drivers, me] = await Promise.all([
    adminFetch(`/api/rentals/${id}`),
    adminList<AdminCar>("/api/cars"),
    adminList<AdminDriver>("/api/drivers?status=active"),
    adminFetch("/api/auth/me"),
  ]);

  const data = (rental.body as { data?: AdminRental }).data;
  if (rental.status === 404 || !data) notFound();

  const currency =
    (me.body as { agency?: { settings?: { currency?: string } } }).agency?.settings?.currency ??
    "PKR";

  return <BookingDetail rental={data} cars={cars} drivers={drivers} currency={currency} />;
};

export default BookingPage;
