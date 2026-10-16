import type { Scored } from "@/lib/data";
import type { Config, CollectionMethod } from "@/lib/rvs";
import { categoryReturnRates, type Row } from "@/lib/data";
import { KNOWLEDGE } from "@/lib/knowledge";
import type { T, Fmt } from "@/lib/i18n";

/**
 * AI assistant helpers. ReLoop computes every number; the language model only explains them.
 * If no API key is set, or the free quota runs out, ruleAnswer() gives a template answer from the same facts.
 */

export interface Facts {
  text: string;            // facts block sent to the language model
  order: Scored | null;    // order mentioned in the question, if any
}

const pct = (x: number) => Math.round(x * 100) + "%";
const vnd = (x: number) => Math.round(x).toLocaleString("en-US") + " VND";

export function findOrderId(q: string): string | null {
  const m = q.toUpperCase().match(/\b[A-Z]{1,3}\d{3,}\b/);
  return m ? m[0] : null;
}

function orderLine(s: Scored): string {
  const o = s.order, r = s.r;
  return [
    `Order ${s.row.order_id}: category ${o.category}${o.multi_size ? " (bought in more than one size)" : ""}, ` +
      `${o.quantity_of_item} item(s), paid by ${o.payment_method}${o.voucher_used ? ", voucher used" : ""}, ` +
      `${o.estimated_delivery_distance_km} km, customer has ${o.past_delivered_in_data} earlier delivered orders` +
      (o.customer_return_rate_in_data === null ? "" : ` with past return rate ${pct(o.customer_return_rate_in_data)}`) + ".",
    `Predicted return probability ${pct(r.predReturnProb)}. Chance the reusable pack comes back ${pct(r.packReturnProb)}.`,
    `Expected pack cost: single-use ${vnd(r.expCostSingleVnd)}, reusable ${vnd(r.expCostReusableVnd)}.`,
    `Scores (0-100): cost advantage ${r.scoreCost.toFixed(0)} (weight 55%), pack return ${r.scorePackReturn.toFixed(0)} (weight 30%), reuse cycles ${r.scoreCycles.toFixed(0)} (weight 15%).`,
    `RVS ${r.rvs.toFixed(1)} -> ${r.recommendation}.`,
  ].join(" ");
}

export function buildFacts(question: string, scored: Scored[], rows: Row[], cfg: Config,
  method: CollectionMethod, modelLabel: string, orgName: string): Facts {
  const n = scored.length;
  const count = (rec: string) => scored.filter((s) => s.r.recommendation === rec).length;
  const base = scored.reduce((t, s) => t + s.r.expCostSingleVnd, 0);
  const reloop = scored.reduce((t, s) => t + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);
  const rates = categoryReturnRates(rows);
  const cats = [...new Set(scored.map((s) => s.row.category))].sort().map((c) => {
    const l = scored.filter((s) => s.row.category === c);
    const avg = l.reduce((t, s) => t + s.r.predReturnProb, 0) / l.length;
    const rvs = l.reduce((t, s) => t + s.r.rvs, 0) / l.length;
    const h = rates.get(c);
    return `${c}: ${l.length} orders, actual return rate ${h ? pct(h.rate) : "n/a"}, predicted ${pct(avg)}, ` +
      `average RVS ${rvs.toFixed(1)}, REUSABLE ${l.filter((s) => s.r.recommendation === "REUSABLE").length}`;
  });

  const id = findOrderId(question);
  const order = id ? scored.find((s) => s.row.order_id.toUpperCase() === id) ?? null : null;

  const text = [
    `Data set: ${orgName}. Pack collection method: ${method === "dropoff" ? "drop-off by the customer (no courier)" : "courier pickup"}.`,
    `Return model: ${modelLabel}.`,
    `Settings: single-use mailer ${vnd(cfg.packaging.single_use_mailer_vnd.value)}, box ${vnd(cfg.packaging.single_use_box_vnd.value)} (Outerwear), ` +
      `reusable pack ${vnd(cfg.packaging.reusable_pack_vnd.value)} used ${cfg.packaging.reuse_cycles.value} times, cleaning ${vnd(cfg.packaging.cleaning_per_reuse_vnd.value)} per use.`,
    `RVS v2 = 0.55 x cost advantage + 0.30 x pack return chance + 0.15 x reuse cycles. >=70 REUSABLE, 40-69 REVIEW, <40 SINGLE-USE. Never REUSABLE when reusable costs more than single-use.`,
    `Totals: ${n} orders scored; REUSABLE ${count("REUSABLE")}, REVIEW ${count("REVIEW")}, SINGLE-USE ${count("SINGLE-USE")}.`,
    `Pack cost if all single-use ${vnd(base)}; following ReLoop ${vnd(reloop)}; difference ${vnd(base - reloop)}.`,
    `Per category: ${cats.join("; ")}.`,
    id ? (order ? orderLine(order) : `Order ${id} was not found in this data set.`) : "",
    `CO2 impact is not estimated (no sourced emission factor). All demo orders are simulated data.`,
  ].filter(Boolean).join("\n");
  return { text, order };
}

