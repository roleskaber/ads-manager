export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookie = "NEXT_LOCALE";

export const localeLabels: Record<Locale, string> = { en: "EN", ru: "RU" };

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
