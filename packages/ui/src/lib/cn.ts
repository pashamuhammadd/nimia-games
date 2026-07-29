import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class lists safely — clsx handles conditional/array
 * inputs, tailwind-merge resolves conflicting utility classes (e.g.
 * "px-2 px-4" -> "px-4") so component `className` overrides always win.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
