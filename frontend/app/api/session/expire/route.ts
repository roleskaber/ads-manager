import type { NextRequest } from "next/server";
import { signOut } from "@/auth";
import { defaultLocale, isLocale } from "@/i18n/config";

// Clears a session whose user no longer exists (e.g. removed from the workspace).
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? undefined;
  await signOut({ redirectTo: `/${isLocale(locale) ? locale : defaultLocale}/login` });
}
