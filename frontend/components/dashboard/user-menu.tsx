"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import type { Locale } from "@/i18n/config";
import type { DashboardUser } from "./types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type UserMenuProps = { locale: Locale; user: DashboardUser; roleLabel: string; signOutLabel: string };

export function UserMenu({ locale, user, roleLabel, signOutLabel }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
        {initials(user.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{user.name}</p>
        <p className="truncate text-[11px] text-slate-400">{roleLabel} · {user.email}</p>
      </div>
      <button
        onClick={() => signOut({ redirectTo: `/${locale}/login` })}
        aria-label={signOutLabel}
        title={signOutLabel}
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
