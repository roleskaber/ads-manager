import type { Dictionary } from "@/i18n/dictionaries/en";
import type { SessionUser } from "@/server/auth/session-user";

export type DashboardUser = Pick<SessionUser, "name" | "email" | "companyName" | "role">;
export type DashboardDictionary = Dictionary["dashboard"];
