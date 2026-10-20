import { ArrowRight } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { identityKeys } from "./data";

type DiagramColumnProps = { label: string; items: string[]; mono?: boolean };

function DiagramColumn({ label, items, mono }: DiagramColumnProps) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-1">
        {items.map((item) => (
          <li key={item} className={`rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-700 ${mono ? "font-mono" : ""}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Connector() {
  return (
    <div aria-hidden className="flex items-center justify-center text-slate-300">
      <span className="hidden h-px flex-1 bg-line lg:block" />
      <ArrowRight size={18} className="rotate-90 lg:rotate-0" />
    </div>
  );
}

export function DataFlowDiagram({ t }: { t: Dictionary["landing"]["howItWorks"]["diagram"] }) {
  return (
    <div className="mt-16 grid gap-6 rounded-2xl border border-line bg-[#fbfaf7] p-6 sm:p-8 lg:grid-cols-[1fr_60px_1.2fr_60px_1fr] lg:items-center">
      <DiagramColumn label={t.sources} items={t.sourceItems} />
      <Connector />
      <div className="rounded-xl border border-ink bg-ink p-5 text-white">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">{t.profile}</p>
        <p className="mt-3 font-mono text-lg">customer_48213</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {identityKeys.map((key) => (
            <li key={key} className="rounded border border-white/15 px-2 py-1 font-mono text-xs text-white/80">{key}</li>
          ))}
        </ul>
      </div>
      <Connector />
      <DiagramColumn label={t.outputs} items={t.outputItems} />
    </div>
  );
}
