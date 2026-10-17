"use client";
import { useEffect, useState } from "react";
import Markdown from "@/components/Markdown";

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
    thinking: "The assistant is thinking",
    placeholder: "Ask a question…",
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
    thinking: "Trợ lý đang suy nghĩ",
    placeholder: "Đặt câu hỏi…",
    send: "Gửi",
    busyErr: "Xin lỗi, trợ lý hiện không thể trả lời. Vui lòng thử lại sau.",
    netErr: "Mất kết nối. Vui lòng thử lại sau.",
  },
};

const PUBLIC = {
  en: ["What does ReLoop AI do?", "Why only REUSABLE with drop-off?", "How is the RVS calculated?", "Why can't I log in?"],
  vi: ["ReLoop AI làm gì?", "Vì sao chỉ REUSABLE khi tự gửi trả?", "RVS được tính như thế nào?", "Vì sao tôi không đăng nhập được?"],
};

export default function AssistantChat({ org, preset, method, lang, variant = "plain" }: {
  org: string; preset: string; method: string; lang: "en" | "vi"; variant?: "plain" | "brand";
}) {
  const brand = variant === "brand";
  // On the landing page (no data set chosen) suggest general questions
  const L = { ...TXT[lang], suggestions: org ? TXT[lang].suggestions : PUBLIC[lang] };
  const [msgs, setMsgs] = useState<Msg[]>([]);
  // Keep the conversation while the user moves between pages (this browser tab only)
  useEffect(() => {
    try { const saved = sessionStorage.getItem("reloop-chat"); if (saved) setMsgs(JSON.parse(saved)); } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("reloop-chat", JSON.stringify(msgs.slice(-20))); } catch {}
  }, [msgs]);
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
      <div className={`space-y-3 overflow-y-auto ${brand ? "max-h-[50vh] min-h-32" : "min-h-40 max-h-[55vh]"}`}>
        {msgs.length === 0 && (
          <div className="text-sm space-y-2">
            <p className="text-gray-500">{L.examples}</p>
            <div className="flex flex-col items-start gap-2">
              {L.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className={brand ? "cursor-pointer rounded-[9px] border border-[#174538]/20 bg-gradient-to-b from-[#FFFEF2] to-[#FFFEEA] px-3 py-1.5 text-left hover:border-[#174538]/50" : "rounded border px-2 py-1 text-left"}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={brand
            ? `rounded-[9px] p-3 text-sm ${m.role === "user" ? "whitespace-pre-wrap ml-8 bg-[#174538] text-[#FFFEEA]" : "mr-8 border border-[#174538]/15 bg-gradient-to-b from-[#FFFEF2] to-[#FFFEEA]"}`
            : `rounded border p-3 text-sm ${m.role === "user" ? "whitespace-pre-wrap ml-6" : "mr-6"}`}>
            <p className={`mb-1 text-xs ${brand ? "opacity-70" : "text-gray-500"}`}>
              {m.role === "user" ? L.you : m.source === "rules" ? L.rules : m.source === "checked" ? L.checked : L.ai}
            </p>
            {m.role === "assistant" ? <Markdown text={m.text} /> : m.text}
          </div>
        ))}
        {busy && <p className={`text-sm ${brand ? "opacity-70" : "text-gray-500"}`}><Dots text={L.thinking} /></p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500}
          placeholder={L.placeholder}
          className={brand ? "flex-1 rounded-[9px] border border-[#174538]/25 bg-white px-3 py-2 text-sm outline-none focus:border-[#174538]" : "flex-1 rounded border bg-transparent p-2 text-sm"} />
        <button disabled={busy}
          className={brand ? "cursor-pointer rounded-[9px] bg-[#174538] px-4 text-sm font-semibold text-[#FFFEEA] disabled:cursor-wait disabled:opacity-50" : "rounded border px-4 text-sm font-semibold disabled:opacity-50"}>{L.send}</button>
      </form>
    </div>
  );
}

/** "Thinking." → ".." → "..." while waiting for the answer. */
function Dots({ text }: { text: string }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x % 3) + 1), 450);
    return () => clearInterval(id);
  }, []);
  return <span>{text}<span className="inline-block w-4 text-left">{".".repeat(n)}</span></span>;
}
