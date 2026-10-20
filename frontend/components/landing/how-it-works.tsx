import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";
import { DataFlowDiagram } from "./data-flow-diagram";
import { SectionHeading } from "./section-heading";

export function HowItWorks({ t }: { t: Dictionary["landing"]["howItWorks"] }) {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-b border-line py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} />
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {t.steps.map((step, index) => (
            <li key={step.title} className="border-t border-ink pt-5">
              <span className="font-mono text-xs text-slate-400">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">{step.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
        <DataFlowDiagram t={t.diagram} />
      </Container>
    </section>
  );
}
