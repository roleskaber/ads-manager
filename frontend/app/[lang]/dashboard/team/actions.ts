"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { TeamError, type TeamErrorCode } from "@/server/team/team-error";
import { assignableRoles } from "@/server/team/roles";
import { teamService } from "@/server/container";

export type TeamActionResult = { ok: true } | { ok: false; error: TeamErrorCode | "invalidInput" };
export type InviteState = { ok?: boolean; error?: TeamErrorCode | "invalidInput"; token?: string; email?: string };

const roleSchema = z.enum(assignableRoles);
const inviteSchema = z.object({ email: z.email().trim().toLowerCase(), role: roleSchema });

async function requireActorId() {
  const session = await auth();
  if (!session?.user?.id) throw new TeamError("forbidden");
  return session.user.id;
}

async function run(operation: (actorId: string) => Promise<void>): Promise<TeamActionResult> {
  try {
    await operation(await requireActorId());
    refresh();
    return { ok: true };
  } catch (error) {
    if (error instanceof TeamError) return { ok: false, error: error.code };
    throw error;
  }
}

export async function inviteMemberAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalidInput" };

  try {
    const token = await teamService.invite(await requireActorId(), parsed.data.email, parsed.data.role);
    refresh();
    return { ok: true, token, email: parsed.data.email };
  } catch (error) {
    if (error instanceof TeamError) return { error: error.code };
    throw error;
  }
}

export async function changeRoleAction(memberId: string, role: string) {
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "invalidInput" } satisfies TeamActionResult;
  return run((actorId) => teamService.changeRole(actorId, memberId, parsed.data));
}

export async function removeMemberAction(memberId: string) {
  return run((actorId) => teamService.remove(actorId, memberId));
}

export async function transferOwnershipAction(memberId: string) {
  return run((actorId) => teamService.transferOwnership(actorId, memberId));
}

export async function revokeInvitationAction(invitationId: string) {
  return run((actorId) => teamService.revokeInvitation(actorId, invitationId));
}
