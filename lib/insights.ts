import { scoreAll, categoryReturnRates, type Row, type Scored } from "@/lib/data";
import type { Config, CollectionMethod, Model } from "@/lib/rvs";
import { askGemini, askGroq } from "@/lib/assistant";
import { KNOWLEDGE } from "@/lib/knowledge";
import type { T, Fmt } from "@/lib/i18n";

/**
 * "AI summary" boxes on the dashboard: what the results are, and why. ReLoop computes every number (and the reasons
 * behind them, from its own scoring rules) and writes them into a FACTS block; the AI only puts them into words.
 * Safeguards against made-up content:
 *  1. the prompt forbids anything outside the FACTS and KNOWLEDGE, and any new calculation,
 *  2. every number in the reply must appear in the FACTS or KNOWLEDGE (checked here, stricter than the chat assistant),
 *  3. if the AI is unavailable or fails the check, a rules-based text built from the same numbers is shown instead.
 */

export interface InsightTarget { name: string; now: string; target: string; ok: boolean }

export interface InsightInput {
  scored: Scored[]; rows: Row[]; cfg: Config; method: CollectionMethod; model: Model;
  presetName: string; modelLabel: string; targets: InsightTarget[]; t: T; f: Fmt;
}

export interface InsightText { summary: string; why: string }

export interface InsightData {
  facts: string;          // text sent to the language model
  fallback: InsightText;  // rules-based version from the same numbers
}

const methodName = (t: T, m: CollectionMethod) =>
  m === "dropoff" ? t("customer drop-off (no courier)", "khách tự gửi trả (không cần shipper)") : t("courier pickup", "shipper đến lấy");

