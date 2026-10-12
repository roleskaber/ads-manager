import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import type { Locale } from "@/i18n/config";
import { userDirectory } from "@/server/container";
import type { SessionUser } from "./session-user";

// Role and company can change after sign-in (role change, ownership transfer, removal),
// so the session only identifies the user and the rest is read fresh from the database.
export const getCurrentUser = cache(async (locale: Locale): Promise<SessionUser> => {
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const user = await userDirectory.findById(session.user.id);
  if (!user) redirect(`/api/session/expire?locale=${locale}`);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.company.id,
    companyName: user.company.name,
  };
});
