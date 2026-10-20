import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/cn";
import { heroFunnel, sourceColors } from "./data";
import { barWidth, stepConversions, weakestStep } from "./funnel-math";

type FunnelPreviewProps = { locale: Locale; t: Dictionary["landing"]["funnel"] };

export function FunnelPreview({ locale, t }: FunnelPreviewProps) {
  const { stages, sourceShares } = heroFunnel;
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const conversions = stepConversions(stages);
  const weakest = weakestStep(stages);

  return (
    <div className="rounded-2xl border border-line bg-white shadow-[0_1px_0_rgba(17,18,20,0.04),0_24px_48px_-28px_rgba(17,18,20,0.28)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <p className="text-sm font-semibold text-ink">{t.title}</p>
        <span className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-slate-500">{t.period}</span>
      </div>

      <ol className="space-y-1 px-5 py-5">
        {stages.map((value, index) => (
          <li key={t.stages[index]}>
            {index > 0 && (
              <div className="flex items-center gap-2 py-1.5 pl-3 font-mono text-[11px] text-slate-400">
                <span className="h-3 w-px bg-line" />
                <span className={cn(index === weakest && "font-medium text-[#c2410c]")}>
                  {percent.format(conversions[index])} {t.fromPrevious}
                </span>
                {index === weakest && (
                  <span className="rounded bg-[#fff1e6] px-1.5 py-0.5 font-sans text-[10px] font-medium text-[#c2410c]">{t.biggestDrop}</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-600">{t.stages[index]}</span>
              <span className="font-mono tabular-nums text-ink">{number.format(value)}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-sm bg-[#f0efea]">
              <div className="h-full rounded-sm bg-accent" style={{ width: barWidth(value, stages[0]) }} />
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-line px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">{t.sourceSplit}</p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-sm">
          {sourceShares.map((share, index) => (
            <div key={t.sources[index]} className={sourceColors[index]} style={{ width: `${share}%` }} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
          {sourceShares.map((share, index) => (
            <span key={t.sources[index]} className="flex items-center gap-1.5">
              <i className={cn("h-2 w-2 rounded-sm", sourceColors[index])} />
              {t.sources[index]} <span className="font-mono text-ink">{share}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
