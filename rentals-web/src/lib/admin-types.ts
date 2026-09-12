import type { ListingOffer, ListingStatus } from "@/lib/listing";

/**
 * The shapes the office screens read back from the API.
 *
 * Hand-written rather than shared with the backend: this website is deployed
 * on its own and a type imported across that boundary is a type that silently
 * stops matching. These describe what the admin endpoints actually return, and
 * only the fields these screens use.
 */
export type RentalStatus = "enquiry" | "confirmed" | "out" | "returned" | "cancelled";

export interface AdminCarRef {
  _id: string;
  registrationNumber?: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  currentOdometer?: number;
  photos?: string[];
}

export interface AdminRental {
  _id: string;
  status: RentalStatus;
  car?: AdminCarRef | string | null;
  listedCar?: AdminCarRef | string | null;
  driver?: { _id: string; fullName: string; phone?: string } | string | null;
  withDriver: boolean;
  customer: {
    fullName: string;
    phone: string;
    whatsapp?: string;
    cnic?: string;
    address?: string;
  };
  startAt: string;
  endAt: string;
  days: number;
  dailyRate: number;
  kmIncludedPerDay?: number;
  extraKmRate?: number;
  driverAllowance: number;
  deliveryCharge: number;
  discount: number;
  otherCharges: number;
  otherChargesNote?: string;
  distanceKm?: number;
  extraKm: number;
  extraKmAmount: number;
  rentAmount: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  securityDeposit: number;
  depositRefunded: number;
  commissionPercent?: number;
  commissionAmount: number;
  ownerPayout: number;
  ownerPaidAt?: string;
  ownerPaymentRef?: string;
  handover?: { at: string; odometer: number; fuelEighths?: number | null; note?: string };
  returned?: { at: string; odometer: number; fuelEighths?: number | null; note?: string };
  notes?: string;
  cancelReason?: string;
  createdAt: string;
}

export interface AdminCar {
  _id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  photos: string[];
  fuelType: string;
  transmission?: "manual" | "automatic";
  seats: number;
  features: string[];
  currentOdometer: number;
  status: "active" | "maintenance" | "inactive";
  listed: boolean;
  withDriverRate?: number;
  selfDriveRate?: number;
  kmIncludedPerDay?: number;
  extraKmRate?: number;
  description?: string;
  /** Only present when the list was asked about dates. */
  available?: boolean;
  heldUntil?: string | null;
}

export interface AdminDriver {
  _id: string;
  fullName: string;
  phone: string;
  whatsapp?: string;
  cnic?: string;
  licenceNumber?: string;
  licenceExpiry?: string;
  address?: string;
  note?: string;
  status: "active" | "inactive";
}

export interface AdminLender {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  status: "pending" | "active" | "suspended";
  createdAt: string;
}

export interface AdminListing {
  _id: string;
  lender: AdminLender | string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  seats: number;
  fuelType: string;
  transmission?: "manual" | "automatic";
  registrationNumber: string;
  photos: string[];
  description?: string;
  expectedDailyRate?: number;
  publicDailyRate?: number;
  kmIncludedPerDay?: number;
  extraKmRate?: number;
  driverBy: "fleet" | "owner";
  availability: Array<{ from: string; to: string }>;
  status: ListingStatus;
  /** Agreed for this car specifically. Undefined means the house default. */
  commissionPercent?: number;
  /** The terms last put to the owner, and their answer if they have given one. */
  offer?: ListingOffer;
  reviewNote?: string;
  createdAt: string;
}

export interface AdminPayout {
  _id: string;
  listedCar: (AdminCarRef & { lender?: AdminLender }) | string;
  startAt: string;
  endAt: string;
  days: number;
  rentAmount: number;
  extraKmAmount: number;
  commissionPercent?: number;
  commissionAmount: number;
  ownerPayout: number;
  ownerPaidAt?: string;
  ownerPaymentRef?: string;
  customer: { fullName: string };
}

/** Populated refs come back as objects; unpopulated ones as bare ids. */
export const asObject = <T extends { _id: string }>(value: T | string | null | undefined): T | null =>
  value && typeof value === "object" ? value : null;

export const carLabel = (car: AdminCarRef | string | null | undefined): string => {
  const object = asObject(car as AdminCarRef | string | null);
  if (!object) return "-";
  return [object.make, object.model].filter(Boolean).join(" ");
};

export const STATUS_LABEL: Record<RentalStatus, string> = {
  enquiry: "Enquiry",
  confirmed: "Confirmed",
  out: "Out",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<RentalStatus, "neutral" | "good" | "warn"> = {
  // An enquiry holds nothing, so it gets the quietest chip there is. It used
  // to have a colour of its own; the palette no longer has one to give it, and
  // the word "Enquiry" is written on the chip either way.
  enquiry: "neutral",
  confirmed: "good",
  out: "warn",
  returned: "neutral",
  cancelled: "neutral",
};
