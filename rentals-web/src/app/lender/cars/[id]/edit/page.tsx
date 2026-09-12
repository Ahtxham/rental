import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LenderCarForm, type EditableCar } from "@/components/lender-car-form";
import { lenderFetch } from "@/lib/lender-api";

export const metadata: Metadata = {
  title: "Edit your car",
  robots: { index: false, follow: false },
};

/**
 * One of the owner's own cars, open for editing.
 *
 * The car is found in their own garage rather than fetched by id, which means
 * the "is this yours" question is answered by the same query that gets the
 * data instead of by a check somebody could forget to write. A lender who
 * types another lender's id gets a 404, the same as a lender who types
 * nonsense, which is also the only thing they should be able to tell apart.
 */
const EditCarPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const cars = await lenderFetch("/cars");
  if (cars.status === 401) redirect("/lender/login");

  const car = ((cars.body as { data?: EditableCar[] }).data ?? []).find((row) => row._id === id);
  if (!car) notFound();

  return <LenderCarForm car={car} />;
};

export default EditCarPage;
