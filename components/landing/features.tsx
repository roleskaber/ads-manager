import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";
import { featureIcons } from "./data";
import { SectionHeading } from "./section-heading";

export function Features({ t }: { t: Dictionary["landing"]["features"] }) {
  return (
    <section id="product" className="scroll-mt-16 border-b border-line py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <article key={feature.title} className="bg-paper p-7 transition hover:bg-white">
                <Icon size={20} strokeWidth={1.6} className="text-accent" />
                <h3 className="mt-6 text-[17px] font-semibold tracking-tight text-ink">{feature.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
