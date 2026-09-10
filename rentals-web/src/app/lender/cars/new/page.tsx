import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LenderCarForm } from "@/components/lender-car-form";
import { getLenderToken } from "@/lib/lender-session";

export const metadata: Metadata = {
  title: "Add a car",
  robots: { index: false, follow: false },
};

const NewCarPage = async () => {
  if (!(await getLenderToken())) redirect("/lender/login");
  return <LenderCarForm />;
};

export default NewCarPage;
