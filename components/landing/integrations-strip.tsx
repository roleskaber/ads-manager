import { Container } from "./container";
import { integrations } from "./data";

export function IntegrationsStrip({ title }: { title: string }) {
  return (
    <section id="integrations" className="scroll-mt-16 border-b border-line py-12">
      <Container>
        <p className="text-center text-sm text-slate-500">{title}</p>
        <ul className="mx-auto mt-7 flex max-w-4xl flex-wrap justify-center gap-x-8 gap-y-4">
          {integrations.map((name) => (
            <li key={name} className="text-[15px] font-medium tracking-tight text-slate-400 transition hover:text-ink">{name}</li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
