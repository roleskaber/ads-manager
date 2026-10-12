import { MoreHorizontal } from "lucide-react";
import { trafficSources } from "./data";
import { Panel } from "./panel";
import type { DashboardDictionary } from "./types";

function conicGradient(sources: typeof trafficSources) {
  let offset = 0;
  const stops = sources.map(({ share, color }) => {
    const stop = `${color} ${offset}% ${offset + share}%`;
    offset += share;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function TrafficSources({ t }: { t: DashboardDictionary["traffic"] }) {
  return (
    <Panel
      title={t.title}
      description={t.description}
      className="p-5"
      actions={<button aria-label={t.more} className="text-slate-400 hover:text-slate-700"><MoreHorizontal size={18} /></button>}
    >
      <div className="mt-8 flex items-center gap-7">
        <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: conicGradient(trafficSources) }}>
          <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-2xl font-semibold">48.4k</span>
            <span className="text-[10px] text-slate-400">{t.sessions}</span>
          </div>
        </div>
        <div className="space-y-3 text-xs">
          {trafficSources.map(({ key, share, color }) => (
            <div key={key} className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="w-20 text-slate-500">{t.sources[key]}</span>
              <strong>{share}%</strong>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
