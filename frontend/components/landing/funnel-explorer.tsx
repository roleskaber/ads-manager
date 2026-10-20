"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/cn";
import { Container } from "./container";
import { explorerChannels } from "./data";
import { stepConversions, weakestStep } from "./funnel-math";
import { SectionHeading } from "./section-heading";

type FunnelExplorerProps = {
  locale: Locale;
  t: Dictionary["landing"]["explorer"];
  stages: string[];
};

export function FunnelExplorer({ locale, t, stages }: FunnelExplorerProps) {
  const [channelIndex, setChannelIndex] = useState(0);
  const channel = explorerChannels[channelIndex];

  return (
    <section className="border-b border-line py-20 sm:py-28">
      <Container>
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
          <ChannelTabs channels={t.channels} active={channelIndex} onChange={setChannelIndex} />
        </div>
        <FunnelColumns locale={locale} t={t} stages={stages} users={channel.users} spend={channel.spendUsd * t.usdRate} />
      </Container>
    </section>
  );
}

type ChannelTabsProps = { channels: string[]; active: number; onChange: (index: number) => void };

function ChannelTabs({ channels, active, onChange }: ChannelTabsProps) {
  return (
    <div role="tablist" className="inline-flex w-fit flex-wrap rounded-lg border border-line bg-white p-1">
      {channels.map((channel, index) => (
        <button
          key={channel}
          role="tab"
          aria-selected={index === active}
          onClick={() => onChange(index)}
          className={cn(
            "rounded-md px-3.5 py-2 text-sm transition",
            index === active ? "bg-ink font-medium text-white" : "text-slate-600 hover:text-ink",
          )}
        >
          {channel}
        </button>
      ))}
    </div>
  );
}

type FunnelColumnsProps = {
  locale: Locale;
  t: Dictionary["landing"]["explorer"];
  stages: string[];
  users: number[];
  spend: number;
};

function FunnelColumns({ locale, t, stages, users, spend }: FunnelColumnsProps) {
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: t.currency, maximumFractionDigits: 2 });
  const conversions = stepConversions(users);
  const weakest = weakestStep(users);

  return (
    <div className="mt-12 overflow-x-auto rounded-2xl border border-line bg-white">
      <div className="grid min-w-[760px] grid-cols-5">
        {users.map((value, index) => {
          const isWeakest = index === weakest;
          return (
            <div key={stages[index]} className={cn("flex flex-col border-r border-line p-5 last:border-r-0", isWeakest && "bg-[#fff8f2]")}>
              <p className="min-h-10 text-sm font-medium text-ink">{stages[index]}</p>
              <div className="mt-6 flex h-44 items-end">
                <div
                  className={cn("w-full rounded-t-sm transition-all duration-500", isWeakest ? "bg-[#ea7a2e]" : "bg-accent")}
                  style={{ height: `${Math.max(Math.sqrt(value / users[0]) * 100, 3)}%` }}
                />
              </div>
              <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                <Metric label={t.users} value={number.format(value)} />
                <Metric label={t.conversion} value={index === 0 ? "—" : percent.format(conversions[index])} highlight={isWeakest} />
                <Metric label={t.costPerStep} value={money.format(spend / value)} />
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={cn("mt-0.5 font-mono tabular-nums", highlight ? "font-semibold text-[#c2410c]" : "text-ink")}>{value}</dd>
    </div>
  );
}
