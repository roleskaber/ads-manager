import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";

type CtaSectionProps = { locale: Locale; t: Dictionary["landing"]["cta"]; common: Dictionary["common"] };

export function CtaSection({ locale, t, common }: CtaSectionProps) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="rounded-2xl border border-line bg-white px-6 py-14 sm:px-14 sm:py-16">
          <h2 className="max-w-3xl text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[44px]">{t.title}</h2>
          <p className="mt-5 text-[17px] text-slate-600">{t.description}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={`mailto:${siteConfig.contactEmail}`} size="lg">
              {common.bookDemo} <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href={`/${locale}/register`} variant="secondary" size="lg" className="border-line">
              {common.createWorkspace}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
