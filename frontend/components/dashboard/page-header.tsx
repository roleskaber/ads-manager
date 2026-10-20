import type { ReactNode } from "react";

type PageHeaderProps = { eyebrow: string; title: string; description: string; actions?: ReactNode };

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-medium text-blue-600">{eyebrow}</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {actions}
    </div>
  );
}
