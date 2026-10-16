import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import OrderPicker from "@/components/OrderPicker";
import { loadContext } from "@/lib/context";
import { model, pct, vnd, type Params } from "@/lib/data";

export default function Prediction({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, orgs, orgId, rows, scored, qs, hasCustom } = await loadContext(sp);

  const wanted = (sp.order ?? "").trim().toUpperCase();
  const s = scored.find((x) => x.row.order_id.toUpperCase() === wanted)
    ?? scored.find((x) => x.row.order_status === "Delivered") ?? scored[0];
  if (!s) return <><Nav qs={qs} email={user?.email} /><p>Belum ada order.</p></>;

  // Baseline: average simulated return rate of this category (delivered orders only)
  const delivered = scored.filter((x) => x.row.order_status === "Delivered" && x.row.was_returned !== null);
  const sameCat = delivered.filter((x) => x.row.category === s.row.category);
  const baseline = sameCat.reduce((t, x) => t + Number(x.row.was_returned), 0) / Math.max(1, sameCat.length);

  // Why: contribution of each factor to the model's log-odds
  const c = model.coefficients;
  const o = s.order;
  const factors: [string, number][] = [
    ["Beli lebih dari satu ukuran", c.multi_size * o.multi_size],
    ["Bayar COD", c.cod * (o.payment_method === "COD" ? 1 : 0)],
    ["Pakai voucher", c.voucher_used * o.voucher_used],
    ["2 barang atau lebih", c.qty_2plus * (o.quantity_of_item >= 2 ? 1 : 0)],
    ["Pernah order sebelumnya", c.has_history * (o.past_delivered_in_data > 0 ? 1 : 0)],
    ["Riwayat retur pelanggan", c.cust_rr * (o.customer_return_rate_in_data ?? 0)],
    [`Kategori ${o.category}`, c["cat_" + o.category] ?? 0],
  ];
  const auc = (model as any).metrics?.auc_model;
  const aucBase = (model as any).metrics?.auc_baseline_category_mean;

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold">AI Prediction</h1>
      <OrderPicker action="/prediction" orderId={s.row.order_id} method={method} presetKey={presetKey} orgId={orgId} />

      <section className="rounded border p-4 space-y-1">
        <p className="text-sm text-gray-500">Order {s.row.order_id}, {s.row.category}, {vnd(Number(s.row.order_value_vnd))}, {s.row.payment_method}, pelanggan {s.row.customer_id}</p>
        <p className="text-3xl font-bold">Return Probability: {pct(s.r.predReturnProb)}</p>
        <p className="text-sm">Baseline (rata-rata retur kategori {s.row.category}): {pct(baseline)}</p>
        {s.row.order_status === "Delivered" && s.row.was_returned !== null && (
          <p className="text-sm text-gray-500">Hasil di data simulasi: {Number(s.row.was_returned) === 1 ? "di-return" : "tidak di-return"}</p>
        )}
      </section>

      <h2 className="font-semibold mt-6 mb-2">Faktor yang menaikkan atau menurunkan peluang retur</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th>Faktor</th><th>Pengaruh (log-odds)</th></tr></thead>
        <tbody>
          {factors.map(([name, val]) => (
            <tr key={name} className="border-b">
              <td>{name}</td><td>{val === 0 ? "tidak berlaku" : (val > 0 ? "+" : "") + val.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mt-4">
        Model: logistic regression, dilatih di data simulasi. AUC {auc ?? "-"} dibanding baseline kategori {aucBase ?? "-"}.
        Ini membuktikan alurnya berjalan, bukan akurasi di dunia nyata; model dilatih ulang dengan data asli brand saat pilot.
      </p>
      <p className="mt-4 text-sm"><Link className="underline" href={`/recommendation${qs}&order=${s.row.order_id}`}>Lihat rekomendasi kemasan untuk order ini</Link></p>
    </>
  );
}