export function buildInsight(i: InsightInput): InsightData {
  const { scored, rows, cfg, method, model, targets, t, f } = i;
  const n = Math.max(1, scored.length);
  const count = (list: Scored[], rec: string) => list.filter((s) => s.r.recommendation === rec).length;
  const avg = (list: Scored[], pick: (s: Scored) => number) => list.reduce((a, s) => a + pick(s), 0) / Math.max(1, list.length);
  const cost = (list: Scored[]) => ({
    base: list.reduce((a, s) => a + s.r.expCostSingleVnd, 0),
    reloop: list.reduce((a, s) => a + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0),
  });
  const { base, reloop } = cost(scored);
  const diff = base - reloop;
  const reusable = count(scored, "REUSABLE"), review = count(scored, "REVIEW"), single = count(scored, "SINGLE-USE");
  const lost = Math.round(scored.filter((s) => s.r.recommendation === "REUSABLE").reduce((a, s) => a + s.lostProb, 0));

  // The same orders under the other way of getting packs back, so the summary can compare without inventing anything
  const other: CollectionMethod = method === "dropoff" ? "courier_pickup" : "dropoff";
  const alt = scoreAll(rows, cfg, other, model);
  const altReusable = count(alt, "REUSABLE");
  const altCost = cost(alt);
  const altDiff = altCost.base - altCost.reloop;

  const rates = categoryReturnRates(rows);
  const cats = [...new Set(scored.map((s) => s.row.category))].sort().map((c) => {
    const list = scored.filter((s) => s.row.category === c);
    return { name: c, orders: list.length, reusable: count(list, "REUSABLE"), predicted: avg(list, (s) => s.r.predReturnProb), actual: rates.get(c)?.rate };
  });
  const byPredicted = [...cats].sort((a, b) => b.predicted - a.predicted);
  const highest = byPredicted[0], lowest = byPredicted[byPredicted.length - 1];
  const metCount = targets.filter((x) => x.ok).length;

  // Why: the drivers behind the result, straight from the scoring rules (RVS = 55% cost + 30% pack return + 15% cycles)
  const avgCost = avg(scored, (s) => s.r.scoreCost), avgPack = avg(scored, (s) => s.r.scorePackReturn), avgCycles = avg(scored, (s) => s.r.scoreCycles);
  const avgRvs = avg(scored, (s) => s.r.rvs);
  const cheaper = scored.filter((s) => s.r.expCostReusableVnd < s.r.expCostSingleVnd).length;
  const parts = [
    { key: t("cost advantage", "lợi thế chi phí"), v: avgCost },
    { key: t("chance the pack comes back", "khả năng bao bì quay về"), v: avgPack },
    { key: t("reuse cycles", "số vòng tái sử dụng"), v: avgCycles },
  ];
  const weakest = [...parts].sort((a, b) => a.v - b.v)[0];
  const pk = cfg.packaging, perUse = pk.reusable_pack_vnd.value / pk.reuse_cycles.value + pk.cleaning_per_reuse_vnd.value;
  const pickupFee = cfg.logistics.ghn_tariff_vnd.value.noi_tinh * cfg.logistics.pickup_order_share.value;

  // A difference of zero is written as "no savings", never as "0 VND saved"
  const diffPhrase = (d: number) => Math.round(d) === 0
    ? t("no savings", "không tiết kiệm")
    : `${f.vnd(Math.abs(d))} ${d >= 0 ? t("saved", "tiết kiệm") : t("more expensive", "đắt hơn")}`;
  const reusableDir = altReusable > reusable ? "higher" : altReusable < reusable ? "lower" : "unchanged";
  const reusableDirVi = altReusable > reusable ? "nhiều hơn" : altReusable < reusable ? "ít hơn" : "không đổi";

  const facts = [
    `RESULTS`,
    `Orders scored: ${f.n(scored.length)} (cancelled orders are excluded). Brand type: ${i.presetName}. Packs come back by: ${methodName(t, method)}.`,
    `Return model: ${i.modelLabel}.`,
    `Recommendations (counts of ORDERS): REUSABLE ${f.n(reusable)} (${f.pct(reusable / n)}), REVIEW ${f.n(review)} (${f.pct(review / n)}), SINGLE-USE ${f.n(single)} (${f.pct(single / n)}).`,
    `Packaging cost if every order were single-use: ${f.vnd(base)}. Following ReLoop: ${f.vnd(reloop)}. Difference: ${diffPhrase(diff)}.`,
    `Single-use packs avoided: ${f.n(reusable)}. About ${f.n(lost)} reusable packs are expected to be lost, so the net number of single-use packs avoided is ${f.n(reusable - lost)}.`,
    `Other way of getting packs back (${methodName(t, other)}): REUSABLE orders would be ${reusableDir} (${f.n(altReusable)} instead of ${f.n(reusable)}) and the difference would be ${diffPhrase(altDiff)} instead of ${diffPhrase(diff)}.`,
    highest && lowest ? `Highest predicted return probability: ${highest.name} (${f.pct(highest.predicted)}). Lowest: ${lowest.name} (${f.pct(lowest.predicted)}).` : "",
    `Per category: ${cats.map((c) => `${c.name}: ${f.n(c.orders)} orders, predicted return ${f.pct(c.predicted)}, actual return ${c.actual === undefined ? "n/a" : f.pct(c.actual)}, REUSABLE ${f.n(c.reusable)}`).join("; ")}.`,
    `Pilot targets (month 12): ${targets.map((x) => `${x.name}: now ${x.now}, target ${x.target}, ${x.ok ? "met" : "not yet"}`).join("; ")}.`,
    `CO2 impact is not estimated (no sourced emission factor). The demo data set is simulated data.`,
    ``,
    `WHY (the drivers, from ReLoop's scoring rules)`,
    `Each order gets a Reuse Viability Score (RVS) from 0 to 100: 55% cost advantage + 30% chance the pack comes back + 15% reuse cycles. 70 or more is REUSABLE, 40 to 69 is REVIEW, below 40 is SINGLE-USE. A reusable pack is never recommended when it is expected to cost more than single-use.`,
    `Average RVS of these orders: ${f.n(avgRvs, 1)}. Average part scores (0 to 100): cost advantage ${f.n(avgCost)}, chance the pack comes back ${f.n(avgPack)}, reuse cycles ${f.n(avgCycles)}. The lowest part is ${weakest.key} (${f.n(weakest.v)}).`,
    `Reusable is expected to cost less than single-use for ${f.n(cheaper)} of ${f.n(scored.length)} orders (${f.pct(cheaper / n)}).`,
    `A reusable pack costs about ${f.vnd(perUse)} per use (pack price spread over ${f.n(pk.reuse_cycles.value)} uses, plus cleaning). A single-use mailer costs ${f.vnd(pk.single_use_mailer_vnd.value)} and a box ${f.vnd(pk.single_use_box_vnd.value)}.`,
    method === "dropoff"
      ? `With customer drop-off there is no courier pickup fee, but fewer packs come back. Average chance the pack comes back: ${f.pct(avg(scored, (s) => s.r.packReturnProb))}.`
      : `With courier pickup each empty pack adds a pickup fee of about ${f.vnd(pickupFee)} per order, which usually makes reusable more expensive. Average chance the pack comes back: ${f.pct(avg(scored, (s) => s.r.packReturnProb))}.`,
    `Average predicted return probability: ${f.pct(avg(scored, (s) => s.r.predReturnProb))}. When an item is returned, the reusable pack travels back with it for free, so a higher return probability makes reusable cheaper.`,
  ].join("\n");

  const altLine = t(
    `With ${methodName(t, other)} instead, ${reusableDir === "unchanged" ? "the number of Reusable orders would stay at" : `Reusable orders would be ${reusableDir}:`} ${f.n(altReusable)}, and the difference would be ${diffPhrase(altDiff)}.`,
    `Nếu thu hồi theo hình thức ${methodName(t, other)}, số đơn Reusable sẽ ${reusableDirVi}: ${f.n(altReusable)}, và chênh lệch là ${diffPhrase(altDiff)}.`);
  const methodLine = method === "dropoff"
    ? t("With drop-off there is no courier pickup fee, but fewer packs come back.", "Khi khách tự gửi trả thì không có phí shipper lấy hàng, nhưng ít bao bì quay về hơn.")
    : t(`With courier pickup, each empty pack adds a pickup fee of about ${f.vnd(pickupFee)}, which usually makes reusable more expensive.`,
        `Khi shipper đến lấy, mỗi bao bì rỗng phát sinh phí khoảng ${f.vnd(pickupFee)}, thường khiến bao bì tái sử dụng đắt hơn.`);

  const fallback: InsightText = {
    summary: t(
      `Of ${f.n(scored.length)} orders, ReLoop recommends Reusable for ${f.n(reusable)} (${f.pct(reusable / n)}), Review for ${f.n(review)} and Single-use for ${f.n(single)}. ` +
      `Following ReLoop, packaging costs ${f.vnd(reloop)} instead of ${f.vnd(base)} (${diffPhrase(diff)}). ${altLine} ` +
      `${f.n(metCount)} of ${f.n(targets.length)} pilot targets are met with these settings.`,
      `Trong ${f.n(scored.length)} đơn, ReLoop đề xuất Reusable cho ${f.n(reusable)} đơn (${f.pct(reusable / n)}), Review cho ${f.n(review)} đơn và Single-use cho ${f.n(single)} đơn. ` +
      `Nếu theo ReLoop, chi phí bao bì là ${f.vnd(reloop)} thay vì ${f.vnd(base)} (${diffPhrase(diff)}). ${altLine} ` +
      `Với các cài đặt này, ${f.n(metCount)} trên ${f.n(targets.length)} mục tiêu thí điểm đã đạt.`),
    why: t(
      `Each order is scored from 0 to 100: 55% cost advantage, 30% chance the pack comes back, 15% reuse cycles; 70 or more is Reusable. ` +
      `On average these parts score ${f.n(avgCost)}, ${f.n(avgPack)} and ${f.n(avgCycles)}, so the average score is ${f.n(avgRvs, 1)}. ` +
      `Reusable is cheaper than single-use for ${f.n(cheaper)} of ${f.n(scored.length)} orders. ${methodLine}`,
      `Mỗi đơn được chấm từ 0 đến 100: 55% lợi thế chi phí, 30% khả năng bao bì quay về, 15% số vòng tái sử dụng; từ 70 trở lên là Reusable. ` +
      `Trung bình các phần này đạt ${f.n(avgCost)}, ${f.n(avgPack)} và ${f.n(avgCycles)}, nên điểm trung bình là ${f.n(avgRvs, 1)}. ` +
      `Bao bì tái sử dụng rẻ hơn dùng một lần ở ${f.n(cheaper)} trên ${f.n(scored.length)} đơn. ${methodLine}`),
  };
  return { facts, fallback };
}

