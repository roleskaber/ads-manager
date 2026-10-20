import type { Metadata } from "next";
import { Suspense } from "react";
import { OverviewSkeleton, OverviewView } from "@/components/dashboard/overview-view";
import { PageHeader } from "@/components/dashboard/page-header";
import { PeriodSelect, PeriodSelectFallback } from "@/components/dashboard/period-select";
import type { DashboardDictionary } from "@/components/dashboard/types";
import type { Locale } from "@/i18n/config";
import { resolveLocale } from "@/i18n/route-params";
import { parsePeriodOption } from "@/lib/period";
import { getCurrentUser } from "@/server/auth/current-user";
import { overviewService } from "@/server/container";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard">): Promise<Metadata> {
  const { dict } = await resolveLocale(params);
  return { title: dict.dashboard.metaTitle };
}

export default async function DashboardPage({ params, searchParams }: PageProps<"/[lang]/dashboard">) {
  const { locale, dict } = await resolveLocale(params);
  const t = dict.dashboard;

  return (
    <>
      <PageHeader
        eyebrow={t.nav.overview}
        title={t.title}
        description={t.subtitle}
        actions={<Suspense fallback={<PeriodSelectFallback t={t} />}><PeriodSelect t={t} /></Suspense>}
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent locale={locale} t={t} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type OverviewContentProps = { locale: Locale; t: DashboardDictionary; searchParams: PageProps<"/[lang]/dashboard">["searchParams"] };

async function OverviewContent({ locale, t, searchParams }: OverviewContentProps) {
  const [user, query] = await Promise.all([getCurrentUser(locale), searchParams]);
  const overview = await overviewService.build(user.companyId, parsePeriodOption(query.period));
  return <OverviewView locale={locale} t={t} overview={overview} />;
}
