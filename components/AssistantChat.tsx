"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Markdown from "@/components/Markdown";

type Msg = { role: "user" | "assistant"; text: string; source?: string };

const TXT = {
  en: {
    examples: "Example questions:",
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

/**
 * Example questions for each screen, so the chips always match what the user is looking at.
 * Every question is one the assistant can answer from its facts and background knowledge.
 */
const RVS_Q = { en: "What does RVS mean and how is it calculated?", vi: "RVS là gì và được tính như thế nào?" };
const PAGE: Record<string, { en: string[]; vi: string[] }> = {
  "/dashboard": {
    en: ["How much do we save by following ReLoop?", "Which categories suit reusable packaging best?", "Why do some orders get REUSABLE and others SINGLE-USE?", RVS_Q.en],
    vi: ["Theo đề xuất của ReLoop thì tiết kiệm được bao nhiêu?", "Danh mục nào phù hợp nhất với bao bì tái sử dụng?", "Vì sao có đơn REUSABLE, có đơn SINGLE-USE?", RVS_Q.vi],
  },
  "/orders": {
    en: ["What do REUSABLE, REVIEW and SINGLE-USE mean?", RVS_Q.en, "How is each order's return probability predicted?", "How does the packing team use the CSV download?"],
    vi: ["REUSABLE, REVIEW và SINGLE-USE nghĩa là gì?", RVS_Q.vi, "Xác suất hoàn hàng của từng đơn được dự đoán thế nào?", "Đội đóng gói dùng tệp CSV tải về như thế nào?"],
  },
  "/simulator": {
    en: ["What does the simulator compare?", "Why does the way packs come back change the cost?", "Are the simulator results from a real pilot?", RVS_Q.en],
    vi: ["Bộ mô phỏng so sánh những gì?", "Vì sao cách thu hồi bao bì làm thay đổi chi phí?", "Kết quả mô phỏng có phải từ thí điểm thật không?", RVS_Q.vi],
  },
  "/report": {
    en: ["What does the report show?", "Why is CO2 not estimated?", "What are the EPR figures based on?", "Are these results from a real pilot?"],
    vi: ["Báo cáo này cho thấy điều gì?", "Vì sao chưa ước tính CO2?", "Các số liệu EPR dựa trên cơ sở nào?", "Các kết quả này có phải từ thí điểm thật không?"],
  },
  "/model": {
    en: ["How does the AI predict returns?", "Which factors does the model use?", "Is the built-in model accurate in the real world?", "How do I retrain the model on my own orders?"],
    vi: ["AI dự đoán hoàn hàng như thế nào?", "Mô hình dùng những yếu tố nào?", "Mô hình mặc định có chính xác ngoài thực tế không?", "Làm sao để huấn luyện lại mô hình bằng đơn hàng của tôi?"],
  },
  "/upload": {
    en: ["How many orders do I need to retrain the model?", "What happens after I upload my orders?", "How do I enter my own costs?", "Where do the demo orders come from?"],
    vi: ["Cần bao nhiêu đơn hàng để huấn luyện lại mô hình?", "Điều gì xảy ra sau khi tôi tải đơn hàng lên?", "Làm sao để nhập chi phí của riêng tôi?", "Các đơn hàng demo đến từ đâu?"],
  },
  "/settings": {
    en: ["What do the brand presets mean?", "What is a reuse cycle?", "Where do the cost numbers come from?", "How does the pack collection method change the result?"],
    vi: ["Các mẫu thương hiệu có nghĩa là gì?", "Vòng tái sử dụng là gì?", "Các con số chi phí đến từ đâu?", "Cách thu hồi bao bì ảnh hưởng đến kết quả thế nào?"],
  },
  "/integration": {
    en: ["How do I score orders through the API?", "Can I use ReLoop without the API?", "Which plan includes API integration?", "What does ReLoop need from my order system?"],
    vi: ["Làm sao để chấm điểm đơn hàng qua API?", "Tôi có thể dùng ReLoop mà không cần API không?", "Gói nào có tích hợp API?", "ReLoop cần gì từ hệ thống đơn hàng của tôi?"],
  },
  "/score": {
    en: ["What do I need to enter to score a new order?", "What does the RVS result mean?", "Why does the way packs come back matter?", "What do REUSABLE, REVIEW and SINGLE-USE mean?"],
    vi: ["Tôi cần nhập gì để chấm điểm một đơn mới?", "Kết quả RVS có nghĩa là gì?", "Vì sao cách thu hồi bao bì lại quan trọng?", "REUSABLE, REVIEW và SINGLE-USE nghĩa là gì?"],
  },
};

function suggestionsFor(path: string, lang: "en" | "vi", orderId: string | null): string[] {
  if (path === "/" || path === "/login" || path === "/privacy") return PUBLIC[lang];
  if (path === "/order" && orderId) {
    return lang === "vi"
      ? [`Vì sao đơn ${orderId} được đề xuất như vậy?`, `Những yếu tố nào làm tăng hoặc giảm xác suất hoàn hàng của đơn ${orderId}?`, `Vì sao đơn ${orderId} không phải là REUSABLE?`, RVS_Q.vi]
      : [`Why is ${orderId} recommended this way?`, `Which factors raised or lowered the return probability of ${orderId}?`, `Why is ${orderId} not REUSABLE?`, RVS_Q.en];
  }
  const page = PAGE["/" + path.split("/")[1]] ?? (path === "/order" ? PAGE["/orders"] : PAGE["/dashboard"]);
  return page[lang];
}

export default function AssistantChat({ org, preset, method, lang, variant = "plain" }: {
  org: string; preset: string; method: string; lang: "en" | "vi"; variant?: "plain" | "brand";
}) {
  const brand = variant === "brand";
  const path = usePathname();
  // The chat only renders in the browser (the widget waits until it is mounted), so reading the address here is safe
  const orderId = new URLSearchParams(window.location.search).get("order");
  const L = { ...TXT[lang], suggestions: suggestionsFor(path, lang, orderId) };
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
                  className={brand ? "cursor-pointer rounded-[9px] border border-[#174538]/20 bg-[#FFFEF6] px-3 py-1.5 text-left hover:border-[#174538]/50" : "rounded border px-2 py-1 text-left"}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={brand
            ? `rounded-[9px] p-3 text-sm ${m.role === "user" ? "whitespace-pre-wrap ml-8 bg-[#174538] text-[#FFFEF6]" : "mr-8 border border-[#174538]/15 bg-[#FFFEF6]"}`
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
          className={brand ? "cursor-pointer rounded-[9px] bg-[#174538] px-4 text-sm font-semibold text-[#FFFEF6] disabled:cursor-wait disabled:opacity-50" : "rounded border px-4 text-sm font-semibold disabled:opacity-50"}>{L.send}</button>
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