const INSIGHT_PROMPT = `You write the two boxes under the filters on the dashboard of ReLoop AI, a B2B app that recommends reusable or single-use packaging for e-commerce orders in Vietnam. A business user reads them after choosing their filters. Box 1 says WHAT the results are. Box 2 says WHY they look like this.

RULES
1. Use ONLY the FACTS and the KNOWLEDGE. Never use outside knowledge about other companies, markets, laws or prices.
2. Every number must be copied exactly as written in the FACTS (same digits, same formatting). Never calculate, round, estimate or invent a number, and never compare two numbers unless the FACTS already say how they compare.
3. When the FACTS say "no savings", say there are no savings. Never write "0 VND" or "0 VND saved".
4. REUSABLE, REVIEW and SINGLE-USE counts are numbers of ORDERS (say "orders", not "packs"). Only "Single-use packs avoided" is a count of packs.
5. Box 1 (summary, 2 to 3 sentences): how the orders split between REUSABLE, REVIEW and SINGLE-USE, what following ReLoop costs compared with all single-use (say whether the difference is saved or more expensive), and one sentence on the "Other way of getting packs back" line in plain words (use its higher/lower/unchanged wording and its numbers; do not quote the line itself).
6. Box 2 (why, 2 to 3 sentences): explain the result using the WHY facts: the score parts and which one is lowest, how many orders have a cheaper reusable pack, and how the way packs come back (courier fee or fewer packs returned) changes the cost. Explain only how ReLoop's scoring works. Do not claim causes in the real world (customer behaviour, market, seasons) and do not predict.
7. Do not give advice or suggestions. Do not mention CO2 unless the numbers above depend on it. If the FACTS say the data is simulated, say so briefly in Box 1.
8. Plain text only: no markdown, no bullet points, no headings, no greeting. At most 55 words per box.
9. Output exactly the two boxes, separated by one line containing only ---
10. Write in the language requested in the question.

KNOWLEDGE
${KNOWLEDGE}`;

