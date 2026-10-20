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
