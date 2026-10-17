"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

function saveLang(l: "en" | "vi") {
  document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
}

/** EN / VN toggle. Saves the choice in a cookie for a year, then reloads the server-rendered page. */
export default function LangSwitch({ lang, size = "sm", tone = "light" }: { lang: "en" | "vi"; size?: "sm" | "lg"; tone?: "light" | "dark" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Show the "Loading…" box while the page is re-rendered in the new language
  useEffect(() => {
    window.dispatchEvent(new Event(pending ? "reloop:loading" : "reloop:loaded"));
  }, [pending]);

  const set = (l: "en" | "vi") => {
    if (l === lang) return;
    saveLang(l);
    startTransition(() => router.refresh());
  };
  const box = size === "lg" ? "rounded-[9px] px-4 py-2.5 leading-5" : "rounded px-2 py-0.5";
  return (
    <div className={`flex text-sm ${size === "lg" ? "gap-3" : "gap-1"}`} aria-label="Language">
      {(["en", "vi"] as const).map((l) => (
        <button key={l} type="button" onClick={() => set(l)} aria-pressed={lang === l} disabled={pending}
          style={{ cursor: pending ? "wait" : lang === l ? "default" : "pointer" }}
          className={`${box} border transition-colors ${
            lang === l ? "font-semibold" : `opacity-60 hover:opacity-100 ${tone === "dark" ? "hover:bg-[#FFFEF6]/15" : "hover:bg-[#174538]/10"}`}`}>
          {l === "en" ? "EN" : "VN"}
        </button>
      ))}
    </div>
  );
}
