import Link from "next/link";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";

type SiteHeaderProps = {
  locale: Locale;
  nav: Dictionary["landing"]["nav"];
  common: Dictionary["common"];
};

export function SiteHeader({ locale, nav, common }: SiteHeaderProps) {
  const links = [
    { href: "#product", label: nav.product },
    { href: "#how-it-works", label: nav.howItWorks },
    { href: "#integrations", label: nav.integrations },
    { href: "#faq", label: nav.faq },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo href={`/${locale}`} />
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-ink">{link.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LocaleSwitcher locale={locale} className="border-line bg-transparent" />
          </div>
          <Link href={`/${locale}/login`} className="hidden px-3 text-sm font-medium text-slate-700 hover:text-ink sm:block">
            {common.signIn}
          </Link>
          <ButtonLink href={`mailto:${siteConfig.contactEmail}`} size="sm">{common.bookDemo}</ButtonLink>
        </div>
      </Container>
    </header>
  );
}
