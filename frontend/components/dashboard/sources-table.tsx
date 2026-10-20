"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import { createFormatters } from "./format";
import { Panel } from "./panel";
import type { DashboardDictionary } from "./types";

export type SourceRow = {
  campaign: string | null;
  source: string;
  medium: string | null;
  channel: string;
  visitors: number;
  conversions: number;
  revenue: number;
};

type SourcesTableProps = {
  locale: Locale;
  currency: string | null;
  rows: SourceRow[];
  t: DashboardDictionary["sources"];
  channelLabels: DashboardDictionary["channels"];
  searchPlaceholder: string;
};

export function SourcesTable({ locale, currency, rows, t, channelLabels, searchPlaceholder }: SourcesTableProps) {
  const [query, setQuery] = useState("");
  const format = useMemo(() => createFormatters(locale, currency), [locale, currency]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.campaign, row.source, row.medium].some((value) => value?.toLowerCase().includes(needle)));
  }, [rows, query]);

  const columns = t.columns;

  return (
    <Panel
      title={t.title}
      description={t.description}
      className="mt-6"
      headerClassName="items-center border-b border-slate-100 p-5"
      actions={
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-44 bg-transparent outline-none placeholder:text-slate-400 sm:w-60"
          />
        </label>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">{columns.source}</th>
              <th className="px-5 py-3 font-medium">{columns.channel}</th>
              <th className="px-5 py-3 text-right font-medium">{columns.visitors}</th>
              <th className="px-5 py-3 text-right font-medium">{columns.conversions}</th>
              <th className="px-5 py-3 text-right font-medium">{columns.rate}</th>
              <th className="px-5 py-3 text-right font-medium">{columns.revenue}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((row) => (
              <tr key={`${row.channel}:${row.source}:${row.medium}:${row.campaign}`} className="hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-800">{row.campaign ?? <span className="text-slate-400">{t.noCampaign}</span>}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{[row.source, row.medium].filter(Boolean).join(" / ")}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">{channelLabels[row.channel as keyof typeof channelLabels] ?? row.channel}</td>
                <td className="px-5 py-4 text-right tabular-nums text-slate-600">{format.number(row.visitors)}</td>
                <td className="px-5 py-4 text-right tabular-nums text-slate-600">{format.number(row.conversions)}</td>
                <td className="px-5 py-4 text-right tabular-nums text-slate-600">{row.visitors ? format.percent(row.conversions / row.visitors) : "—"}</td>
                <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-800">{row.revenue ? format.money(row.revenue) : "—"}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">{t.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
