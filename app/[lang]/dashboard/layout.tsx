import { format } from "date-fns";
import { Suspense } from "react";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import type { DashboardDictionary } from "@/components/dashboard/types";
import type { Locale } from "@/i18n/config";
import { dateLocales } from "@/i18n/date-locale";
import { resolveLocale } from "@/i18n/route-params";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function DashboardLayout({ children, params }: LayoutProps<"/[lang]/dashboard">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardShell locale={locale} t={dict.dashboard}>{children}</DashboardShell>
    </Suspense>
  );
}

type DashboardShellProps = { locale: Locale; t: DashboardDictionary; children: React.ReactNode };

async function DashboardShell({ locale, t, children }: DashboardShellProps) {
  const { name, email, companyName, role } = await getCurrentUser(locale);
  return (
    <DashboardFrame
      locale={locale}
      t={t}
      user={{ name, email, companyName, role }}
      dateLabel={format(new Date(), "EEEE, d MMMM yyyy", { locale: dateLocales[locale] })}
    >
      {children}
    </DashboardFrame>
  );
}