export const SYSTEM_PROMPT = `You are the ReLoop AI assistant inside a B2B app that recommends reusable or single-use packaging for e-commerce orders in Vietnam.

RULES
1. Use ONLY the KNOWLEDGE below and the FACTS sent with each question. Never use outside knowledge about other companies, markets, laws or prices.
2. Every number in your answer must appear in the FACTS or KNOWLEDGE. Copy numbers exactly; do not round them into new numbers, do not estimate, do not calculate new totals.
3. If the answer is not in the FACTS or KNOWLEDGE, say plainly that ReLoop does not have that information, and point to the screen of the app where the user can look or enter it. Screen names: Dashboard, Orders (order detail page), Score a new order, Simulator, Report, AI Model, and under Settings: Upload data, Cost settings, API integration (in Vietnamese: Tổng quan, Đơn hàng, Chấm điểm đơn mới, Mô phỏng, Báo cáo, Mô hình AI, Cài đặt: Tải dữ liệu lên, Cài đặt chi phí, Tích hợp API).
4. Never change, guess or "improve" a recommendation or score. ReLoop's numbers are final; you only explain them.
5. Only discuss ReLoop, its data, packaging, returns and the app. Politely decline other topics.
6. Keep answers short (at most about 150 words), plain words for a business user, in the language of the question (Indonesian, English or Vietnamese).
7. Mention that data is simulated or that CO2/EPR is not estimated whenever the answer depends on it.
8. For greetings or small talk, reply in one or two sentences and suggest what the user can ask; do not list statistics unless asked.

KNOWLEDGE
${KNOWLEDGE}`;

/** Template answer used when the language model is unavailable, in the app's language. */
export function ruleAnswer(question: string, scored: Scored[], order: Scored | null, t: T, f: Fmt): string {
  const q = question.toLowerCase();
  const id = findOrderId(question);
  if (order) {
    const r = order.r;
    const cheaper = r.expCostReusableVnd < r.expCostSingleVnd;
    return t(
      `Order ${order.row.order_id} (${order.order.category}) gets ${r.recommendation} with RVS ${f.n(r.rvs, 1)}. ` +
      `Predicted return probability is ${f.pct(r.predReturnProb)} and the reusable pack comes back ${f.pct(r.packReturnProb)} of the time. ` +
      `Reusable is expected to cost ${f.vnd(r.expCostReusableVnd)} versus ${f.vnd(r.expCostSingleVnd)} for single-use, so it is ${cheaper ? "cheaper" : "more expensive"}. ` +
      `Cost advantage carries 55% of the score, which is why ${cheaper ? "it scores well" : "it cannot reach REUSABLE"}.`,
      `Đơn ${order.row.order_id} (${order.order.category}) được đề xuất ${r.recommendation} với RVS ${f.n(r.rvs, 1)}. ` +
      `Xác suất hoàn hàng dự đoán là ${f.pct(r.predReturnProb)} và túi tái sử dụng quay về trong ${f.pct(r.packReturnProb)} trường hợp. ` +
      `Chi phí dự kiến của bao bì tái sử dụng là ${f.vnd(r.expCostReusableVnd)}, so với ${f.vnd(r.expCostSingleVnd)} cho bao bì dùng một lần, tức là ${cheaper ? "rẻ hơn" : "đắt hơn"}. ` +
      `Lợi thế chi phí chiếm 55% số điểm, nên ${cheaper ? "đơn này đạt điểm tốt" : "đơn này không thể đạt REUSABLE"}.`);
  }
  if (id) return t(`I could not find order ${id} in the selected data set. Check the order ID in Order Analysis.`,
                   `Không tìm thấy đơn ${id} trong bộ dữ liệu đang chọn. Hãy kiểm tra mã đơn ở trang Phân tích đơn hàng.`);
  if (/kategori|category|danh m/.test(q)) {
    const cats = [...new Set(scored.map((s) => s.row.category))].map((c) => {
      const l = scored.filter((s) => s.row.category === c);
      return { c, rvs: l.reduce((a, s) => a + s.r.rvs, 0) / l.length, reu: l.filter((s) => s.r.recommendation === "REUSABLE").length };
    }).sort((a, b) => b.rvs - a.rvs);
    const list = cats.map((x) => `${x.c} ${f.n(x.rvs, 1)} (${x.reu} REUSABLE)`).join(", ");
    return t(`Categories by average RVS: ${list}. Higher RVS means reusable packaging makes more sense.`,
             `Danh mục theo RVS trung bình: ${list}. RVS càng cao thì bao bì tái sử dụng càng hợp lý.`);
  }
  const count = (rec: string) => scored.filter((s) => s.r.recommendation === rec).length;
  const base = scored.reduce((a, s) => a + s.r.expCostSingleVnd, 0);
  const reloop = scored.reduce((a, s) => a + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);
  return t(
    `Out of ${f.n(scored.length)} orders, ReLoop recommends REUSABLE for ${f.n(count("REUSABLE"))}, REVIEW for ${f.n(count("REVIEW"))} and SINGLE-USE for ${f.n(count("SINGLE-USE"))}. ` +
    `Packaging would cost ${f.vnd(reloop)} following ReLoop versus ${f.vnd(base)} with single-use only. ` +
    `Ask about a specific order (for example "why is O000123 single-use?") or about categories.`,
    `Trong ${f.n(scored.length)} đơn, ReLoop đề xuất REUSABLE cho ${f.n(count("REUSABLE"))} đơn, REVIEW cho ${f.n(count("REVIEW"))} đơn và SINGLE-USE cho ${f.n(count("SINGLE-USE"))} đơn. ` +
    `Chi phí bao bì là ${f.vnd(reloop)} nếu theo ReLoop, so với ${f.vnd(base)} nếu chỉ dùng bao bì dùng một lần. ` +
    `Hãy hỏi về một đơn cụ thể (ví dụ "vì sao O000123 là single-use?") hoặc về các danh mục.`);
}

