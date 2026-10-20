import { defaultLocale, isLocale, type Locale } from "./config";

// Picks the best supported locale from an Accept-Language header, e.g. "ru-RU,ru;q=0.9,en;q=0.8".
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, quality] = part.trim().split(";q=");
      return { language: tag.split("-")[0].toLowerCase(), quality: quality ? Number(quality) : 1 };
    })
    .sort((a, b) => b.quality - a.quality);

  return ranked.find(({ language }) => isLocale(language))?.language as Locale ?? defaultLocale;
}
