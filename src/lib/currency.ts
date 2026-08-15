/**
 * Currency formatting utilities for the Lingua platform.
 * All user-facing prices must be in INR.
 */

export function formatINR(amount: number): string {
  const safeAmount = Number(amount) || 0;
  const formatted = safeAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `₹${formatted}`;
}

export function formatINRWithDecimals(amount: number, decimals = 2): string {
  const safeAmount = Number(amount) || 0;
  const formatted = safeAmount.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `₹${formatted}`;
}

export function getCurrencySymbol(currency: string = "INR"): string {
  return currency === "INR" ? "₹" : "₹";
}
