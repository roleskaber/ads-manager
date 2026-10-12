import { Bell, CircleHelp } from "lucide-react";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import type { Locale } from "@/i18n/config";
import type { DashboardDictionary } from "./types";

type TopbarProps = { locale: Locale; t: DashboardDictionary; dateLabel: string; greeting: string };

export function Topbar({ locale, t, dateLabel, greeting }: TopbarProps) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      <div>
        <p className="text-xs text-slate-400">{dateLabel}</p>
        <h1 className="mt-0.5 text-lg font-semibold tracking-tight">{greeting}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button aria-label={t.notifications} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
        </button>
        <button className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex">
          <CircleHelp size={16} />
          {t.help}
        </button>
        <div className="hidden sm:block">
          <LocaleSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
