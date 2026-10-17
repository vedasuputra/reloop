"use client";
import { useState } from "react";

/** Copies a text to the clipboard and says so for a moment. Does nothing (and shows nothing) if the browser blocks it. */
export default function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" aria-live="polite"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch { /* clipboard not available: leave the button as it is */ }
      }}
      className="cursor-pointer rounded-[6px] border border-[#FFFEF6]/40 px-2.5 py-1 text-xs font-semibold text-[#FFFEF6] transition-colors hover:bg-[#FFFEF6]/15">
      {ok ? done : label}
    </button>
  );
}
