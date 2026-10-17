import { settingsFromConfig, type Scored } from "@/lib/data";
import { scoreOrder, type CollectionMethod, type Config, type Model } from "@/lib/rvs";
import { methodLabel, reasonText, type T, type Fmt } from "@/lib/i18n";
import { factorList, instructionCode, instructionText } from "@/lib/orderView";

/**
 * Everything the order details show, calculated on the server and already formatted, so it is plain data that can travel to the
 * browser (the popup on the Orders page opens instantly from it) and the full order page can draw from the same thing.
 */
export interface OrderDetailData {
  id: string;
  fields: { label: string; value: string }[];
  rec: string;                                   // REUSABLE | REVIEW | SINGLE-USE
  instruction: string;
  rvs: number; rvsText: string;
  reason: string;
  other: { label: string; rec: string; rvsText: string };
  prob: number; probText: string;
  baseline: number; baselineText: string; baselineLabel: string;
  outcome: string | null;                        // "returned" / "not returned" when the data has it
  factors: { name: string; val: number; text: string }[];
  maxFactor: number;
  modelNote: string;
  parts: { name: string; weightText: string; score: number; scoreText: string; contribText: string }[];
  cost: { single: number; reusable: number; singleText: string; reusableText: string; scale: number; summary: string; note: string };
}

export interface OrderLabels {
  order: string; recommendation: string; recommendationSub: string; packingInstruction: string; why: string;
  gaugeSingle: string; gaugeReview: string; gaugeReusable: string;
  aiPrediction: string; chance: string; thisOrder: string; outcome: string;
  factorsTitle: string; factorsSub: string; raises: string; lowers: string;
  scoreTitle: string; scoreSub: string; weight: string; totalScore: string;
  costTitle: string; costSub: string; singleUse: string; reusable: string;
  close: string; previous: string; next: string; openPage: string;
}

export function orderLabels(t: T, methodText: string): OrderLabels {
  return {
    order: t("Order", "Đơn hàng"),
    recommendation: t("Recommendation", "Đề xuất"),
    recommendationSub: t(`What to pack this order in, and why. ${methodText}.`, `Nên đóng gói đơn này bằng gì, và vì sao. ${methodText}.`),
    packingInstruction: t("Packing instruction", "Chỉ dẫn đóng gói"), why: t("Why", "Lý do"),
    gaugeSingle: "Single-use < 40", gaugeReview: "Review 40-69", gaugeReusable: "Reusable ≥ 70",
    aiPrediction: t("AI return prediction", "Dự đoán hoàn hàng bằng AI"), chance: t("chance this order is returned", "khả năng đơn này bị hoàn"),
    thisOrder: t("This order", "Đơn này"), outcome: t("Outcome in the data", "Kết quả trong dữ liệu"),
    factorsTitle: t("Why this return probability", "Vì sao có xác suất hoàn này"),
    factorsSub: t("What raises or lowers the chance this order is returned.", "Điều gì làm tăng hoặc giảm khả năng đơn này bị hoàn."),
    raises: t("Raises the chance", "Làm tăng khả năng"), lowers: t("Lowers the chance", "Làm giảm khả năng"),
    scoreTitle: t("How the score is built", "Cách tính điểm"), scoreSub: t("Three parts, each scored from 0 to 100.", "Ba phần, mỗi phần chấm từ 0 đến 100."),
    weight: t("weight", "trọng số"), totalScore: t("Total score (RVS)", "Tổng điểm (RVS)"),
    costTitle: t("Expected packaging cost", "Chi phí bao bì dự kiến"), costSub: t("For this one order.", "Cho riêng đơn hàng này."),
    singleUse: t("Single-use", "Dùng một lần"), reusable: t("Reusable", "Tái sử dụng"),
    close: t("Close", "Đóng"), previous: t("Previous order", "Đơn trước"), next: t("Next order", "Đơn sau"), openPage: t("Open as page", "Mở thành trang"),
  };
}

/** Average of "was returned" among delivered orders, per category: the baseline each order is compared with. */
export function categoryBaselines(scored: Scored[]): Map<string, number> {
  const sums = new Map<string, { n: number; returned: number }>();
  for (const x of scored) {
    if (x.row.order_status !== "Delivered" || x.row.was_returned === null) continue;
    const c = sums.get(x.row.category) ?? { n: 0, returned: 0 };
    c.n++; c.returned += Number(x.row.was_returned);
    sums.set(x.row.category, c);
  }
  return new Map([...sums].map(([k, v]) => [k, v.returned / Math.max(1, v.n)]));
}