type Cached = InsightText & { source: "ai" | "rules" };
const cache = new Map<string, Cached>();

/** Every number in the reply must appear in the facts. Returns the numbers that do not. */
export function strictUnverified(answer: string, ...sources: string[]): string[] {
  const nums = (s: string) => (s.match(/\d[\d.,]*\d|\d/g) ?? []).map((tok) => {
    const clean = tok.replace(/[.,](?=\d{3}(?!\d))/g, "").replace(",", ".");
    return Number.parseFloat(clean);
  });
  const known = new Set(sources.flatMap(nums));
  return [...new Set(nums(answer))].filter((x) => !known.has(x)).map(String);
}

/** The AI's two texts if they pass the number check, otherwise the rules-based ones. AI results are cached per facts + language. */
export async function dashboardSummary(data: InsightData, lang: "en" | "vi"): Promise<Cached> {
  const key = `${lang}\n${data.facts}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const question = `Write both boxes in ${lang === "vi" ? "Vietnamese" : "English"}.`;
  const raw = (await askGemini(question, data.facts, [], INSIGHT_PROMPT)) ?? (await askGroq(question, data.facts, [], INSIGHT_PROMPT));
  const clean = raw?.replace(/[*#_`]/g, "").trim();
  const [summary, why, ...rest] = clean ? clean.split(/\n\s*-{3,}\s*\n/).map((s) => s.trim()).filter(Boolean) : [];
  const ok = !!summary && !!why && rest.length === 0 && summary.length <= 650 && why.length <= 650
    && strictUnverified(`${summary}\n${why}`, data.facts, KNOWLEDGE).length === 0;
  if (!ok) return { ...data.fallback, source: "rules" }; // not cached, so a temporary outage does not stick
  const result: Cached = { summary, why, source: "ai" };
  if (cache.size > 40) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
