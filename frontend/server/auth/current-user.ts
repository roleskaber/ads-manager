import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import type { Locale } from "@/i18n/config";
import { userDirectory } from "@/server/container";
import type { SessionUser } from "./session-user";

/**
 * Signed-in user read fresh from the database (role/company can change after sign-in), or null.
 * Use in layouts and shared UI: they must not redirect, or the whole subtree is dropped from rendering.
 */
export const findCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await userDirectory.findById(session.user.id);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.company.id,
    companyName: user.company.name,
  };
});

/** Page-level guard: same as `findCurrentUser`, but redirects to sign-in when there is no valid user. */
export async function getCurrentUser(locale: Locale): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const user = await findCurrentUser();
  // A session whose user was removed from the workspace: clear the cookie, then go to sign-in.
  if (!user) redirect(`/api/session/expire?locale=${locale}`);
  return user;
}
