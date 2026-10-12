import type { Metadata } from "next";
import { OverviewView } from "@/components/dashboard/overview-view";
import { resolveLocale } from "@/i18n/route-params";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard">): Promise<Metadata> {
  const { dict } = await resolveLocale(params);
  return { title: dict.dashboard.metaTitle };
}

export default async function DashboardPage({ params }: PageProps<"/[lang]/dashboard">) {
  const { dict } = await resolveLocale(params);
  return <OverviewView t={dict.dashboard} />;
}
