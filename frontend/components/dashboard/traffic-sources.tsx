import { Panel } from "./panel";
import type { DashboardDictionary } from "./types";

type ChannelKey = keyof DashboardDictionary["channels"];
type TrafficSourcesProps = {
  t: DashboardDictionary["traffic"];
  channelLabels: DashboardDictionary["channels"];
  channels: Array<{ channel: string; visitors: number }>;
  formatNumber: (value: number) => string;
};

const channelColors: Record<ChannelKey, string> = {
  PAID_SEARCH: "#2563eb",
  PAID_SOCIAL: "#7c3aed",
  DISPLAY: "#0891b2",
  EMAIL: "#16a34a",
  ORGANIC_SEARCH: "#f59e0b",
  ORGANIC_SOCIAL: "#ec4899",
  REFERRAL: "#64748b",
  DIRECT: "#cbd5e1",
  NONE: "#e2e8f0",
};

export function TrafficSources({ t, channelLabels, channels, formatNumber }: TrafficSourcesProps) {
  const total = channels.reduce((sum, row) => sum + row.visitors, 0);
  let offset = 0;
  const stops = channels.map(({ channel, visitors }) => {
    const share = (visitors / total) * 100;
    const stop = `${channelColors[channel as ChannelKey] ?? "#e2e8f0"} ${offset}% ${offset + share}%`;
    offset += share;
    return stop;
  });

  return (
    <Panel title={t.title} description={t.description} className="p-5">
      {total === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-400">{t.empty}</p>
      ) : (
        <div className="mt-8 flex items-center gap-7">
          <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
            <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
              <span className="text-2xl font-semibold">{formatNumber(total)}</span>
              <span className="text-[10px] text-slate-400">{t.visitors}</span>
            </div>
          </div>
          <div className="min-w-0 space-y-2.5 text-xs">
            {channels.slice(0, 6).map(({ channel, visitors }) => (
              <div key={channel} className="flex items-center gap-2">
                <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: channelColors[channel as ChannelKey] }} />
                <span className="truncate text-slate-500">{channelLabels[channel as ChannelKey] ?? channel}</span>
                <strong className="ml-auto pl-2">{Math.round((visitors / total) * 100)}%</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
