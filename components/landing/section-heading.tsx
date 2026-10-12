import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "light" | "dark";
  className?: string;
};

export function Eyebrow({ children, tone = "light" }: { children: string; tone?: "light" | "dark" }) {
  return (
    <p className={cn("flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]", tone === "dark" ? "text-white/60" : "text-slate-500")}>
      <span className="h-1.5 w-1.5 bg-accent" />
      {children}
    </p>
  );
}

export function SectionHeading({ eyebrow, title, description, tone = "light", className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2 className={cn("mt-4 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[40px]", tone === "dark" ? "text-white" : "text-ink")}>
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4 text-[17px] leading-7", tone === "dark" ? "text-white/70" : "text-slate-600")}>{description}</p>
      )}
    </div>
  );
}
