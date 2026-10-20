"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/ui/logo";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { manageNav, type NavItem, workspaceNav } from "./data";
import type { DashboardDictionary } from "./types";

type SidebarProps = {
  locale: Locale;
  t: DashboardDictionary;
  /** User-dependent parts are passed in as slots so the sidebar itself stays in the static shell. */
  companySlot: ReactNode;
  userSlot: ReactNode;
};

export function Sidebar({ locale, t, companySlot, userSlot }: SidebarProps) {
  const basePath = `/${locale}/dashboard`;

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
        <LogoMark className="h-9 w-9 text-slate-950" />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">ads manager</p>
          <p className="truncate text-[11px] text-slate-400">{t.workspace} / {companySlot}</p>
        </div>
      </div>
      <div className="flex-1 px-3 py-6">
        <NavSection title={t.sections.workspace} items={workspaceNav} basePath={basePath} t={t} />
        <NavSection title={t.sections.manage} items={manageNav} basePath={basePath} t={t} className="mt-9" />
      </div>
      <div className="border-t border-slate-100 p-4">
        {userSlot}
      </div>
    </aside>
  );
}

type NavSectionProps = { title: string; items: NavItem[]; basePath: string; t: DashboardDictionary; className?: string };

function NavSection({ title, items, basePath, t, className }: NavSectionProps) {
  const pathname = usePathname();
  const itemClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition";

  return (
    <div className={className}>
      <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <nav className="space-y-1">
        {items.map(({ key, icon: Icon, path, badge }) => {
          const content = (
            <>
              <Icon size={17} strokeWidth={1.8} />
              {t.nav[key]}
              {badge && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{badge}</span>}
            </>
          );

          if (path === undefined) {
            return (
              <span key={key} title={t.soon} aria-disabled className={cn(itemClass, "cursor-default text-slate-400")}>
                {content}
              </span>
            );
          }

          const href = `${basePath}${path}`;
          const isActive = pathname === href;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(itemClass, isActive ? "bg-slate-950 font-medium text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
