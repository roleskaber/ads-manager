import type { Locale } from "@/i18n/config";
import { Panel } from "./panel";
import type { DashboardDictionary } from "./types";

type Point = { day: string; visitors: number; conversions: number };
type PerformanceChartProps = { locale: Locale; t: DashboardDictionary["performance"]; series: Point[] };

export function PerformanceChart({ locale, t, series }: PerformanceChartProps) {
  const max = Math.max(1, ...series.map((point) => point.visitors));
  const dayLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const labelEvery = Math.ceil(series.length / 6);

  return (
    <Panel title={t.title} description={t.description} className="p-5">
      <div className="mt-8 flex h-56 items-end gap-[3px] border-b border-l border-slate-100 px-2 pt-5">
        {series.map((point, index) => (
          <div
            key={point.day}
            className="group relative flex h-full flex-1 items-end"
            title={`${dayLabel.format(new Date(point.day))}: ${point.visitors} / ${point.conversions}`}
          >
            <div style={{ height: `${(point.visitors / max) * 100}%` }} className="relative w-full rounded-t-sm bg-blue-200 transition group-hover:bg-blue-300">
              <div
                style={{ height: point.visitors ? `${(point.conversions / point.visitors) * 100}%` : 0 }}
                className="absolute inset-x-0 bottom-0 rounded-t-sm bg-blue-600"
              />
            </div>
            {index % labelEvery === 0 && (
              <span className="absolute -bottom-6 left-0 whitespace-nowrap text-[10px] text-slate-400">{dayLabel.format(new Date(point.day))}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-9 flex gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-blue-200" />{t.visitors}</span>
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-blue-600" />{t.conversions}</span>
      </div>
    </Panel>
  );
}
