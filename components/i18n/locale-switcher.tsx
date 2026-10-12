"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

function swapLocale(pathname: string, locale: Locale) {
  const segments = pathname.split("/");
  segments[1] = locale;
  return segments.join("/") || `/${locale}`;
}

export function LocaleSwitcher({ locale, className }: { locale: Locale; className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium", className)}>
      {locales.map((option) => (
        <Link
          key={option}
          href={swapLocale(pathname, option)}
          hrefLang={option}
          aria-current={option === locale ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1 transition",
            option === locale ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-900",
          )}
        >
          {localeLabels[option]}
        </Link>
      ))}
    </div>
  );
}
