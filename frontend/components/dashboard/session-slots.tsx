import { format } from "date-fns";
import type { Locale } from "@/i18n/config";
import { dateLocales } from "@/i18n/date-locale";
import { interpolate } from "@/i18n/interpolate";
import { findCurrentUser } from "@/server/auth/current-user";
import type { DashboardDictionary } from "./types";
import { UserMenu } from "./user-menu";

type SlotProps = { locale: Locale; t: DashboardDictionary };

// Small server components that read the session; each sits behind its own <Suspense> in the layout.
// They never redirect — the proxy guards /dashboard and pages redirect on their own.

export async function CompanyName() {
  const user = await findCurrentUser();
  return <>{user?.companyName}</>;
}

export async function SidebarUser({ locale, t }: SlotProps) {
  const user = await findCurrentUser();
  if (!user) return null;
  const { name, email, companyName, role } = user;
  return (
    <UserMenu
      locale={locale}
      user={{ name, email, companyName, role }}
      roleLabel={t.team.roles[role]}
      signOutLabel={t.signOut}
    />
  );
}

export async function Greeting({ locale, t }: SlotProps) {
  const user = await findCurrentUser();
  if (!user) return null;
  return (
    <>
      <p className="text-xs text-slate-400">{format(new Date(), "EEEE, d MMMM yyyy", { locale: dateLocales[locale] })}</p>
      <h1 className="mt-0.5 text-lg font-semibold tracking-tight">{interpolate(t.welcome, { name: user.name.split(" ")[0] })}</h1>
    </>
  );
}

export function TextSkeleton({ className }: { className: string }) {
  return <span className={`inline-block animate-pulse rounded bg-slate-200/70 align-middle ${className}`} />;
}

export function GreetingSkeleton() {
  return (
    <>
      <TextSkeleton className="h-3 w-40" />
      <div className="mt-1.5"><TextSkeleton className="h-5 w-52" /></div>
    </>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <span className="h-8 w-8 animate-pulse rounded-full bg-slate-200/70" />
      <div className="flex-1 space-y-1.5">
        <TextSkeleton className="h-3 w-24" />
        <TextSkeleton className="h-2.5 w-36" />
      </div>
    </div>
  );
}
