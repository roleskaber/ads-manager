import { BarChart3, Globe2, LayoutDashboard, Megaphone, Settings, Users, WalletCards, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";

type DashboardDictionary = Dictionary["dashboard"];

export type NavKey = keyof DashboardDictionary["nav"];
/** `path` is relative to /[lang]/dashboard; items without it are not built yet. */
export type NavItem = { key: NavKey; icon: LucideIcon; path?: string; badge?: string };

export const workspaceNav: NavItem[] = [
  { key: "overview", icon: LayoutDashboard, path: "" },
  { key: "campaigns", icon: Megaphone, badge: "4" },
  { key: "analytics", icon: BarChart3 },
  { key: "integrations", icon: Globe2 },
];

export const manageNav: NavItem[] = [
  { key: "team", icon: Users, path: "/team" },
  { key: "billing", icon: WalletCards },
  { key: "settings", icon: Settings },
];

export type CampaignStatus = keyof DashboardDictionary["campaigns"]["status"];

export type Campaign = {
  name: string;
  channel: string;
  status: CampaignStatus;
  budget: string;
  spend: string;
  conversions: string;
  roas: string;
  color: string;
};

export const campaigns: Campaign[] = [
  { name: "Summer sale · Search", channel: "Google Ads", status: "active", budget: "$1,200", spend: "$842.70", conversions: "186", roas: "4.82x", color: "bg-blue-500" },
  { name: "Brand awareness", channel: "Google Display", status: "active", budget: "$650", spend: "$391.20", conversions: "92", roas: "3.14x", color: "bg-violet-500" },
  { name: "Retargeting · Q3", channel: "Google Ads", status: "paused", budget: "$480", spend: "$128.40", conversions: "34", roas: "2.76x", color: "bg-amber-500" },
  { name: "New collection launch", channel: "Google Shopping", status: "draft", budget: "$900", spend: "—", conversions: "—", roas: "—", color: "bg-slate-400" },
];

export const performanceSeries = [
  { label: "14.09", value: 42 }, { label: "", value: 58 }, { label: "18", value: 48 }, { label: "", value: 70 },
  { label: "22", value: 64 }, { label: "", value: 82 }, { label: "26", value: 68 }, { label: "", value: 88 },
  { label: "30", value: 76 }, { label: "", value: 94 }, { label: "04.10", value: 82 }, { label: "", value: 100 },
];

export type TrafficSourceKey = keyof DashboardDictionary["traffic"]["sources"];

export const trafficSources: Array<{ key: TrafficSourceKey; share: number; color: string }> = [
  { key: "googleAds", share: 53, color: "#2563eb" },
  { key: "organic", share: 23, color: "#8b5cf6" },
  { key: "direct", share: 12, color: "#f59e0b" },
  { key: "other", share: 12, color: "#e2e8f0" },
];
