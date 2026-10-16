import { loadContext } from "@/lib/context";
import type { Params } from "@/lib/data";
import { reasonText } from "@/lib/i18n";

/**
 * GET /export?org=&preset=&method=&rec=&category=
 * CSV of packaging recommendations for the packing team (logged-in users only; proxy.ts checks login).
 */
const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams) as Params;
  const { user, scored, method, presetKey, t, f } = await loadContext(sp);
  if (!user) return new Response(t("Please log in first.", "Vui lòng đăng nhập trước."), { status: 401 });

  const list = scored.filter((s) =>
    (!sp.rec || s.r.recommendation === sp.rec) && (!sp.category || s.row.category === sp.category));
  const header = ["order_id", "customer_id", "order_date", "category", "quantity_of_item", "address",
    "distance_km", "recommendation", "rvs", "return_probability",
    "expected_cost_single_use_vnd", "expected_cost_reusable_vnd", "pack_collection_method", "reason"];
  const lines = list.map((s) => [
    s.row.order_id, s.row.customer_id, s.row.order_date, s.row.category, s.row.quantity_of_item, s.row.address,
    s.order.estimated_delivery_distance_km, s.r.recommendation, s.r.rvs.toFixed(1), s.r.predReturnProb.toFixed(3),
    Math.round(s.r.expCostSingleVnd), Math.round(s.r.expCostReusableVnd), method, reasonText(t, f, s.r, method),
  ].map(esc).join(","));
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n"); // BOM so Excel shows Vietnamese text correctly
  const name = `reloop_rekomendasi_${presetKey}_${method}${sp.rec ? "_" + sp.rec : ""}.csv`;
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
