"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { performanceSeries } from "./data";
import { Panel } from "./panel";
import type { DashboardDictionary } from "./types";

export function PerformanceChart({ t }: { t: DashboardDictionary["performance"] }) {
  const [period, setPeriod] = useState(t.periods[0]);

  return (
    <Panel
      title={t.title}
      description={t.description}
      className="p-5"
      actions={
        <div className="flex items-center gap-2">
          <button aria-label={t.settings} className="hidden rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 sm:block">
            <SlidersHorizontal size={15} />
          </button>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label={t.period}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none"
          >
            {t.periods.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
      }
    >
      <div className="mt-8 flex h-56 items-end gap-2 border-b border-l border-slate-100 px-3 pt-5 sm:gap-4">
        {performanceSeries.map((point, index) => (
          <div key={index} className="group relative flex h-full flex-1 items-end">
            <div style={{ height: `${point.value}%` }} className="w-full rounded-t-md bg-blue-500/80 transition group-hover:bg-blue-600" />
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">{point.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-9 flex gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-blue-500" />{t.conversions}</span>
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-slate-200" />{t.spend}</span>
        <span className="ml-auto text-slate-400">{period}</span>
      </div>
    </Panel>
  );
}
