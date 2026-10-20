import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-8 w-8", className)}>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M8 10h16M10.5 16h11M13 22h6" stroke="var(--logo-ink, #fff)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 text-slate-950", className)}>
      <LogoMark />
      <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
