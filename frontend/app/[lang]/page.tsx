import { CtaSection } from "@/components/landing/cta-section";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FunnelExplorer } from "@/components/landing/funnel-explorer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { IntegrationsStrip } from "@/components/landing/integrations-strip";
import { Outcomes } from "@/components/landing/outcomes";
import { Problem } from "@/components/landing/problem";
import { Security } from "@/components/landing/security";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { resolveLocale } from "@/i18n/route-params";

export default async function LandingPage({ params }: PageProps<"/[lang]">) {
  const { locale, dict } = await resolveLocale(params);
  const { landing, common } = dict;

  return (
    <div className="bg-paper text-ink">
      <SiteHeader locale={locale} nav={landing.nav} common={common} />
      <main>
        <Hero locale={locale} t={landing.hero} funnel={landing.funnel} common={common} />
        <IntegrationsStrip title={landing.sources.title} />
        <Problem t={landing.problem} />
        <HowItWorks t={landing.howItWorks} />
        <Features t={landing.features} />
        <FunnelExplorer locale={locale} t={landing.explorer} stages={landing.funnel.stages} />
        <Outcomes t={landing.outcomes} />
        <Security t={landing.security} />
        <Faq t={landing.faq} />
        <CtaSection locale={locale} t={landing.cta} common={common} />
      </main>
      <SiteFooter locale={locale} t={landing.footer} />
    </div>
  );
}
