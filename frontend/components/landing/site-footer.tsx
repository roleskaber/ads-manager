import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";

type SiteFooterProps = { locale: Locale; t: Dictionary["landing"]["footer"] };

export function SiteFooter({ locale, t }: SiteFooterProps) {
  return (
    <footer className="border-t border-line">
      <Container className="grid gap-12 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo href={`/${locale}`} />
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">{t.tagline}</p>
          <a href={`mailto:${siteConfig.contactEmail}`} className="mt-4 inline-block font-mono text-sm text-ink hover:text-accent">
            {siteConfig.contactEmail}
          </a>
        </div>
        {t.columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-ink">{column.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              {column.links.map((link) => (
                <li key={link}><a href="#" className="hover:text-ink">{link}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="flex flex-col gap-4 border-t border-line py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 {siteConfig.name}. {t.rights}</p>
        <LocaleSwitcher locale={locale} className="w-fit border-line bg-transparent" />
      </Container>
    </footer>
  );
}
