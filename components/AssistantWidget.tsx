"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import AssistantChat from "@/components/AssistantChat";

/**
 * Floating "Ask AI" button in the bottom-right corner; opens a small chat box.
 * Rendered into <body> with inline position styles, so no parent element or CSS can move it.
 * variant "brand" = landing-page design (deep green, cream, 9px corners); "plain" = app pages for now.
 */
export default function AssistantWidget({ org, preset, method, lang, variant = "plain", fontClass = "" }: {
  org: string; preset: string; method: string; lang: "en" | "vi"; variant?: "plain" | "brand";
  fontClass?: string; // the page's font class: the widget lives in <body>, outside the page wrapper
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const brand = variant === "brand";
  const L = lang === "vi"
    ? { open: "Hỏi AI", title: "Trợ lý ReLoop", note: "ReLoop tính mọi con số, AI chỉ giải thích.", close: "Đóng" }
    : { open: "Ask AI", title: "ReLoop Assistant", note: "ReLoop calculates every number, AI only explains.", close: "Close" };
  const corner: CSSProperties = { position: "fixed", right: 20, bottom: 20, zIndex: 1000 };

  if (!brand) {
    return createPortal(
      <div style={corner} className="print:hidden">
        {open ? (
          <div style={{ width: "min(380px, calc(100vw - 32px))" }} className="rounded border bg-white p-3 text-black shadow dark:bg-black dark:text-white">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">{L.title}</p>
              <button onClick={() => setOpen(false)} className="text-sm underline">{L.close}</button>
            </div>
            <p className="mb-2 text-xs text-gray-500">{L.note}</p>
            <AssistantChat org={org} preset={preset} method={method} lang={lang} />
          </div>
        ) : (
          <button onClick={() => setOpen(true)} className="rounded border bg-white px-4 py-2 text-sm font-semibold text-black shadow dark:bg-black dark:text-white">
            {L.open}
          </button>
        )}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div style={corner} className={`print:hidden ${fontClass}`}>
      {open ? (
        <div style={{ width: "min(400px, calc(100vw - 40px))" }}
          className="rl-pop overflow-hidden rounded-[9px] border border-[#174538]/15 bg-white text-[#174538] shadow-[0_24px_60px_-20px_rgba(23,69,56,0.45)]">
          <div className="flex items-center justify-between bg-gradient-to-b from-[#2F594F] to-[#264840] px-5 py-4 text-[#FFFEF6]">
            <div>
              <p className="font-semibold">{L.title}</p>
              <p className="text-xs opacity-80">{L.note}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label={L.close}
              className="cursor-pointer rounded-[9px] px-2 py-1 text-lg leading-none hover:bg-[#FFFEF6]/15">×</button>
          </div>
          <div className="p-4">
            <AssistantChat org={org} preset={preset} method={method} lang={lang} variant="brand" />
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-[9px] bg-gradient-to-b from-[#2F594F] to-[#264840] px-5 py-3 text-sm font-semibold text-[#FFFEF6] shadow-[0_16px_40px_-16px_rgba(23,69,56,0.7)] transition-transform hover:-translate-y-0.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[#DFF19F]" />
          {L.open}
        </button>
      )}
      <style>{`
        @keyframes rl-pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
        .rl-pop { animation: rl-pop 0.22s ease-out both; transform-origin: bottom right; }
        @media (prefers-reduced-motion: reduce) { .rl-pop { animation: none; } }
      `}</style>
    </div>,
    document.body,
  );
}
