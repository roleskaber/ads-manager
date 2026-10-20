import type { NextAuthConfig } from "next-auth";
import type { SessionUser } from "@/server/auth/session-user";

type TokenClaims = Partial<Pick<SessionUser, "id" | "role" | "companyId" | "companyName">>;

// Edge-safe config shared by the proxy and the full Auth.js setup (no DB access here).
export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
      }
      return token;
    },
    session({ session, token }) {
      const { id, role, companyId, companyName } = token as TokenClaims;
      if (id && role && companyId && companyName) {
        session.user = { ...session.user, id, role, companyId, companyName };
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
