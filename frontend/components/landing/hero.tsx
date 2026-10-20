import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";
import { FunnelPreview } from "./funnel-preview";
import { Eyebrow } from "./section-heading";

type HeroProps = {
  locale: Locale;
  t: Dictionary["landing"]["hero"];
  funnel: Dictionary["landing"]["funnel"];
  common: Dictionary["common"];
};

export function Hero({ locale, t, funnel, common }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <Container className="relative grid gap-14 pb-20 pt-16 sm:pt-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pb-28">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-6 text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-6xl lg:text-[64px]">
            {t.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{t.subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={`mailto:${siteConfig.contactEmail}`} size="lg">
              {common.bookDemo} <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary" size="lg" className="border-line bg-transparent">
              {t.secondaryCta}
            </ButtonLink>
          </div>
          <p className="mt-6 font-mono text-xs text-slate-500">{t.note}</p>
        </div>
        <FunnelPreview locale={locale} t={funnel} />
      </Container>
    </section>
  );
}
