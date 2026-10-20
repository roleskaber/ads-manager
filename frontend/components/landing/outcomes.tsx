import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";
import { SectionHeading } from "./section-heading";

export function Outcomes({ t }: { t: Dictionary["landing"]["outcomes"] }) {
  return (
    <section className="border-b border-line py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} />
        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {t.items.map((item) => (
            <article key={item.label} className="border-t border-line pt-6">
              <p className="text-6xl font-semibold tracking-[-0.05em] text-accent">{item.value}</p>
              <p className="mt-2 font-medium text-ink">{item.label}</p>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
