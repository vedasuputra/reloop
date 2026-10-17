"use client";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

export type SubscriptionInfo = {
  tier: string; price: string; organisation: string; started: string; renews: string; benefits: string[]; contactHref: string;
  labels: { open: string; title: string; plan: string; organisation: string; started: string; renews: string; includes: string; note: string; contact: string; close: string };
};

/**
 * Under the email in the sidebar: the plan the organisation is on. Clicking it opens a read-only popup with the details of the
 * subscription. There is nothing to change in it: plans are arranged by personal contact, not by an employee in the app.
 */
export default function SubscriptionBadge({ info, fontClass = "" }: { info: SubscriptionInfo; fontClass?: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const L = info.labels;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${L.open}: ${info.tier}`}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[9px] border border-[#FFFEF6]/30 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[#FFFEF6]/15">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[#DFF19F]" />
          <span><span className="opacity-70">{L.plan}</span> <b className="font-semibold">{info.tier}</b></span>
        </span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M4.5 2.5 8 6l-3.5 3.5" /></svg>
      </button>

      {open && createPortal(
        // below the Ask AI button (1000), like the other popups
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ zIndex: 900 }}
          className={`fixed inset-0 flex items-start justify-center overflow-y-auto bg-[#174538]/80 px-5 py-10 backdrop-blur-sm sm:items-center ${fontClass}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="relative w-full max-w-md rounded-[9px] bg-white p-8 text-[#174538] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]">
            <button type="button" onClick={() => setOpen(false)} aria-label={L.close}
              className="absolute right-3 top-3 cursor-pointer rounded-[9px] px-2.5 py-1 text-xl leading-none text-[#355E3B] hover:bg-[#174538]/10">×</button>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#355E3B]">{L.title}</p>
            <h2 id={titleId} className="mt-1 font-[family-name:var(--font-display)] text-4xl font-normal leading-tight tracking-tight">{info.tier}</h2>
            <p className="mt-1 text-sm text-[#355E3B]">{info.price}</p>

            <dl className="mt-6 divide-y divide-[#174538]/10 border-y border-[#174538]/10 text-sm">
              {([[L.organisation, info.organisation], [L.started, info.started], [L.renews, info.renews]] as const).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-[#355E3B]">{k}</dt><dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-sm font-semibold">{L.includes}</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              {info.benefits.map((b) => (
                <li key={b} className="flex gap-2.5">
                  <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2a7e67" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 rounded-[9px] border border-[#174538]/15 bg-[#FFFEF6] px-4 py-3 text-xs leading-relaxed text-[#355E3B]">
              {L.note}{" "}
              <a href={info.contactHref} className="font-semibold text-[#174538] underline underline-offset-2 hover:opacity-70">{L.contact}</a>
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
