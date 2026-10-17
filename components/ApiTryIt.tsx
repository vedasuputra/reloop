"use client";
import { useState } from "react";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, GREEN, Tag } from "@/components/ui";

export type TryItLabels = {
  request: string; response: string; send: string; sending: string; reset: string;
  empty: string; network: string; hint: string;
};

/**
 * A small playground for POST /api/score: edit the request, press Send (or Ctrl+Enter), see the real answer. The text is sent
 * exactly as typed, so a broken request shows the API's own error message (a 400) too. It calls this app's own endpoint from
 * the browser; the endpoint is public and stores nothing.
 */
export default function ApiTryIt({ initial, labels: L }: { initial: string; labels: TryItLabels }) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ status: number; ms: number; text: string } | null>(null);
  const [failed, setFailed] = useState(false);

  async function send() {
    if (busy) return;
    setBusy(true); setFailed(false);
    const t0 = performance.now();
    try {
      const r = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const raw = await r.text();
      let text = raw;
      try { text = JSON.stringify(JSON.parse(raw), null, 2); } catch { /* not JSON: show as it came */ }
      setRes({ status: r.status, ms: Math.round(performance.now() - t0), text });
    } catch {
      setFailed(true); setRes(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className={`${CARD} flex flex-col`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{L.request}</h3>
          <span className="text-xs text-[#355E3B]">POST /api/score</span>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} aria-label={L.request}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); void send(); } }}
          className="mt-3 min-h-[22rem] w-full flex-1 resize-y rounded-[9px] border border-[#174538]/25 bg-[#FFFEF6] p-3 font-mono text-xs leading-relaxed text-[#174538] outline-none transition-colors focus:border-[#174538]" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void send()} disabled={busy} className={`${BTN_PRIMARY} disabled:cursor-wait disabled:opacity-60`}>{busy ? L.sending : L.send}</button>
          <button type="button" onClick={() => { setBody(initial); setRes(null); setFailed(false); }} className={BTN_OUTLINE}>{L.reset}</button>
          <span className="text-xs text-[#355E3B]">{L.hint}</span>
        </div>
      </div>

      <div className={`flex flex-col overflow-hidden rounded-[9px] ${GREEN}`}>
        <div className="flex items-center justify-between gap-3 border-b border-[#FFFEF6]/20 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{L.response}</p>
          {res && (
            <span className="flex items-center gap-2 text-xs">
              <Tag tone={res.status >= 200 && res.status < 300 ? "ok" : "warn"}>HTTP {res.status}</Tag>
              <span className="opacity-80">{res.ms} ms</span>
            </span>
          )}
        </div>
        <pre className="min-h-[22rem] flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed" aria-live="polite">
          {failed ? L.network : res ? res.text : <span className="opacity-70">{L.empty}</span>}
        </pre>
      </div>
    </div>
  );
}
