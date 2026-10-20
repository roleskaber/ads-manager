import type { Dictionary } from "@/i18n/dictionaries/en";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { AssignableRole } from "@/server/team/roles";

export type TeamDictionary = Dictionary["dashboard"]["team"];

export type TeamMemberView = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joined: string;
  isYou: boolean;
  permissions: { roles: AssignableRole[]; canRemove: boolean; canTransferOwnership: boolean };
};

export type InvitationView = {
  id: string;
  email: string;
  role: UserRole;
  expires: string;
  canRevoke: boolean;
};
