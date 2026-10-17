import { loadContext } from "@/lib/context";
import type { Params } from "@/lib/data";
import { reasonText } from "@/lib/i18n";
import { instructionCode, instructionText, reviewPlan } from "@/lib/orderView";

/**
 * GET /export?org=&preset=&method=&rec=&category=&dest=&q=&target=  (category and dest take comma-separated lists)
 * CSV packing list (logged-in users only; proxy.ts checks login). One row per order with one packing instruction.
 * `target` is the management target for the Reusable share: Review orders it switches are marked "Reusable bag (switched from Review)".
 */
const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams) as Params;
  const { user, scored, method, presetKey, cfg, t, f } = await loadContext(sp);
  if (!user) return new Response(t("Please log in first.", "Vui lòng đăng nhập trước."), { status: 401 });

  const q = (sp.q ?? "").trim().toUpperCase();
  const targetRaw = (sp.target ?? "").trim();
  const plan = targetRaw && Number.isFinite(Number(targetRaw)) ? reviewPlan(scored, Number(targetRaw)) : null; // over all orders, like the Orders page
  const boxCats = cfg.packaging.box_categories.value as string[];

  const cats = (sp.category ?? "").split(",").filter(Boolean);
  const dests = (sp.dest ?? "").split(",").filter(Boolean);
  const list = scored.filter((s) =>
    (!sp.rec || s.r.recommendation === sp.rec) && (!cats.length || cats.includes(s.row.category)) && (!dests.length || dests.includes(s.row.address ?? "")) &&
    (!q || s.row.order_id.toUpperCase().includes(q) || s.row.customer_id.toUpperCase().includes(q)));
  const header = ["order_id", "customer_id", "order_date", "category", "quantity_of_item", "address",
    "distance_km", "recommendation", "packing_instruction", "rvs", "return_probability",
    "expected_cost_single_use_vnd", "expected_cost_reusable_vnd", "pack_collection_method", "reason"];
  const lines = list.map((s) => [
    s.row.order_id, s.row.customer_id, s.row.order_date, s.row.category, s.row.quantity_of_item, s.row.address,
    s.order.estimated_delivery_distance_km, s.r.recommendation,
    instructionText(t, instructionCode(s, boxCats, plan?.ids.has(s.row.order_id) ?? false)),
    s.r.rvs.toFixed(1), s.r.predReturnProb.toFixed(3),
    Math.round(s.r.expCostSingleVnd), Math.round(s.r.expCostReusableVnd), method, reasonText(t, f, s.r, method),
  ].map(esc).join(","));
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n"); // BOM so Excel shows Vietnamese text correctly
  const name = `reloop_packing_list_${presetKey}_${method}${sp.rec ? "_" + sp.rec : ""}${plan ? "_target" + Math.round(Number(targetRaw)) : ""}.csv`;
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
