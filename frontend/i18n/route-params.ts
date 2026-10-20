import "server-only";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { isLocale, type Locale } from "./config";
import { getDictionary } from "./get-dictionary";

function ensureLocale(value: string): Locale {
  if (!isLocale(value)) notFound();
  return value;
}

// Resolves `[lang]` from route params and loads its dictionary, or 404s for unknown locales.
export async function resolveLocale(params: Promise<{ lang: string }>) {
  const locale = ensureLocale((await params).lang);
  return { locale, dict: await getDictionary(locale) };
}

// Same as `resolveLocale`, but reads only the root `[lang]` param — safe on routes whose other params are runtime data.
export async function resolveRootLocale() {
  const locale = ensureLocale(await lang());
  return { locale, dict: await getDictionary(locale) };
}
