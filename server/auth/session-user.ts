import type { UserRole } from "@/lib/generated/prisma/enums";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyName: string;
};
