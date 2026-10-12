import type { ReactNode } from "react";
import { Toaster } from "sonner";
import type { Locale } from "@/i18n/config";
import { interpolate } from "@/i18n/interpolate";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { DashboardDictionary, DashboardUser } from "./types";

type DashboardFrameProps = {
  locale: Locale;
  t: DashboardDictionary;
  user: DashboardUser;
  dateLabel: string;
  children: ReactNode;
};

export function DashboardFrame({ locale, t, user, dateLabel, children }: DashboardFrameProps) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <Sidebar locale={locale} user={user} t={t} />
      <main className="lg:pl-64">
        <Topbar locale={locale} t={t} dateLabel={dateLabel} greeting={interpolate(t.welcome, { name: user.name.split(" ")[0] })} />
        <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">{children}</div>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
