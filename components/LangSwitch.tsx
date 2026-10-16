"use client";
import { useRouter } from "next/navigation";

/** EN / VI toggle. Saves the choice in a cookie for a year, then reloads the server-rendered page. */
export default function LangSwitch({ lang }: { lang: "en" | "vi" }) {
  const router = useRouter();
  const set = (l: "en" | "vi") => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="flex gap-1 text-sm" aria-label="Language">
      {(["en", "vi"] as const).map((l) => (
        <button key={l} onClick={() => set(l)} aria-pressed={lang === l}
          className={`rounded border px-2 py-0.5 ${lang === l ? "font-semibold" : "opacity-60"}`}>
          {l === "en" ? "EN" : "VI"}
        </button>
      ))}
    </div>
  );
}
