"use client";

import { Check, Copy } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import type { DashboardDictionary } from "./types";

type TrackingSetupProps = { t: DashboardDictionary["setup"]; trackingKey: string; conversionEvent: string | null };

export function TrackingSetup({ t, trackingKey, conversionEvent }: TrackingSetupProps) {
  const origin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => "");
  const snippet = `<script async src="${origin}/adsm.js" data-key="${trackingKey}"></script>`;
  const example = `adsm.track("${conversionEvent ?? "lead_form_submitted"}", { amount: 84000, currency: "RUB" });`;

  return (
    <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-5">
      <h3 className="font-semibold text-slate-900">{t.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{t.description}</p>
      <CodeLine code={snippet} t={t} />
      <p className="mt-4 text-sm text-slate-600">{t.events}</p>
      <CodeLine code={example} t={t} />
      <p className="mt-4 text-xs text-slate-500">{t.key}: <code className="font-mono text-slate-700">{trackingKey}</code></p>
    </section>
  );
}

const subscribeNever = () => () => {};

function CodeLine({ code, t }: { code: string; t: DashboardDictionary["setup"] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-1 font-mono text-xs text-slate-700">{code}</code>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label={copied ? t.copied : t.copy}
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </Button>
    </div>
  );
}