export function buildOrderDetail({ s, baselines, cfg, model, modelLabel, method, t, f }: {
  s: Scored; baselines: Map<string, number>; cfg: Config; model: Model; modelLabel: string; method: CollectionMethod; t: T; f: Fmt;
}): OrderDetailData {
  const r = s.r, o = s.order;
  const w = settingsFromConfig(cfg).weights;
  const other: CollectionMethod = method === "dropoff" ? "courier_pickup" : "dropoff";
  const r2 = scoreOrder(cfg, model, o, other);
  const boxCats = cfg.packaging.box_categories.value as string[];
  const baseline = baselines.get(s.row.category) ?? 0;
  const factors = factorList(model, o, t);
  const saving = r.expCostSingleVnd - r.expCostReusableVnd;
  const meta = model as Model & { trained_at?: string; metrics?: { auc_model?: number; auc_baseline_category_mean?: number } };
  const auc = meta.metrics?.auc_model, aucBase = meta.metrics?.auc_baseline_category_mean;
  const hasOutcome = s.row.order_status === "Delivered" && s.row.was_returned !== null;
  const parts = [
    { name: t("Cost advantage", "Lợi thế chi phí"), score: r.scoreCost, weight: w.cost },
    { name: t(`Chance the pack comes back (${f.pct(r.packReturnProb)})`, `Khả năng bao bì quay về (${f.pct(r.packReturnProb)})`), score: r.scorePackReturn, weight: w.pack_return },
    { name: t(`Reuse cycles (${cfg.packaging.reuse_cycles.value} times)`, `Số vòng tái sử dụng (${cfg.packaging.reuse_cycles.value} lần)`), score: r.scoreCycles, weight: w.cycles },
  ];
  return {
    id: s.row.order_id,
    fields: [
      { label: t("Category", "Danh mục"), value: s.row.category + (o.multi_size ? t(" (multi-size)", " (nhiều cỡ)") : "") },
      { label: t("Price", "Giá"), value: f.vnd(Number(s.row.order_value_vnd)) },
      { label: t("Payment", "Thanh toán"), value: String(s.row.payment_method) },
      { label: t("Customer", "Khách hàng"), value: String(s.row.customer_id) },
      { label: t("Destination", "Điểm đến"), value: String(s.row.address) },
      { label: t("Distance", "Khoảng cách"), value: `${o.estimated_delivery_distance_km} km` },
      { label: t("Date", "Ngày"), value: String(s.row.order_date) },
    ],
    rec: r.recommendation,
    instruction: instructionText(t, instructionCode(s, boxCats, false)),
    rvs: r.rvs, rvsText: f.n(r.rvs, 1),
    reason: reasonText(t, f, r, method),
    other: {
      label: other === "dropoff" ? t("Without a courier:", "Không qua shipper:")
        : t("With courier pickup:", "Shipper đến lấy:"),
      rec: r2.recommendation, rvsText: f.n(r2.rvs, 1),
    },
    prob: r.predReturnProb, probText: f.pct(r.predReturnProb),
    baseline, baselineText: f.pct(baseline), baselineLabel: t(`Average for ${s.row.category}`, `Trung bình của ${s.row.category}`),
    outcome: hasOutcome ? (Number(s.row.was_returned) === 1 ? t("returned", "đã hoàn") : t("not returned", "không hoàn")) : null,
    factors: factors.map(([name, val]) => ({ name, val, text: val === 0 ? t("n/a", "không áp dụng") : (val > 0 ? "+" : "") + f.n(val, 2) })),
    maxFactor: Math.max(0.01, ...factors.map(([, v]) => Math.abs(v))),
    modelNote:
      t("Effect in log-odds (the model's own scale). ", "Ảnh hưởng theo log-odds (thang riêng của mô hình). ") +
      `${t("Model used", "Mô hình đang dùng")}: ${modelLabel}. AUC ${auc ?? "-"} ${t("vs category baseline", "so với mốc theo danh mục")} ${aucBase ?? "-"}.` +
      (meta.trained_at
        ? t(" Measured on the newest 25% of this data set's orders, which were not used for training.", " Được đo trên 25% đơn hàng mới nhất của bộ dữ liệu này, không dùng khi huấn luyện.")
        : t(" This shows the pipeline works, not real-world accuracy. Brands can retrain it on their own data on the AI Model page.",
            " Điều này cho thấy quy trình hoạt động, chưa phải độ chính xác thực tế. Thương hiệu có thể huấn luyện lại bằng dữ liệu riêng tại trang Mô hình AI.")),
    parts: parts.map((p) => ({ name: p.name, weightText: f.pct(p.weight), score: p.score, scoreText: f.n(p.score), contribText: f.n(p.weight * p.score, 1) })),
    cost: {
      single: r.expCostSingleVnd, reusable: r.expCostReusableVnd, singleText: f.vnd(r.expCostSingleVnd), reusableText: f.vnd(r.expCostReusableVnd),
      scale: Math.max(r.expCostSingleVnd, r.expCostReusableVnd, 1),
      summary: Math.round(saving) === 0 ? t("No difference in expected cost.", "Chi phí dự kiến không chênh lệch.")
        : saving > 0 ? t(`Reusable is expected to save ${f.vnd(saving)} on this order.`, `Bao bì tái sử dụng dự kiến tiết kiệm ${f.vnd(saving)} cho đơn này.`)
        : t(`Reusable is expected to cost ${f.vnd(-saving)} more on this order.`, `Bao bì tái sử dụng dự kiến tốn thêm ${f.vnd(-saving)} cho đơn này.`),
      note: method === "dropoff"
        ? t("Reusable includes cleaning, return without a courier, and the risk of losing the pack.", "Tái sử dụng gồm vệ sinh, khách tự gửi trả không cần shipper, và rủi ro mất bao bì.")
        : t("Reusable includes cleaning, the courier pickup fee, and the risk of losing the pack.", "Tái sử dụng gồm vệ sinh, phí shipper đến lấy, và rủi ro mất bao bì."),
    },
  };
}

export { methodLabel };
