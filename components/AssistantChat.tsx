"use client";
import { useState } from "react";

type Msg = { role: "user" | "assistant"; text: string; source?: string };

const SUGGESTIONS = [
  "Kenapa O000001 direkomendasikan seperti itu?",
  "Kategori mana yang paling cocok pakai kemasan reusable?",
  "Berapa penghematan kalau ikut rekomendasi ReLoop?",
  "What does RVS mean and how is it calculated?",
];

export default function AssistantChat({ org, preset, method }: { org: string; preset: string; method: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(question: string) {
    if (!question.trim() || busy) return;
    const history = msgs.map(({ role, text }) => ({ role, text }));
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, org, preset, method }),
      });
      const data = await res.json().catch(() => ({}));
      setMsgs((m) => [...m, { role: "assistant", text: data.answer ?? data.error ?? "Maaf, asisten sedang tidak bisa menjawab. Coba lagi sebentar.", source: data.source }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Koneksi terputus. Coba lagi sebentar." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 min-h-40">
        {msgs.length === 0 && (
          <div className="text-sm space-y-2">
            <p className="text-gray-500">Contoh pertanyaan:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded border px-2 py-1 text-left">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`rounded border p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-10" : "mr-10"}`}>
            <p className="text-xs text-gray-500 mb-1">
              {m.role === "user" ? "Kamu" : m.source === "rules" ? "ReLoop (jawaban otomatis, AI sedang tidak tersedia)" : "Asisten ReLoop"}
            </p>
            {m.text}
          </div>
        ))}
        {busy && <p className="text-sm text-gray-500">Asisten sedang berpikir…</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500}
          placeholder="Tanya tentang order, kategori, biaya…" className="flex-1 rounded border bg-transparent p-2 text-sm" />
        <button disabled={busy} className="rounded border px-4 text-sm font-semibold disabled:opacity-50">Kirim</button>
      </form>
    </div>
  );
}
