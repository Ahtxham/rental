import type { Metadata } from "next";

import { DriverManager } from "@/components/admin/driver-manager";
import { adminList } from "@/lib/admin-api";
import type { AdminDriver } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Drivers" };

const AdminDriversPage = async () => {
  const drivers = await adminList<AdminDriver>("/api/drivers");
  return <DriverManager drivers={drivers} />;
};

export default AdminDriversPage;
