import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PanelProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
};

export function Panel({ title, description, actions, children, className, headerClassName }: PanelProps) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className={cn("flex flex-wrap items-start justify-between gap-3", headerClassName)}>
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
