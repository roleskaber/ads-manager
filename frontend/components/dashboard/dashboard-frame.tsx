import type { ReactNode } from "react";
import { Toaster } from "sonner";
import type { Locale } from "@/i18n/config";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { DashboardDictionary } from "./types";

type DashboardFrameProps = {
  locale: Locale;
  t: DashboardDictionary;
  companySlot: ReactNode;
  userSlot: ReactNode;
  greetingSlot: ReactNode;
  children: ReactNode;
};

export function DashboardFrame({ locale, t, companySlot, userSlot, greetingSlot, children }: DashboardFrameProps) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <Sidebar locale={locale} t={t} companySlot={companySlot} userSlot={userSlot} />
      <main className="lg:pl-64">
        <Topbar locale={locale} t={t} greetingSlot={greetingSlot} />
        <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">{children}</div>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
