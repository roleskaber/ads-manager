import { Plus } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";
import { SectionHeading } from "./section-heading";

export function Faq({ t }: { t: Dictionary["landing"]["faq"] }) {
  return (
    <section id="faq" className="scroll-mt-16 border-b border-line py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} />
        <div className="divide-y divide-line border-y border-line">
          {t.items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus size={18} className="shrink-0 text-slate-400 transition group-open:rotate-45" />
              </summary>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
