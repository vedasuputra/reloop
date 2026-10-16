"use client";
import { useState } from "react";

type Msg = { role: "user" | "assistant"; text: string; source?: string };

const TXT = {
  en: {
    examples: "Example questions:",
    suggestions: [
      "Why is O000001 recommended this way?",
      "Which categories suit reusable packaging best?",
      "How much do we save by following ReLoop?",
      "What does RVS mean and how is it calculated?",
    ],
    you: "You", ai: "ReLoop Assistant",
    rules: "ReLoop (automatic answer, AI is unavailable right now)",
    checked: "ReLoop (automatic answer: the AI answer contained numbers that could not be checked)",
    thinking: "The assistant is thinking…",
    placeholder: "Ask about an order, a category, costs…",
    send: "Send",
    busyErr: "Sorry, the assistant cannot answer right now. Please try again shortly.",
    netErr: "Connection lost. Please try again shortly.",
  },
  vi: {
    examples: "Câu hỏi mẫu:",
    suggestions: [
      "Vì sao đơn O000001 được đề xuất như vậy?",
      "Danh mục nào phù hợp nhất với bao bì tái sử dụng?",
      "Theo đề xuất của ReLoop thì tiết kiệm được bao nhiêu?",
      "RVS là gì và được tính như thế nào?",
    ],
    you: "Bạn", ai: "Trợ lý ReLoop",
    rules: "ReLoop (câu trả lời tự động, AI hiện không khả dụng)",
    checked: "ReLoop (câu trả lời tự động: câu trả lời của AI có số liệu không kiểm chứng được)",
    thinking: "Trợ lý đang suy nghĩ…",
    placeholder: "Hỏi về một đơn hàng, danh mục, chi phí…",
    send: "Gửi",
    busyErr: "Xin lỗi, trợ lý hiện không thể trả lời. Vui lòng thử lại sau.",
    netErr: "Mất kết nối. Vui lòng thử lại sau.",
  },
};

export default function AssistantChat({ org, preset, method, lang }: { org: string; preset: string; method: string; lang: "en" | "vi" }) {
  const L = TXT[lang];
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
      setMsgs((m) => [...m, { role: "assistant", text: data.answer ?? data.error ?? L.busyErr, source: data.source }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: L.netErr }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 min-h-40">
        {msgs.length === 0 && (
          <div className="text-sm space-y-2">
            <p className="text-gray-500">{L.examples}</p>
            <div className="flex flex-wrap gap-2">
              {L.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded border px-2 py-1 text-left">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`rounded border p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-10" : "mr-10"}`}>
            <p className="text-xs text-gray-500 mb-1">
              {m.role === "user" ? L.you : m.source === "rules" ? L.rules : m.source === "checked" ? L.checked : L.ai}
            </p>
            {m.text}
          </div>
        ))}
        {busy && <p className="text-sm text-gray-500">{L.thinking}</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500}
          placeholder={L.placeholder} className="flex-1 rounded border bg-transparent p-2 text-sm" />
        <button disabled={busy} className="rounded border px-4 text-sm font-semibold disabled:opacity-50">{L.send}</button>
      </form>
    </div>
  );
}
