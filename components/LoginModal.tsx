"use client";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { login, signup, type AuthState } from "@/app/login/actions";

const EVENT = "reloop:login";
const CLOSE_MS = 450; // box fades out (0.2s), then the backdrop (0.25s after a 0.2s head start)

/** Any button that opens the login popup. */
export function LoginTrigger({ className, children }: { className?: string; children: ReactNode }) {
  return <button type="button" className={`cursor-pointer ${className ?? ""}`} onClick={() => window.dispatchEvent(new Event(EVENT))}>{children}</button>;
}

export type LoginCopy = {
  title: string; demo: string; password: string; passwordHint: string; login: string; signup: string; close: string; note: string;
};

/**
 * Login popup for the landing page: white box on a dimmed backdrop, close button top right,
 * the disclaimer right below the box. Opens from any LoginTrigger or from ?login=1.
 * Opening fades the backdrop in, then the box; closing plays the same fade in reverse.
 */
export default function LoginModal({ copy, fontClass = "" }: { copy: LoginCopy; fontClass?: string }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, null);
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, null);
  const error = (signupPending ? null : signupState?.error) ?? (loginPending ? null : loginState?.error);
  const pending = loginPending || signupPending;

  const close = () => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => { setOpen(false); setClosing(false); timer.current = null; }, CLOSE_MS);
  };

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(EVENT, show);
    if (new URLSearchParams(window.location.search).get("login")) show();
    return () => window.removeEventListener(EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const INPUT = "mt-1.5 w-full rounded-[9px] border border-[#174538]/25 bg-white px-3.5 py-2.5 text-sm font-normal outline-none transition-colors placeholder:text-[#355E3B]/60 focus:border-[#174538]";
  const BTN = "flex-1 cursor-pointer rounded-[9px] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60";
  // Rendered into <body>: the page-transition wrapper animates `transform`, which would make this "fixed" box page-sized.
  // fontClass carries the font variables, since <body> is outside the landing page's font wrapper.
  return createPortal(
    // z-index sits below the Ask AI button (1000), so the assistant stays usable while this is open
    <div role="dialog" aria-modal="true" aria-label={copy.title} style={{ zIndex: 900 }}
      className={`rl-backdrop ${closing ? "rl-closing" : ""} fixed inset-0 flex items-start justify-center overflow-y-auto bg-[#174538]/80 px-5 py-10 backdrop-blur-sm sm:items-center ${fontClass}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="rl-modal w-full max-w-sm">
        <div className="relative rounded-[9px] bg-white p-8 text-[#174538] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]">
          <button type="button" onClick={close} aria-label={copy.close}
            className="absolute right-3 top-3 cursor-pointer rounded-[9px] px-2.5 py-1 text-xl leading-none text-[#355E3B] hover:bg-[#174538]/10">×</button>
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-normal leading-tight tracking-tight">{copy.title}</h2>
          <p className="mt-2 whitespace-nowrap text-[13px] text-[#355E3B]">{copy.demo}</p>

          {error && <p role="alert" className="mt-5 rounded-[9px] border border-[#174538]/25 bg-[#FFFDD0] px-3.5 py-2.5 text-sm">{error}</p>}

          <form className="mt-6 space-y-3">
            <label className="block text-sm font-semibold">
              Email
              <input name="email" type="email" required autoComplete="email" placeholder="demo@reloop.app" className={INPUT} />
            </label>
            <label className="block text-sm font-semibold">
              {copy.password}
              <input name="password" type="password" required autoComplete="current-password" placeholder={copy.passwordHint} className={INPUT} />
            </label>
            <div className="flex gap-3 pt-2">
              <button formAction={loginAction} disabled={pending} className={`${BTN} bg-[#174538] text-[#FFFEEA]`}>{copy.login}</button>
              <button formAction={signupAction} disabled={pending} className={`${BTN} border border-[#174538]/40`}>{copy.signup}</button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-left text-xs leading-relaxed text-white">{copy.note}</p>
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
    </div>,
    document.body,
  );
}
