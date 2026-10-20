import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { Logo } from "@/components/ui/logo";
import type { Locale } from "@/i18n/config";

type AuthCardProps = {
  locale: Locale;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ locale, title, description, children, footer }: AuthCardProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-12">
      <div className="absolute right-5 top-5">
        <LocaleSwitcher locale={locale} />
      </div>
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo href={`/${locale}`} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          {children}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">{footer}</div>
        </div>
      </div>
    </main>
  );
}

export function AuthCardSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-12">
      <div className="h-[460px] w-full max-w-[420px] animate-pulse rounded-xl border border-slate-200 bg-white" />
    </main>
  );
}
