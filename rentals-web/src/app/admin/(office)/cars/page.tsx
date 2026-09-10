import type { Metadata } from "next";

import { CarManager } from "@/components/admin/car-editor";
import { adminList } from "@/lib/admin-api";
import type { AdminCar } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Cars" };

const AdminCarsPage = async () => {
  const cars = await adminList<AdminCar>("/api/cars");
  return <CarManager cars={cars} />;
};

export default AdminCarsPage;
