"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

const CLOSE_MS = 450; // the box fades out first, then the backdrop (same timing as the login popup)

/**
 * A big centered popup, built like the login popup: a dimmed backdrop fades in first, then the box; closing plays the same
 * fade in reverse. Escape, a click outside, or the close button start the closing; `onClosed` is called when it has finished.
 * `requestClose` (a counter) lets the parent start the closing too. `scrollKey` scrolls the popup back to the top when it changes.
 */
export default function Modal({ onClosed, requestClose = 0, scrollKey, header, closeLabel, ariaLabel, children }: {
  onClosed: () => void; requestClose?: number; scrollKey?: string; header?: ReactNode; closeLabel: string; ariaLabel: string; children: ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onClosedRef = useRef(onClosed);
  useEffect(() => { onClosedRef.current = onClosed; });
  const body = useRef<HTMLDivElement>(null);

  const close = () => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => { timer.current = null; onClosedRef.current(); }, CLOSE_MS);
  };

  useEffect(() => { if (requestClose > 0) close(); }, [requestClose]);

  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [scrollKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    };
  }, []);

  return (
    // z-index sits below the Ask AI button (1000), so the assistant stays usable while this is open
    <div role="dialog" aria-modal="true" aria-label={ariaLabel} style={{ zIndex: 900 }}
      className={`rl-backdrop ${closing ? "rl-closing" : ""} fixed inset-0 flex overflow-hidden bg-[#174538]/80 px-3 py-4 backdrop-blur-sm sm:px-6 sm:py-10`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="rl-modal mx-auto flex max-h-full min-h-0 w-full max-w-5xl flex-col rounded-[12px] bg-[#FFFEF6] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-t-[12px] border-b border-[#174538]/10 bg-[#FFFEF6] px-5 py-3 sm:px-8">
          <div className="min-w-0 flex-1">{header}</div>
          <button type="button" onClick={close} aria-label={closeLabel}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-[#174538]/25 bg-white text-[#174538] transition-colors hover:bg-[#FFFEF6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M2 2l10 10M12 2L2 12" /></svg>
          </button>
        </div>
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-b-[12px] px-5 pb-8 sm:px-8">{children}</div>
      </div>
      <style>{`
        @keyframes rl-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rl-fade-out { from { opacity: 1; } to { opacity: 0; } }
        .rl-backdrop { animation: rl-fade 0.25s ease-out both; }
        .rl-modal { animation: rl-fade 0.3s ease-out 0.2s both; }
        .rl-backdrop.rl-closing { animation: rl-fade-out 0.25s ease-in 0.2s both; }
        .rl-backdrop.rl-closing .rl-modal { animation: rl-fade-out 0.2s ease-in both; }
        @media (prefers-reduced-motion: reduce) { .rl-backdrop, .rl-modal, .rl-backdrop.rl-closing, .rl-backdrop.rl-closing .rl-modal { animation: none; } }
      `}</style>
    </div>
  );
}