/** Call Google Gemini (free tier). Returns null when there is no key or the call fails. */
export async function askGemini(question: string, facts: string, history: { role: "user" | "assistant"; text: string }[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const contents = [
    ...history.slice(-6).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text.slice(0, 2000) }] })),
    { role: "user", parts: [{ text: `FACTS:\n${facts}\n\nQUESTION: ${question}` }] },
  ];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.2, maxOutputTokens: 2048, // room for the model's internal reasoning plus a short answer
          // 2.5 Flash "thinks" by default and spends output tokens on it; switch that off for short answers
          ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          // Gemini 3.x: keep reasoning short so answers come back in a few seconds
          ...(model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
        },
      }),
      signal: AbortSignal.timeout(40000),
    });
    if (!res.ok) {
      console.error("Gemini error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
    return text || null;
  } catch (e) {
    console.error("Gemini call failed", e);
    return null;
  }
}

/** Call Groq (free tier, OpenAI-style API, very fast). Returns null when there is no key or the call fails. */
export async function askGroq(question: string, facts: string, history: { role: "user" | "assistant"; text: string }[]): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, temperature: 0.2, max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-6).map((m) => ({ role: m.role, content: m.text.slice(0, 2000) })),
          { role: "user", content: `FACTS:\n${facts}\n\nQUESTION: ${question}` },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.error("Groq error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    return (data?.choices?.[0]?.message?.content ?? "").trim() || null;
  } catch (e) {
    console.error("Groq call failed", e);
    return null;
  }
}

/** Groq first (if its key is set), then Gemini, else null (the route falls back to rule answers). */
export async function askAI(question: string, facts: string, history: { role: "user" | "assistant"; text: string }[]) {
  return (await askGroq(question, facts, history)) ?? (await askGemini(question, facts, history));
}

/**
 * Hallucination check: numbers in the AI answer that do not appear in the facts, knowledge or question.
 * Small numbers (0-10) are ignored because they are usually counts or list steps.
 */
export function unverifiedNumbers(answer: string, ...sources: string[]): string[] {
  const norm = (t: string) => t.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
  const nums = (t: string) => (norm(t).match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  const known = new Set<number>();
  for (const src of sources) for (const n of nums(src)) {
    known.add(n); known.add(Math.round(n)); known.add(Math.round(n * 10) / 10); known.add(Math.round(n * 100));
  }
  return [...new Set(nums(answer))].filter((n) => n > 10 && !known.has(n) && !known.has(Math.round(n * 10) / 10)).map(String);
}
