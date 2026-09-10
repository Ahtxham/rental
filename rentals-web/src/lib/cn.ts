import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind conflicts resolve by stylesheet order, not attribute order. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
