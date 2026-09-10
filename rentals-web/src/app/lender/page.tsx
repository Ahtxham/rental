import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { LenderEarning, LenderTotals } from "@/components/lender-earnings";
import { LenderDashboard, type LenderCar, type LenderUser } from "@/components/lender-dashboard";
import { lenderFetch } from "@/lib/lender-api";

export const metadata: Metadata = {
  title: "Your cars",
  robots: { index: false, follow: false },
};

/**
 * Rendered on the server, from the session cookie.
 *
 * The dashboard never fetches its own data on the client, so there is no
 * moment where a signed-out visitor sees an empty garage and wonders where
 * their cars went, a 401 here is a redirect before anything renders.
 */
const LenderHome = async () => {
  const [me, cars, earnings] = await Promise.all([
    lenderFetch("/me"),
    lenderFetch("/cars"),
    lenderFetch("/earnings"),
  ]);
  if (me.status === 401 || cars.status === 401) redirect("/lender/login");

  const user = (me.body as { data?: { user?: LenderUser } }).data?.user;
  if (!user) redirect("/lender/login");

  return (
    <LenderDashboard
      user={user}
      cars={((cars.body as { data?: LenderCar[] }).data ?? []).map((car) => ({
        ...car,
        availability: car.availability ?? [],
        photos: car.photos ?? [],
      }))}
      earnings={(earnings.body as { data?: LenderEarning[] }).data ?? []}
      totals={
        (earnings.body as { totals?: LenderTotals }).totals ?? { earned: 0, paid: 0, due: 0 }
      }
    />
  );
};

export default LenderHome;
