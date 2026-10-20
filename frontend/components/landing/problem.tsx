import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";
import { SectionHeading } from "./section-heading";

export function Problem({ t }: { t: Dictionary["landing"]["problem"] }) {
  return (
    <section className="border-b border-line py-20 sm:py-28">
      <Container>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} />
          <p className="text-[17px] leading-8 text-slate-600 lg:pt-10">{t.description}</p>
        </div>
        <dl className="mt-16 grid border-t border-line sm:grid-cols-3">
          {t.stats.map((stat) => (
            <div key={stat.value} className="border-b border-line py-8 sm:border-b-0 sm:border-r sm:px-8 sm:first:pl-0 sm:last:border-r-0">
              <dt className="text-5xl font-semibold tracking-[-0.04em] text-ink">{stat.value}</dt>
              <dd className="mt-3 max-w-[16rem] text-sm leading-6 text-slate-600">{stat.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 font-mono text-[11px] text-slate-400">{t.footnote}</p>
      </Container>
    </section>
  );
}
