import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import { getOrgs, getCostSettings, getOrgModel, DEMO_ORG } from "@/lib/context";
import { readSettings, settingsFromConfig, model as baseModel, PRESETS, CUSTOM_PRESET, pct, vnd, METHOD_LABEL, type Params } from "@/lib/data";
import { scoreOrder, type Order, type Model, type CollectionMethod } from "@/lib/rvs";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["Accessories", "Activewear", "Dress", "Jeans", "Outerwear", "Shirt", "T-shirt", "Trousers"];
const PAYMENTS = ["COD", "Bank transfer", "E-wallet", "Credit/debit card"];

export default function ScoreOne({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Read the form; returns the order, or a list of problems. */
function readOrder(sp: Params): { order?: Order; errors: string[] } {
  const errors: string[] = [];
  const num = (k: string, lo: number, hi: number, label: string, dflt?: number) => {
    const raw = (sp[k] ?? "").replace(",", ".").trim();
    if (raw === "" && dflt !== undefined) return dflt;
    const v = Number(raw);
    if (raw === "" || !Number.isFinite(v) || v < lo || v > hi) { errors.push(`${label} harus angka ${lo}-${hi}.`); return 0; }
    return v;
  };
  const category = CATEGORIES.includes(sp.category ?? "") ? sp.category! : "";
  if (!category) errors.push("Pilih kategori.");
  const payment = PAYMENTS.includes(sp.payment ?? "") ? sp.payment! : "";
  if (!payment) errors.push("Pilih cara bayar.");
  const qty = num("qty", 1, 100, "Jumlah barang");
  const past = num("past", 0, 1000, "Order sebelumnya", 0);
  const rr = num("rr", 0, 100, "Tingkat retur pelanggan (%)", -1);
  const km = num("km", 0, 3000, "Jarak kirim (km)");
  if (past === 0 && rr > 0) errors.push("Tingkat retur pelanggan hanya bisa diisi kalau pelanggan pernah order.");
  if (errors.length) return { errors };
  return {
    errors,
    order: {
      category, payment_method: payment,
      multi_size: sp.multi === "1" ? 1 : 0, voucher_used: sp.voucher === "1" ? 1 : 0,
      quantity_of_item: Math.round(qty), past_delivered_in_data: Math.round(past),
      customer_return_rate_in_data: past > 0 && rr >= 0 ? rr / 100 : null,
      estimated_delivery_distance_km: km,
    },
  };
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgs = await getOrgs();
  const orgId = orgs.some((o) => o.id === sp.org) ? sp.org! : (orgs[0]?.id ?? DEMO_ORG);
  const custom = await getCostSettings(orgId);
  const { method, presetKey, cfg } = readSettings(sp, custom);
  const orgModel = await getOrgModel(orgId);
  const model: Model = orgModel ?? baseModel;
  const qs = `?method=${method}&preset=${presetKey}&org=${orgId}`;

  const submitted = sp.category !== undefined;
  const { order, errors } = submitted ? readOrder(sp) : { order: undefined, errors: [] as string[] };
  const r = order ? scoreOrder(cfg, model, order, method) : null;
  const other: CollectionMethod = method === "dropoff" ? "courier_pickup" : "dropoff";
  const r2 = order ? scoreOrder(cfg, model, order, other) : null;
  const w = settingsFromConfig(cfg).weights;
  const field = "rounded border bg-transparent p-1";

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-1">Cek Satu Order</h1>
      <p className="text-sm text-gray-500 mb-4">Isi data satu order, lalu ReLoop menghitung peluang retur dan rekomendasi kemasannya. Tidak ada yang disimpan.</p>

      <form action="/score" className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded border p-4 text-sm">
        <label className="flex flex-col">Kategori produk
          <select name="category" defaultValue={sp.category ?? ""} className={field} required>
            <option value="" disabled>Pilih…</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col">Cara bayar
          <select name="payment" defaultValue={sp.payment ?? ""} className={field} required>
            <option value="" disabled>Pilih…</option>
            {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col">Jumlah barang
          <input name="qty" type="number" min={1} max={100} defaultValue={sp.qty ?? "1"} className={field} required />
        </label>
        <label className="flex flex-col">Jarak kirim (km)
          <input name="km" type="number" min={0} max={3000} step="any" defaultValue={sp.km ?? "20"} className={field} required />
        </label>
        <label className="flex flex-col">Order pelanggan sebelumnya (yang terkirim)
          <input name="past" type="number" min={0} max={1000} defaultValue={sp.past ?? "0"} className={field} />
        </label>
        <label className="flex flex-col">Tingkat retur pelanggan dulu (%)
          <input name="rr" type="number" min={0} max={100} step="any" defaultValue={sp.rr ?? ""} placeholder="kosongkan kalau pelanggan baru" className={field} />
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" name="multi" value="1" defaultChecked={sp.multi === "1"} /> Beli barang yang sama dalam lebih dari satu ukuran</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="voucher" value="1" defaultChecked={sp.voucher === "1"} /> Pakai voucher</label>

        <label className="flex flex-col">Data (pengaturan &amp; model)
          <select name="org" defaultValue={orgId} className={field}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col">Tipe brand (kemasan sekali pakai)
          <select name="preset" defaultValue={presetKey} className={field}>
            {custom && <option value={CUSTOM_PRESET}>Pengaturan kami</option>}
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col">Cara kemasan kembali
          <select name="method" defaultValue={method} className={field}>
            <option value="courier_pickup">Dijemput kurir</option>
            <option value="dropoff">Drop-off (tanpa kurir)</option>
          </select>
        </label>
        <div className="flex items-end"><button className="rounded border px-4 py-1 font-semibold">Hitung rekomendasi</button></div>
      </form>

      {errors.length > 0 && (
        <ul className="rounded border border-red-600 p-3 mt-4 text-sm list-disc pl-6">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}

      {r && r2 && (
        <>
          <section className="rounded border p-4 mt-6 space-y-1">
            <p className="text-sm text-gray-500">{METHOD_LABEL[method]} · {orgModel ? "model khusus data ini" : "model bawaan (data simulasi)"}</p>
            <p className="text-3xl font-bold">{r.recommendation}</p>
            <p>Peluang retur: <b>{pct(r.predReturnProb)}</b> · RVS {r.rvs.toFixed(1)} / 100 (REUSABLE ≥ 70, REVIEW 40-69, SINGLE-USE &lt; 40)</p>
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
          </ul>
          <p className="text-sm mt-4">
            Pembanding, kalau kemasan {other === "dropoff" ? "dikembalikan tanpa kurir" : "dijemput kurir"}: RVS {r2.rvs.toFixed(1)}, <b>{r2.recommendation}</b>.
          </p>
        </>
      )}
    </>
  );
}
