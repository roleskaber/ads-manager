import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type TextFieldProps = ComponentProps<"input"> & { label: string; error?: string };

export function TextField({ label, error, className, id, name, ...props }: TextFieldProps) {
  const inputId = id ?? name;
  return (
    <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
      {label}
      <input
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
          error && "border-rose-300 focus:border-rose-500 focus:ring-rose-100",
          className,
        )}
        {...props}
      />
      {error && <span className="mt-1.5 block text-xs font-normal text-rose-600">{error}</span>}
    </label>
  );
}
