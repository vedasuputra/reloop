import type { Scored } from "@/lib/data";
import type { Model, Order, } from "@/lib/rvs";
import type { OrgInfo } from "@/lib/context";
import { presetLabel, methodLabel, type T } from "@/lib/i18n";

/** Shared by the Orders list, the order page and the CSV export. */

/* ------------------------------------------------------------------ packing instruction */

/** What the packing team does with one order. "switch" = a Review order moved to reusable to fill a management target. */
export type InstructionCode = "reusable" | "switch" | "review" | "mailer" | "box";

export function instructionCode(s: Scored, boxCategories: string[], switched: boolean): InstructionCode {
  const rec = s.r.recommendation;
  if (rec === "REUSABLE") return "reusable";
  if (rec === "REVIEW") return switched ? "switch" : "review";
  return boxCategories.includes(s.row.category) ? "box" : "mailer";
}

export function instructionText(t: T, code: InstructionCode): string {
  switch (code) {
    case "reusable": return t("Reusable bag", "Túi tái sử dụng");
    case "switch": return t("Reusable bag (switched from Review)", "Túi tái sử dụng (chuyển từ Review)");
    case "review": return t("Single-use for now, supervisor decides", "Tạm dùng một lần, giám sát quyết định");
    case "box": return t("Single-use box", "Hộp dùng một lần");
    case "mailer": return t("Single-use mailer", "Túi gói hàng dùng một lần");
  }
}

/* ------------------------------------------------------------------ review queue (management target) */

export interface ReviewPlan {
  total: number; reusable: number; reviewCount: number;
  wanted: number;       // orders that must be Reusable to reach the target
  needed: number;       // Review orders that would have to switch
  switched: number;     // how many actually switch (limited by the size of the queue)
  reachable: boolean;
  reachedShare: number; // Reusable share after switching
  extraCost: number;    // expected cost of switching those orders; positive = more expensive than single-use
  ids: Set<string>;     // order ids that switch
}

/**
 * Review orders ship single-use by default; to fill a management target for the Reusable share, the ones that cost the least
 * extra when reusable (or save the most) switch first. Returns null when no target is set.
 */
export function reviewPlan(scored: Scored[], targetPct: number | null): ReviewPlan | null {
  if (targetPct === null || !Number.isFinite(targetPct)) return null;
  const total = scored.length;
  const reusable = scored.filter((s) => s.r.recommendation === "REUSABLE").length;
  const queue = scored
    .filter((s) => s.r.recommendation === "REVIEW")
    .sort((a, b) => (a.r.expCostReusableVnd - a.r.expCostSingleVnd) - (b.r.expCostReusableVnd - b.r.expCostSingleVnd));
  const wanted = Math.ceil((total * Math.min(100, Math.max(0, targetPct))) / 100);
  const needed = Math.max(0, wanted - reusable);
  const k = Math.min(needed, queue.length);
  const picked = queue.slice(0, k);
  return {
    total, reusable, reviewCount: queue.length, wanted, needed, switched: k, reachable: needed <= queue.length,
    reachedShare: total ? (reusable + k) / total : 0,
    extraCost: picked.reduce((a, s) => a + (s.r.expCostReusableVnd - s.r.expCostSingleVnd), 0),
    ids: new Set(picked.map((s) => s.row.order_id)),
  };
}

/* ------------------------------------------------------------------ why the return probability is what it is */

/** Contribution of each factor to the order's return probability, in log-odds (positive raises it). */
export function factorList(model: Model, o: Order, t: T): [string, number][] {
  const c = model.coefficients;
  return [
    [t("Bought more than one size", "Mua nhiều hơn một cỡ"), c.multi_size * o.multi_size],
    [t("Cash on delivery (COD)", "Thanh toán khi nhận hàng (COD)"), c.cod * (o.payment_method === "COD" ? 1 : 0)],
    [t("Used a voucher", "Dùng voucher"), c.voucher_used * o.voucher_used],
    [t("2 or more items", "Từ 2 sản phẩm trở lên"), c.qty_2plus * (o.quantity_of_item >= 2 ? 1 : 0)],
    [t("Has ordered before", "Đã từng đặt hàng"), c.has_history * (o.past_delivered_in_data > 0 ? 1 : 0)],
    [t("Customer's past return rate", "Tỷ lệ hoàn trước đây của khách"), c.cust_rr * (o.customer_return_rate_in_data ?? 0)],
    [t(`Category ${o.category}`, `Danh mục ${o.category}`), c["cat_" + o.category] ?? 0],
  ];
}

/**
 * The order-specific factor that pushes the return probability up the most (voucher, COD, several sizes, customer history...),
 * or null if nothing does. The category is left out on purpose: it would be the answer for almost every row and say little.
 */
export function topFactor(model: Model, o: Order, t: T): string | null {
  const best = factorList(model, o, t)
    .filter(([name, v]) => v > 0 && !name.startsWith(t("Category", "Danh mục")))
    .sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

/* ------------------------------------------------------------------ settings shown in the pinned bar */

export function settingsItems(t: T, orgs: OrgInfo[], orgId: string, presetKey: string, method: string) {
  return [
    { label: t("Data", "Dữ liệu"), value: orgs.find((o) => o.id === orgId)?.name ?? "-" },
    { label: t("Brand type", "Loại thương hiệu"), short: t("Brand type", "Thương hiệu"), value: presetLabel(t, presetKey) },
    { label: t("Packs come back", "Thu hồi bao bì"), short: t("Packs", "Thu hồi"), value: methodLabel(t, method) },
  ];
}
