import { Suspense } from "react";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import {
  CompanyName,
  Greeting,
  GreetingSkeleton,
  SidebarUser,
  TextSkeleton,
  UserMenuSkeleton,
} from "@/components/dashboard/session-slots";
import { resolveLocale } from "@/i18n/route-params";

export default async function DashboardLayout({ children, params }: LayoutProps<"/[lang]/dashboard">) {
  const { locale, dict } = await resolveLocale(params);
  const t = dict.dashboard;

  return (
    <DashboardFrame
      locale={locale}
      t={t}
      companySlot={<Suspense fallback={<TextSkeleton className="h-2.5 w-20" />}><CompanyName /></Suspense>}
      userSlot={<Suspense fallback={<UserMenuSkeleton />}><SidebarUser locale={locale} t={t} /></Suspense>}
      greetingSlot={<Suspense fallback={<GreetingSkeleton />}><Greeting locale={locale} t={t} /></Suspense>}
    >
      {children}
    </DashboardFrame>
  );
}
