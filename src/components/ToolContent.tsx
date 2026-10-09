import { ShieldCheck } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

interface ToolContentProps {
  intro: string;
  faqs: FaqItem[];
}

export function ToolContent({ intro, faqs }: ToolContentProps) {
  return (
    <div className="mt-14 grid gap-10 border-t border-border pt-10 sm:grid-cols-[1.1fr_1fr]">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
          Why use this instead of an upload-based converter?
        </h2>
        <p className="mt-2 leading-relaxed text-muted">{intro}</p>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold">Frequently asked questions</h2>
        <dl className="mt-3 flex flex-col gap-4">
          {faqs.map((f) => (
            <div key={f.q}>
              <dt className="font-display text-sm font-semibold">{f.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
