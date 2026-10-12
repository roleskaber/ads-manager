import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validation/auth";
import { credentialsAuthenticator } from "@/server/container";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const credentials = loginSchema.safeParse(rawCredentials);
        if (!credentials.success) return null;

        return credentialsAuthenticator.authenticate(
          credentials.data.email,
          credentials.data.password,
        );
      },
    }),
  ],
});
