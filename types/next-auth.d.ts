import type { UserRole } from "@/lib/generated/prisma/enums";
import type { SessionUser } from "@/server/auth/session-user";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    companyId?: string;
    companyName?: string;
  }

  interface Session {
    user: SessionUser;
  }
}
