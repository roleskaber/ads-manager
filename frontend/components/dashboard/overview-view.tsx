import { Coins, Gauge, Target, Users } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { interpolate } from "@/i18n/interpolate";
import type { Overview } from "@/server/analytics/overview.service";
import { change, createFormatters } from "./format";
import { MetricCard } from "./metric-card";
import { PerformanceChart } from "./performance-chart";
import { SourcesTable } from "./sources-table";
import { TrackingSetup } from "./tracking-setup";
import { TrafficSources } from "./traffic-sources";
import type { DashboardDictionary } from "./types";

type OverviewViewProps = { locale: Locale; t: DashboardDictionary; overview: Overview };

export function OverviewView({ locale, t, overview }: OverviewViewProps) {
  const format = createFormatters(locale, overview.currency);
  const { visitors, conversions, revenue, roas } = overview.metrics;
  const conversionRate = visitors.value ? (conversions.value ?? 0) / visitors.value : null;

  return (
    <>
      {overview.trackingKey && <TrackingSetup t={t.setup} trackingKey={overview.trackingKey} conversionEvent={overview.conversionEvent} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t.metrics.visitors}
          value={format.number(visitors.value ?? 0)}
          icon={Users}
          delta={change(visitors.value, visitors.previous)}
          deltaLabel={t.vsPrevious}
        />
        <MetricCard
          label={t.metrics.conversions}
          value={format.number(conversions.value ?? 0)}
          icon={Target}
          delta={change(conversions.value, conversions.previous)}
          deltaLabel={t.vsPrevious}
          hint={
            overview.conversionEvent
              ? [interpolate(t.hints.conversionGoal, { event: overview.conversionEvent }), conversionRate !== null && interpolate(t.hints.conversionRate, { rate: format.percent(conversionRate) })].filter(Boolean).join(" · ")
              : t.hints.noFunnel
          }
        />
        <MetricCard
          label={t.metrics.revenue}
          value={format.money(revenue.value ?? 0)}
          icon={Coins}
          delta={change(revenue.value, revenue.previous)}
          deltaLabel={t.vsPrevious}
        />
        <MetricCard
          label={t.metrics.roas}
          value={roas.value === null ? "—" : format.ratio(roas.value)}
          icon={Gauge}
          delta={change(roas.value, roas.previous)}
          deltaLabel={t.vsPrevious}
          hint={!overview.hasAdAccounts ? t.hints.noAdAccounts : roas.value === null ? t.hints.noSpend : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <PerformanceChart locale={locale} t={t.performance} series={overview.series} />
        <TrafficSources t={t.traffic} channelLabels={t.channels} channels={overview.channels} formatNumber={format.number} />
      </div>

      <SourcesTable
        locale={locale}
        currency={overview.currency}
        rows={overview.sources}
        t={t.sources}
        channelLabels={t.channels}
        searchPlaceholder={t.searchPlaceholder}
      />
    </>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 rounded-xl border border-slate-200 bg-white" />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <div className="h-80 rounded-xl border border-slate-200 bg-white" />
        <div className="h-80 rounded-xl border border-slate-200 bg-white" />
      </div>
      <div className="mt-6 h-72 rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
