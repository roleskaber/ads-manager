"use client";

import { Gauge, Plus, Target, Users, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CampaignsTable } from "./campaigns-table";
import { campaigns } from "./data";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { PerformanceChart } from "./performance-chart";
import { TrafficSources } from "./traffic-sources";
import type { DashboardDictionary } from "./types";

export function OverviewView({ t }: { t: DashboardDictionary }) {
  const [query, setQuery] = useState("");

  const visibleCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <>
      <PageHeader
        eyebrow={t.nav.overview}
        title={t.title}
        description={t.subtitle}
        actions={<Button className="w-fit shadow-sm"><Plus size={16} />{t.createCampaign}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t.metrics.spend} value="$12,438.20" change="12.8%" icon={WalletCards} />
        <MetricCard label={t.metrics.conversions} value="1,284" change="8.4%" icon={Target} />
        <MetricCard label={t.metrics.roas} value="4.28x" change="16.2%" icon={Gauge} />
        <MetricCard label={t.metrics.sessions} value="48,392" change="3.1%" icon={Users} positive={false} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <PerformanceChart t={t.performance} />
        <TrafficSources t={t.traffic} />
      </div>

      <CampaignsTable campaigns={visibleCampaigns} t={t.campaigns} searchPlaceholder={t.searchPlaceholder} query={query} onQueryChange={setQuery} />
    </>
  );
}
