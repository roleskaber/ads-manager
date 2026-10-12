import { Filter, MoreHorizontal, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Campaign, CampaignStatus } from "./data";
import { interpolate } from "@/i18n/interpolate";
import { Panel } from "./panel";
import type { DashboardDictionary } from "./types";

type CampaignsDictionary = DashboardDictionary["campaigns"];

const statusStyles: Record<CampaignStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
};

type CampaignsTableProps = {
  campaigns: Campaign[];
  t: CampaignsDictionary;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (value: string) => void;
};

export function CampaignsTable({ campaigns, t, searchPlaceholder, query, onQueryChange }: CampaignsTableProps) {
  const columns = Object.values(t.columns);
  return (
    <Panel
      title={t.title}
      description={t.description}
      className="mt-6"
      headerClassName="items-center border-b border-slate-100 p-5"
      actions={
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-36 bg-transparent outline-none placeholder:text-slate-400 sm:w-44"
            />
          </label>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Filter size={15} />
            {t.filter}
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {columns.map((column) => <th key={column} className="px-5 py-3 font-medium">{column}</th>)}
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((campaign) => <CampaignRow key={campaign.name} campaign={campaign} t={t} />)}
            {campaigns.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-5 py-10 text-center text-sm text-slate-400">{t.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CampaignRow({ campaign, t }: { campaign: Campaign; t: CampaignsDictionary }) {
  return (
    <tr className="hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={cn("h-2.5 w-2.5 rounded-full", campaign.color)} />
          <div>
            <p className="font-medium text-slate-800">{campaign.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{campaign.channel}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusStyles[campaign.status])}>{t.status[campaign.status]}</span>
      </td>
      <td className="px-5 py-4 text-slate-600">{campaign.budget}</td>
      <td className="px-5 py-4 text-slate-600">{campaign.spend}</td>
      <td className="px-5 py-4 text-slate-600">{campaign.conversions}</td>
      <td className="px-5 py-4 font-medium text-slate-800">{campaign.roas}</td>
      <td className="px-5 py-4 text-right">
        <button aria-label={interpolate(t.actions, { name: campaign.name })} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <MoreHorizontal size={17} />
        </button>
      </td>
    </tr>
  );
}
