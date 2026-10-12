import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { isLocale, localeCookie, type Locale } from "@/i18n/config";
import { negotiateLocale } from "@/i18n/negotiate";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/dashboard"];
const GUEST_ONLY_PATHS = ["/login", "/register"];

function preferredLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(localeCookie)?.value;
  return isLocale(fromCookie) ? fromCookie : negotiateLocale(request.headers.get("accept-language"));
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const [, maybeLocale, ...rest] = pathname.split("/");

  if (!isLocale(maybeLocale)) {
    return redirectTo(request, `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`);
  }

  const locale = maybeLocale;
  const path = `/${rest.join("/")}`;
  const isSignedIn = Boolean(request.auth?.user);

  if (!isSignedIn && PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return redirectTo(request, `/${locale}/login`);
  }
  if (isSignedIn && GUEST_ONLY_PATHS.includes(path)) {
    return redirectTo(request, `/${locale}/dashboard`);
  }

  const response = NextResponse.next();
  if (request.cookies.get(localeCookie)?.value !== locale) {
    response.cookies.set(localeCookie, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
