import { NextResponse } from "next/server";
import { scoreOrder, type Order, type CollectionMethod } from "@/lib/rvs";
import { baseConfig, model, PRESETS, DEFAULT_PRESET } from "@/lib/data";
import { withPreset } from "@/lib/rvs";

/**
 * POST /api/score
 * Body: { "orders": [Order, ...], "method": "courier_pickup" | "dropoff", "preset": "acuan_ukuran_baju" }
 * Returns a packaging recommendation per order. Stateless: nothing is stored.
 */
const MAX_ORDERS = 1000;
const REQUIRED: (keyof Order)[] = ["category", "payment_method", "quantity_of_item", "estimated_delivery_distance_km"];

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const orders = Array.isArray(body?.orders) ? body.orders : null;
  if (!orders || orders.length === 0) return NextResponse.json({ error: 'Send "orders": [ ... ].' }, { status: 400 });
  if (orders.length > MAX_ORDERS) return NextResponse.json({ error: `At most ${MAX_ORDERS} orders per request.` }, { status: 400 });

  const method: CollectionMethod = body.method === "dropoff" ? "dropoff" : "courier_pickup";
  const preset = PRESETS.some((p) => p.key === body.preset) ? body.preset : DEFAULT_PRESET;
  const cfg = withPreset(baseConfig, preset);

  const results = [];
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i] ?? {};
    const missing = REQUIRED.filter((k) => o[k] === undefined || o[k] === null || o[k] === "");
    if (missing.length) {
      return NextResponse.json({ error: `Order ${i + 1}: ${missing.join(", ")} is required.` }, { status: 400 });
    }
    const order: Order = {
      category: String(o.category),
      payment_method: String(o.payment_method),
      multi_size: Number(o.multi_size ?? 0),
      voucher_used: Number(o.voucher_used ?? 0),
      quantity_of_item: Number(o.quantity_of_item),
      past_delivered_in_data: Number(o.past_delivered_in_data ?? 0),
      customer_return_rate_in_data:
        o.customer_return_rate_in_data === undefined || o.customer_return_rate_in_data === null
          ? null : Number(o.customer_return_rate_in_data),
      estimated_delivery_distance_km: Number(o.estimated_delivery_distance_km),
    };
    const r = scoreOrder(cfg, model, order, method);
    results.push({
      order_id: o.order_id ?? null,
      recommendation: r.recommendation,
      rvs: Math.round(r.rvs * 10) / 10,
      return_probability: Math.round(r.predReturnProb * 1000) / 1000,
      expected_cost_single_use_vnd: Math.round(r.expCostSingleVnd),
      expected_cost_reusable_vnd: Math.round(r.expCostReusableVnd),
      reason: r.reason,
    });
  }
  return NextResponse.json({ method, preset, model: "logistic_regression (simulated training data)", results });
}

export async function GET() {
  return NextResponse.json({
    usage: "POST JSON to /api/score",
    example: {
      method: "dropoff",
      preset: "acuan_ukuran_baju",
      orders: [{ order_id: "A1", category: "Dress", payment_method: "COD", multi_size: 1, voucher_used: 0,
        quantity_of_item: 1, past_delivered_in_data: 3, customer_return_rate_in_data: 0.33,
        estimated_delivery_distance_km: 12 }],
    },
    presets: PRESETS.map((p) => p.key),
  });
}
