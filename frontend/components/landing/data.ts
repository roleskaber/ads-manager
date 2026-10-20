import { Blocks, Fingerprint, Filter, GitMerge, Scale, Target, type LucideIcon } from "lucide-react";

export const integrations = [
  "Google Ads", "Meta Ads", "Yandex Direct", "VK Ads", "Google Analytics 4", "Yandex Metrica",
  "amoCRM", "Bitrix24", "HubSpot", "Salesforce", "Stripe", "1C", "PostgreSQL", "BigQuery", "ClickHouse",
];

export const identityKeys = ["email", "phone", "client_id", "order_id"];

export const featureIcons: LucideIcon[] = [Fingerprint, Target, Filter, Scale, GitMerge, Blocks];

export const heroFunnel = {
  stages: [48210, 39870, 4120, 1630, 412],
  sourceShares: [46, 28, 12, 14],
};

export const sourceColors = ["bg-accent", "bg-[#7c8cf8]", "bg-[#f2a33a]", "bg-[#c9c6bb]"];

export type ExplorerChannel = { users: number[]; spendUsd: number };

export const explorerChannels: ExplorerChannel[] = [
  { users: [48210, 39870, 4120, 1630, 412], spendUsd: 38600 },
  { users: [21400, 18950, 2310, 1010, 268], spendUsd: 19800 },
  { users: [17800, 13900, 980, 310, 61], spendUsd: 12400 },
  { users: [9010, 7020, 830, 310, 83], spendUsd: 6400 },
];
