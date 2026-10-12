import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type MetricCardProps = {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  positive?: boolean;
};

export function MetricCard({ label, value, change, icon: Icon, positive = true }: MetricCardProps) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
            positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
          )}
        >
          <TrendIcon size={13} />
          {change}
        </span>
      </div>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
