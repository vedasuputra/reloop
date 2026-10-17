"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Inter, EB_Garamond } from "next/font/google";
import { logout } from "@/app/login/actions";

const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body" });
const display = EB_Garamond({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-display" });

type Lang = "en" | "vi";
export type StatusText = { title: string; body: string; tips?: string[] };

const SHARED = {
  en: { retry: "Try again", home: "Dashboard", logout: "Log out", login: "Log in", code: "Error code" },
  vi: { retry: "Thử lại", home: "Tổng quan", logout: "Đăng xuất", login: "Đăng nhập", code: "Mã lỗi" },
};

/**
 * The language and the login state both live in cookies, so they are read from the browser (the server render shows English,
 * signed out). Changing the language fires an event so the page redraws at once.
 */
const CHANGE = "reloop:lang";
const subscribe = (cb: () => void) => { window.addEventListener(CHANGE, cb); return () => window.removeEventListener(CHANGE, cb); };
const readLang = (): Lang => (document.cookie.includes("lang=vi") ? "vi" : "en");
const readSignedIn = () => /(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie);
const noSubscribe = () => () => {};
function saveLang(l: Lang) {
  document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(CHANGE));
}

/**
 * The page shown instead of a crash (error) or an unknown address (404): logo and language switch above a small card with a
 * title, one explanation, and buttons of the same width. The third button follows the login state: Log out when signed in
 * (it ends the session and goes to the landing page), Log in when not.
 */
export default function StatusPage({ text, onRetry, digest }: { text: Record<Lang, StatusText>; onRetry?: () => void; digest?: string }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as const);
  const signedIn = useSyncExternalStore(noSubscribe, readSignedIn, () => false);
  const L = { ...SHARED[lang], ...text[lang] };
  const BTN = "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-[9px] px-4 text-sm font-semibold transition-opacity hover:opacity-85";
  const OUTLINE = `${BTN} border border-[#174538]/40 bg-white`;
  return (
    <main className={`${body.variable} ${display.variable} flex min-h-screen w-full flex-col items-center justify-center bg-[#FFFEF6] px-6 py-16 font-[family-name:var(--font-body)] text-[#174538]`}>
      <div className="w-full max-w-md">
        {/* Logo on the left, the language switch on the right (so a Vietnamese reader can tell what this page is), both level with the box */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-lg font-semibold uppercase tracking-[0.12em]">ReLoop AI</p>
          <div className="flex gap-2 text-sm" aria-label="Language">
            {(["en", "vi"] as const).map((l) => (
              <button key={l} type="button" onClick={() => { if (l !== lang) saveLang(l); }} aria-pressed={lang === l}
                className={`cursor-pointer rounded-[9px] border px-3 py-1.5 leading-5 transition-colors ${lang === l ? "border-[#174538] font-semibold" : "border-[#174538]/30 opacity-60 hover:bg-[#174538]/10 hover:opacity-100"}`}>
                {l === "en" ? "EN" : "VN"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-[9px] border border-[#174538]/15 bg-white">
          <div className="bg-gradient-to-b from-[#2F594F] to-[#264840] px-5 py-4 text-[#FFFEF6]">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-normal tracking-tight">{L.title}</h1>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed">{L.body}</p>
            {L.tips && <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#355E3B]">{L.tips.map((x) => <li key={x}>{x}</li>)}</ul>}
            <div className={`grid gap-3 ${onRetry ? "grid-cols-3" : "grid-cols-2"}`}>
              {onRetry && <button onClick={onRetry} className={`${BTN} bg-[#174538] text-[#FFFEF6]`}>{L.retry}</button>}
              <Link href="/dashboard" className={onRetry ? OUTLINE : `${BTN} bg-[#174538] text-[#FFFEF6]`}>{L.home}</Link>
              {signedIn
                ? <form action={logout} className="contents"><button className={OUTLINE}>{L.logout}</button></form>
                : <Link href="/?login=1" className={OUTLINE}>{L.login}</Link>}
            </div>
            {digest && <p className="text-xs text-[#355E3B]">{L.code}: {digest}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
