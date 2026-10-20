import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((module) => module.en),
  ru: () => import("./dictionaries/ru").then((module) => module.ru),
};

export function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}
