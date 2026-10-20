"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { periodOptions, type PeriodOption } from "@/lib/period";
import type { DashboardDictionary } from "./types";

type PeriodSelectProps = { t: Pick<DashboardDictionary, "period" | "periods">; value?: PeriodOption };

export function PeriodSelect({ t, value }: PeriodSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = value ?? (periodOptions.includes(searchParams.get("period") as PeriodOption) ? (searchParams.get("period") as PeriodOption) : "30d");

  return (
    <select
      value={current}
      aria-label={t.period}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams);
        params.set("period", event.target.value);
        router.push(`${pathname}?${params}`);
      }}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
    >
      {periodOptions.map((option) => <option key={option} value={option}>{t.periods[option]}</option>)}
    </select>
  );
}

export function PeriodSelectFallback({ t }: Pick<PeriodSelectProps, "t">) {
  return (
    <select disabled aria-label={t.period} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400">
      <option>{t.periods["30d"]}</option>
    </select>
  );
}
