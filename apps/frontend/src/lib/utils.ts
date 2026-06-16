import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * className 値を clsx と tailwind-merge で結合します。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
