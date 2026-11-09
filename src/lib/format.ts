import type { Locale } from "./i18n";

export function aed(amount: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function date(d: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function dateTime(d: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function num(n: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE").format(n);
}
