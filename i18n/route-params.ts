import "server-only";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import { getDictionary } from "./get-dictionary";

// Resolves `[lang]` from route params and loads its dictionary, or 404s for unknown locales.
export async function resolveLocale(params: Promise<{ lang: string }>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return { locale: lang as Locale, dict: await getDictionary(lang) };
}
