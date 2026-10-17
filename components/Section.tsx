import type { CSSProperties, ReactNode } from "react";

/** A titled block of a screen: serif heading, one-line subtitle, content. `i` staggers its fade-in. */
export default function Section({ title, sub, i = 0, children }: { title: string; sub?: string; i?: number; children: ReactNode }) {
  return (
    <section className="rl-rise mt-10 flex flex-col" style={{ "--d": `${i * 0.08}s` } as CSSProperties}>
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal tracking-tight">{title}</h2>
      {sub && <p className="mt-1 text-sm leading-relaxed text-[#355E3B]">{sub}</p>}
      {/* flex-1 so a card inside can fill the height when two sections sit side by side */}
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}
