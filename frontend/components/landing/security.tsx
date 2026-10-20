import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Container } from "./container";
import { SectionHeading } from "./section-heading";

export function Security({ t }: { t: Dictionary["landing"]["security"] }) {
  return (
    <section className="bg-ink py-20 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} tone="dark" />
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {t.items.map((item) => (
            <li key={item} className="flex items-start gap-4 py-5 text-[15px] leading-6 text-white/85">
              <Check size={18} className="mt-0.5 shrink-0 text-[#8fa2ff]" />
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
