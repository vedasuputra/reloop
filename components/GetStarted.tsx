"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export type StepOption = { label: string; href?: string; action?: () => Promise<void> };
export type StepInfo = { key: string; title: string; text: string; done: boolean; options: StepOption[]; files?: { label: string; href: string }[] };
export type OptionalInfo = { key: string; title: string; text: string; done: boolean; href: string };

export type GetStartedProps = {
  showWelcome: boolean;
  closeAction: () => Promise<void>;
  steps: StepInfo[];
  optional: OptionalInfo[];
  welcome: {
    title: string; intro: string;
    sample: { title: string; text: string; action: () => Promise<void> };
    upload: { title: string; text: string; action: () => Promise<void> };
    files: string; fileLinks: { label: string; href: string }[];
    guide: string;
  };
  labels: { open: string; title: string; progress: string; optional: string; done: string; close: string };
  fontClass?: string;
};

const noSubscribe = () => () => {};

function Rocket({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function Check({ done, n }: { done: boolean; n: number }) {
  return done ? (
    <span aria-hidden className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#b7dccf] bg-[#DEF4EE]">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#2a7e67" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.3 5 8.8l4.5-5.6" /></svg>
    </span>
  ) : (
    <span aria-hidden className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#174538]/30 text-xs font-semibold text-[#174538]">{n}</span>
  );
}

const BTN = "inline-flex h-8 cursor-pointer items-center rounded-[9px] border border-[#174538]/40 bg-white px-3 text-xs font-semibold text-[#174538] transition-opacity hover:opacity-85";

/**
 * Onboarding. A welcome popup appears once for a new person, asking how they would like to begin (sample data or their own data).
 * Once it is closed, a rocket icon beside the logo in the sidebar stays: it opens the list of what to do next, with the steps that
 * are done ticked off. The quieter, optional things (retraining the AI, the API) sit at the bottom of that list.
 * Whether the welcome was closed is remembered in the person's account (see app/onboarding/actions.ts).
 */
export default function GetStarted({ showWelcome, closeAction, steps, optional, welcome, labels: L, fontClass = "" }: GetStartedProps) {
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false); // portals need the browser
  const [welcomeOpen, setWelcomeOpen] = useState(showWelcome);
  const [panel, setPanel] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [, startTransition] = useTransition();
  const titleId = useId();
  const remaining = steps.filter((s) => !s.done).length;

  const closeWelcome = () => { setWelcomeOpen(false); startTransition(() => { void closeAction(); }); };

  useEffect(() => {
    if (!welcomeOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setWelcomeOpen(false); startTransition(() => { void closeAction(); }); } };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [welcomeOpen, closeAction]);

  useEffect(() => {
    if (!panel) return;
    const away = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-getstarted-panel]") && !button.current?.contains(t)) setPanel(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", onKey); };
  }, [panel]);

  const toggle = () => {
    if (panel) { setPanel(null); return; }
    const r = button.current?.getBoundingClientRect();
    if (r) {
      const width = Math.min(352, window.innerWidth - 24); // 22rem, as the panel's own width
      setPanel({ top: r.bottom + 10, left: Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12)) });
    }
  };

  return (
    <>
      <button ref={button} type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={!!panel} aria-label={L.open} title={L.open}
        className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-[#FFFEF6]/40 text-[#FFFEF6] transition-colors hover:bg-[#FFFEF6]/15">
        <Rocket />
        {remaining > 0 && (
          <span aria-hidden className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DFF19F] px-1 text-[10px] font-bold leading-none text-[#174538]">{remaining}</span>
        )}
      </button>

      {/* The list of what can be done, under the icon */}
      {mounted && panel && createPortal(
        <div data-getstarted-panel role="dialog" aria-label={L.title} style={{ position: "fixed", top: panel.top, left: panel.left, zIndex: 900, width: "min(22rem, calc(100vw - 1.5rem))" }}
          className={`max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[9px] border border-[#174538]/15 bg-white text-[#174538] shadow-[0_24px_60px_-20px_rgba(23,69,56,0.45)] ${fontClass}`}>
          <div className="flex items-start justify-between gap-3 border-b border-[#174538]/10 px-5 py-4">
            <div>
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight tracking-tight">{L.title}</p>
              <p className="mt-0.5 text-xs text-[#355E3B]">{L.progress}</p>
            </div>
            <button type="button" onClick={() => setPanel(null)} aria-label={L.close} className="-mr-1.5 -mt-1 cursor-pointer rounded-[9px] px-2 py-0.5 text-xl leading-none text-[#355E3B] hover:bg-[#174538]/10">×</button>
          </div>

          <ol className="divide-y divide-[#174538]/10">
            {steps.map((s, i) => (
              <li key={s.key} className="flex gap-3 px-5 py-4">
                <Check done={s.done} n={i + 1} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.title}{s.done && <span className="ml-2 text-xs font-normal text-[#2f8f7a]/90">{L.done}</span>}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#355E3B]">{s.text}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {s.options.map((o) => o.action
                      ? <form key={o.label} action={o.action}><button className={BTN}>{o.label}</button></form>
                      : <Link key={o.label} href={o.href ?? "#"} onClick={() => setPanel(null)} className={BTN}>{o.label}</Link>)}
                  </div>
                  {s.files && (
                    <p className="mt-2 text-xs text-[#355E3B]">
                      {s.files.map((f, k) => (
                        <span key={f.href}>{k > 0 && " · "}<a href={f.href} download className="underline underline-offset-2 hover:opacity-70">{f.label}</a></span>
                      ))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Quiet extras */}
          <div className="border-t border-[#174538]/10 bg-[#FFFEF6] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#355E3B]/80">{L.optional}</p>
            <ul className="mt-2 space-y-2">
              {optional.map((o) => (
                <li key={o.key} className="text-xs leading-relaxed text-[#355E3B]">
                  <Link href={o.href} onClick={() => setPanel(null)} className="font-medium text-[#174538]/80 underline underline-offset-2 hover:opacity-70">{o.title}</Link>
                  {o.done && <span className="ml-1.5 text-[#2f8f7a]/90">{L.done}</span>}
                  <span className="block">{o.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body,
      )}

      {/* The welcome, once */}
      {mounted && welcomeOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ zIndex: 900 }}
          className={`fixed inset-0 flex items-start justify-center overflow-y-auto bg-[#174538]/80 px-5 py-10 backdrop-blur-sm sm:items-center ${fontClass}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeWelcome(); }}>
          <div className="relative w-full max-w-xl rounded-[9px] bg-white p-8 text-[#174538] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]">
            <button type="button" onClick={closeWelcome} aria-label={L.close}
              className="absolute right-3 top-3 cursor-pointer rounded-[9px] px-2.5 py-1 text-xl leading-none text-[#355E3B] hover:bg-[#174538]/10">×</button>
            <h2 id={titleId} className="pr-8 font-[family-name:var(--font-display)] text-4xl font-normal leading-tight tracking-tight">{welcome.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#355E3B]">{welcome.intro}</p>
            <p className="mt-3 flex items-start gap-2.5 text-xs leading-relaxed text-[#355E3B]">
              <span className="mt-px shrink-0 text-[#174538]"><Rocket size={15} /></span>
              <span>{welcome.guide}</span>
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[welcome.sample, welcome.upload].map((o, i) => (
                <form key={o.title} action={o.action} className="flex">
                  <button className={`flex w-full cursor-pointer flex-col rounded-[9px] border p-5 text-left transition-colors hover:bg-[#FFFEF6] ${i === 0 ? "border-[#b7dccf] bg-[#EEF9F6]" : "border-[#174538]/25 bg-white"}`}>
                    <span className="text-sm font-semibold">{o.title}</span>
                    <span className="mt-1.5 text-xs leading-relaxed text-[#355E3B]">{o.text}</span>
                  </button>
                </form>
              ))}
            </div>

            <p className="mt-4 text-xs text-[#355E3B]">
              {welcome.files}{" "}
              {welcome.fileLinks.map((f, k) => (
                <span key={f.href}>{k > 0 && " · "}<a href={f.href} download className="font-semibold text-[#174538] underline underline-offset-2 hover:opacity-70">{f.label}</a></span>
              ))}
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
