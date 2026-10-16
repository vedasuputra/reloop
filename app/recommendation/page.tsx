import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import OrderPicker from "@/components/OrderPicker";
import { loadContext } from "@/lib/context";
import { settingsFromConfig, pct, vnd, METHOD_LABEL, type Params } from "@/lib/data";
import { scoreOrder, type CollectionMethod } from "@/lib/rvs";
import { model } from "@/lib/data";

export default function Recommendation({ searchParams }: { searchParams: Promise<Params> }) {
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

  const w = settingsFromConfig(cfg).weights;
  const r = s.r;
  const other: CollectionMethod = method === "dropoff" ? "courier_pickup" : "dropoff";
  const r2 = scoreOrder(cfg, model, s.order, other);

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">Packaging Recommendation</h1>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/recommendation" hidden={{ order: s.row.order_id }} />
      <OrderPicker action="/recommendation" orderId={s.row.order_id} method={method} presetKey={presetKey} orgId={orgId} />

      <section className="rounded border p-4 space-y-1">
        <p className="text-sm text-gray-500">Order {s.row.order_id}, {s.row.category}, {METHOD_LABEL[method]}</p>
        <p className="text-3xl font-bold">{r.recommendation}</p>
        <p>RVS: {r.rvs.toFixed(1)} / 100 (REUSABLE ≥ 70, REVIEW 40-69, SINGLE-USE &lt; 40)</p>
        <p className="text-sm">Alasan: {r.reason}</p>
      </section>

      <h2 className="font-semibold mt-6 mb-2">Rincian skor</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th>Faktor</th><th>Skor (0-100)</th><th>Bobot</th><th>Sumbangan</th></tr></thead>
        <tbody>
          <tr className="border-b"><td>Keuntungan biaya</td><td>{r.scoreCost.toFixed(0)}</td><td>{pct(w.cost)}</td><td>{(w.cost * r.scoreCost).toFixed(1)}</td></tr>
          <tr className="border-b"><td>Peluang kemasan kembali ({pct(r.packReturnProb)})</td><td>{r.scorePackReturn.toFixed(0)}</td><td>{pct(w.pack_return)}</td><td>{(w.pack_return * r.scorePackReturn).toFixed(1)}</td></tr>
          <tr className="border-b"><td>Siklus pakai ({cfg.packaging.reuse_cycles.value} kali)</td><td>{r.scoreCycles.toFixed(0)}</td><td>{pct(w.cycles)}</td><td>{(w.cycles * r.scoreCycles).toFixed(1)}</td></tr>
        </tbody>
      </table>

      <h2 className="font-semibold mt-6 mb-2">Perkiraan biaya kemasan</h2>
      <ul className="text-sm list-disc pl-5">
        <li>Sekali pakai: {vnd(r.expCostSingleVnd)}</li>
        <li>Reusable: {vnd(r.expCostReusableVnd)} (termasuk cuci, {method === "dropoff" ? "pengembalian tanpa kurir" : "biaya jemput kurir"}, dan risiko kemasan hilang)</li>
        <li>Peluang retur: {pct(r.predReturnProb)}</li>
      </ul>

      <p className="text-sm mt-6">
        Pembanding, kalau kemasan {other === "dropoff" ? "dikembalikan tanpa kurir" : "dijemput kurir"}: RVS {r2.rvs.toFixed(1)}, <b>{r2.recommendation}</b>.
      </p>
      <p className="mt-4 text-sm"><Link className="underline" href={`/prediction${qs}&order=${s.row.order_id}`}>Lihat prediksi AI untuk order ini</Link></p>
    </>
  );
}
