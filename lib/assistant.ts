import type { Scored } from "@/lib/data";
import type { Config, CollectionMethod } from "@/lib/rvs";
import { categoryReturnRates, type Row } from "@/lib/data";

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
Answer ONLY from the FACTS block. Never invent numbers, orders, sources or features. If the facts do not contain the answer, say so and suggest which screen of the app to open (Dashboard, Order Analysis, AI Prediction, Recommendation, Check One Order, Scenario Simulator, Sustainability Report, AI Model, Cost Settings).
Explain in plain words for a business user. Keep answers short (at most about 150 words). Answer in the language of the question (Indonesian, English or Vietnamese).
Remind the user the data is simulated only when it matters for the answer.`;

/** Template answer used when the language model is unavailable. */
export function ruleAnswer(question: string, scored: Scored[], order: Scored | null): string {
  const q = question.toLowerCase();
  const id = findOrderId(question);
  if (order) {
    const r = order.r;
    const cheaper = r.expCostReusableVnd < r.expCostSingleVnd;
    return `Order ${order.row.order_id} (${order.order.category}) gets ${r.recommendation} with RVS ${r.rvs.toFixed(1)}. ` +
      `Predicted return probability is ${pct(r.predReturnProb)} and the reusable pack comes back ${pct(r.packReturnProb)} of the time. ` +
      `Reusable is expected to cost ${vnd(r.expCostReusableVnd)} versus ${vnd(r.expCostSingleVnd)} for single-use, so it is ${cheaper ? "cheaper" : "more expensive"}. ` +
      `Cost advantage carries 55% of the score, which is why ${cheaper ? "it scores well" : "it cannot reach REUSABLE"}.`;
  }
  if (id) return `I could not find order ${id} in the selected data set. Check the order ID in Order Analysis.`;
  if (/kategori|category|danh m/.test(q)) {
    const cats = [...new Set(scored.map((s) => s.row.category))].map((c) => {
      const l = scored.filter((s) => s.row.category === c);
      return { c, rvs: l.reduce((t, s) => t + s.r.rvs, 0) / l.length, reu: l.filter((s) => s.r.recommendation === "REUSABLE").length };
    }).sort((a, b) => b.rvs - a.rvs);
    return `Categories by average RVS: ${cats.map((x) => `${x.c} ${x.rvs.toFixed(1)} (${x.reu} REUSABLE)`).join(", ")}. ` +
      `Higher RVS means reusable packaging makes more sense.`;
  }
  const count = (rec: string) => scored.filter((s) => s.r.recommendation === rec).length;
  const base = scored.reduce((t, s) => t + s.r.expCostSingleVnd, 0);
  const reloop = scored.reduce((t, s) => t + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);
  return `Out of ${scored.length} orders, ReLoop recommends REUSABLE for ${count("REUSABLE")}, REVIEW for ${count("REVIEW")} and SINGLE-USE for ${count("SINGLE-USE")}. ` +
    `Packaging would cost ${vnd(reloop)} following ReLoop versus ${vnd(base)} with single-use only. ` +
    `Ask about a specific order (for example "why is O000123 single-use?") or about categories.`;
}

/** Call Google Gemini (free tier). Returns null when there is no key or the call fails. */
export async function askGemini(question: string, facts: string, history: { role: "user" | "assistant"; text: string }[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
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
          temperature: 0.2, maxOutputTokens: 800,
          // 2.5 Flash "thinks" by default and spends output tokens on it; switch that off for short answers
          ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
      signal: AbortSignal.timeout(20000),
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
