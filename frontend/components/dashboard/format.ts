import type { Locale } from "@/i18n/config";

export function createFormatters(locale: Locale, currency: string | null) {
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const validCurrency = currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
  const money = validCurrency
    ? new Intl.NumberFormat(locale, { style: "currency", currency: validCurrency, maximumFractionDigits: 0 })
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  return {
    number: (value: number) => number.format(value),
    percent: (value: number) => percent.format(value),
    money: (value: number) => money.format(value),
    ratio: (value: number) => `${value.toFixed(2)}×`,
  };
}

export type Formatters = ReturnType<typeof createFormatters>;

/** Relative change vs the previous period, or null when there is nothing to compare with. */
export function change(value: number | null, previous: number | null) {
  if (value === null || previous === null || previous === 0) return null;
  return (value - previous) / previous;
}
