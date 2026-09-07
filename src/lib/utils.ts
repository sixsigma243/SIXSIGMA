import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CurrencyCode } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: CurrencyCode = "USD"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // CDF formatting
  return `${new Intl.NumberFormat("fr-CD", {
    maximumFractionDigits: 0,
  }).format(amount)} CDF`;
}

export function formatUSD(amount: number): string {
  return formatCurrency(amount, "USD");
}

export function formatCDF(amount: number): string {
  return formatCurrency(amount, "CDF");
}

export function convertUsdToCdf(amountUsd: number, rate = 2850): number {
  return amountUsd * rate;
}

export function convertCdfToUsd(amountCdf: number, rate = 2850): number {
  return amountCdf / rate;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
