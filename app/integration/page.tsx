import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { scoreOrder, withPreset } from "@/lib/rvs";
import { baseConfig, model, PRESETS } from "@/lib/data";

const EXAMPLE = {
  method: "dropoff",
  preset: "acuan_ukuran_baju",
  orders: [{
    order_id: "A1", category: "Dress", payment_method: "COD", multi_size: 1, voucher_used: 0,
    quantity_of_item: 1, past_delivered_in_data: 3, customer_return_rate_in_data: 0.33,
    estimated_delivery_distance_km: 12,
  }],
};

export default function Integration() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat…</p>}><Content /></Suspense>
    </main>
  );
}

async function Content() {
  await connection();
  const { data: { user } } = await (await createClient()).auth.getUser();
  const o = EXAMPLE.orders[0];
  const r = scoreOrder(withPreset(baseConfig, EXAMPLE.preset), model, o, "dropoff");
  const response = {
    method: "dropoff", preset: EXAMPLE.preset, model: "logistic_regression (simulated training data)",
    results: [{
      order_id: "A1", recommendation: r.recommendation, rvs: Math.round(r.rvs * 10) / 10,
      return_probability: Math.round(r.predReturnProb * 1000) / 1000,
      expected_cost_single_use_vnd: Math.round(r.expCostSingleVnd),
      expected_cost_reusable_vnd: Math.round(r.expCostReusableVnd), reason: r.reason,
    }],
  };
  return (
    <>
      <Nav email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">Integrasi API</h1>
      <p className="text-sm mb-4">
        Sistem order brand bisa mengirim order ke ReLoop dan langsung menerima rekomendasi kemasan, tanpa membuka dashboard.
        Endpoint ini tidak menyimpan data.
      </p>
      <h2 className="font-semibold mb-1">Request</h2>
      <pre className="overflow-x-auto rounded border p-3 text-xs">{`POST /api/score
Content-Type: application/json

${JSON.stringify(EXAMPLE, null, 2)}`}</pre>
      <h2 className="font-semibold mt-4 mb-1">Response (dihitung langsung)</h2>
      <pre className="overflow-x-auto rounded border p-3 text-xs">{JSON.stringify(response, null, 2)}</pre>
      <ul className="text-sm list-disc pl-5 mt-4">
        <li>method: <code>courier_pickup</code> atau <code>dropoff</code></li>
        <li>preset: {PRESETS.map((p) => p.key).join(", ")}</li>
        <li>Wajib per order: category, payment_method, quantity_of_item, estimated_delivery_distance_km. Maksimal 1.000 order per request.</li>
      </ul>
    </>
  );
}
