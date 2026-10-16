"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import AssistantChat from "@/components/AssistantChat";

/**
 * Floating "Ask AI" button in the bottom-right corner of every app page; opens a small chat box.
 * Rendered into <body> with inline position styles, so no parent element or CSS can move it.
 */
export default function AssistantWidget({ org, preset, method, lang }: { org: string; preset: string; method: string; lang: "en" | "vi" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const L = lang === "vi"
    ? { open: "Hỏi AI", title: "Trợ lý ReLoop", note: "Mọi con số do ReLoop tính; AI chỉ giải thích.", close: "Đóng" }
    : { open: "Ask AI", title: "ReLoop Assistant", note: "ReLoop calculates every number; the AI only explains them.", close: "Close" };
  const corner: CSSProperties = { position: "fixed", right: 16, bottom: 16, zIndex: 1000 };

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
