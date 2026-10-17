import type { CSSProperties, ReactNode } from "react";

/**
 * Shared building blocks of the app screens, so every screen uses the same buttons, cards, notices and tags:
 * deep green #174538, hunter #355E3B for secondary text, cream #FFFEF6, 9px corners, EB Garamond titles.
 */

export const H = "font-[family-name:var(--font-display)] font-normal tracking-tight";
/** 40px high with or without a border, like the inputs. */
export const BTN = "inline-flex h-10 items-center gap-2 rounded-[9px] px-5 text-sm font-semibold transition-opacity hover:opacity-85";
export const BTN_PRIMARY = `${BTN} cursor-pointer bg-[#174538] text-[#FFFEF6]`;
export const BTN_OUTLINE = `${BTN} cursor-pointer border border-[#174538]/40 bg-white`;
export const CARD = "rounded-[9px] border border-[#174538]/15 bg-white p-5";
export const INPUT = "h-10 w-full rounded-[9px] border border-[#174538]/25 bg-[#FFFEF6] px-3 py-2 text-sm text-[#174538] outline-none transition-colors placeholder:text-[#355E3B]/60 focus:border-[#174538] disabled:opacity-60";
export const LINK = "font-semibold text-[#174538] underline underline-offset-2 hover:opacity-70";
export const TABLE_BOX = "overflow-x-auto rounded-[9px] border border-[#174538]/15 bg-white";
export const TH = "px-4 py-3 text-left text-xs font-semibold text-[#355E3B]";
export const TR = "border-b border-[#174538]/10 last:border-0 hover:bg-[#FFFEF6]";
/** Gradient used by the sidebar, the hero blocks and the highlighted cards. */
export const GREEN = "bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEF6]";

/** Staggered fade-in: each block starts a little after the previous one. */
export const rise = (i: number) => ({ "--d": `${i * 0.08}s` }) as CSSProperties;

/** Page title with an optional one-paragraph explanation and action buttons on the right. */
export function PageTitle({ title, sub, actions, aside }: { title: string; sub?: ReactNode; actions?: ReactNode; aside?: ReactNode }) {
  // With an `aside`, the box at the right is as tall as the title and its explanation together (it is laid over the second column
  // of the row, so its own content never makes the row taller); on phones it simply sits below
  if (aside) {
    return (
      <div className="rl-rise relative z-20 grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 max-w-3xl">
          <h1 className={`${H} text-4xl md:text-5xl`}>{title}</h1>
          {/* a set width, and balanced, so the lines of the explanation are about equally long */}
          {sub && <p className="mt-3 max-w-2xl text-balance text-sm leading-relaxed text-[#355E3B]">{sub}</p>}
        </div>
        <div className="relative">
          <div className="md:absolute md:inset-0">{aside}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rl-rise flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-3xl">
        <h1 className={`${H} text-4xl md:text-5xl`}>{title}</h1>
        {sub && <p className="mt-3 text-balance text-sm leading-relaxed text-[#355E3B]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 print:hidden">{actions}</div>}
    </div>
  );
}

const TONE = {
  ok: "border-[#b7dccf] bg-[#DEF4EE]",       // mint: done, verified, good
  warn: "border-[#174538]/25 bg-[#FFFDD0]",  // butter: attention, assumption, error
  info: "border-[#d4e3a9] bg-[#F5FBE2]",     // lime: neutral hint
  plain: "border-[#174538]/15 bg-white",
} as const;
export type Tone = keyof typeof TONE;

/** A message box: result of an action, a warning, a hint. */
export function Notice({ tone = "plain", title, children, role, className = "" }: {
  tone?: Tone; title?: string; children: ReactNode; role?: "alert" | "status"; className?: string;
}) {
  return (
    <div role={role} className={`rounded-[9px] border px-4 py-3 text-sm leading-relaxed ${TONE[tone]} ${className}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

/** Small label such as "Verified", "Assumption", "Met", "Not yet". */
export function Tag({ tone = "plain", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-2 py-0.5 text-xs font-semibold text-[#174538] ${TONE[tone]}`}>{children}</span>;
}

/** Round dot in the recommendation colors (same look as the dots on the Orders and Dashboard screens). */
export function Dot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: "inset 0 0 0 1px rgba(23,69,56,0.25)" }} />;
}

/** Numbered circle used for steps. */
export function StepNo({ n }: { n: number }) {
  return (
    <span aria-hidden className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#174538] text-xs font-semibold text-[#FFFEF6]">{n}</span>
  );
}

export function DownloadIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13h11" />
    </svg>
  );
}

/** One thin horizontal bar on a light track (progress, shares). */
export function Meter({ value, color = "#37a486", label }: { value: number; color?: string; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="h-2.5 overflow-hidden rounded-[2px] bg-[#d0f0e7]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className="h-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
