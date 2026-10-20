import "server-only";
import { auth } from "@/auth";
import { userDirectory } from "@/server/container";
import type { Actor } from "@/server/team/team-policy";

/** Current user for API routes, read fresh from the database (role may have changed since sign-in). */
export async function getApiActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await userDirectory.findById(session.user.id);
  return user ? { id: user.id, role: user.role, companyId: user.company.id } : null;
}
