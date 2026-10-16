import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import { loadContext } from "@/lib/context";
import { vnd, pct, categoryReturnRates, type Params } from "@/lib/data";

const PAGE_SIZE = 50;

export default function Orders({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-6xl p-6">
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

  const category = sp.category ?? "";
  const rec = sp.rec ?? "";
  const q = (sp.q ?? "").trim().toUpperCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const filtered = scored.filter((s) =>
    (!category || s.row.category === category) &&
    (!rec || s.r.recommendation === rec) &&
    (!q || s.row.order_id.toUpperCase().includes(q) || s.row.customer_id.toUpperCase().includes(q)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const cats = [...new Set(scored.map((s) => s.row.category))].sort();
  const base = qs;
  const catRates = categoryReturnRates(rows);
  const filterQs = `${base}&category=${category}&rec=${rec}&q=${encodeURIComponent(q)}`;

  return (
    <>
      <Nav qs={base} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">Order Analysis</h1>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/orders" hidden={{ category, rec, q }} />

      <form action="/orders" className="flex flex-wrap items-end gap-3 my-4 text-sm">
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="preset" value={presetKey} />
        <input type="hidden" name="org" value={orgId} />
        <label className="flex flex-col">Cari order / pelanggan
          <input name="q" defaultValue={q} placeholder="O000123 atau C01235" className="rounded border bg-transparent p-1" />
        </label>
        <label className="flex flex-col">Kategori
          <select name="category" defaultValue={category} className="rounded border bg-transparent p-1">
            <option value="">Semua</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col">Rekomendasi
          <select name="rec" defaultValue={rec} className="rounded border bg-transparent p-1">
            <option value="">Semua</option>
            <option>REUSABLE</option><option>REVIEW</option><option>SINGLE-USE</option>
          </select>
        </label>
        <button className="rounded border px-3 py-1">Filter</button>
      </form>

      <p className="text-sm mb-2">
        <a className="underline" href={`/export${base}&category=${category}&rec=${rec}`}>Download CSV untuk tim packing ({filtered.length.toLocaleString("id-ID")} order sesuai filter)</a>
      </p>
      <p className="text-sm text-gray-500 mb-2">{filtered.length.toLocaleString("id-ID")} order, halaman {page} dari {pages}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th>Order</th><th>Tanggal</th><th>Kategori</th><th>Nilai</th><th>Bayar</th>
            <th>Riwayat pelanggan</th><th>Retur kategori (riwayat)</th><th>Tujuan</th><th>Peluang retur</th><th>RVS</th><th>Rekomendasi</th>
          </tr></thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.row.id} className="border-b">
                <td><Link className="underline" href={`/recommendation${base}&order=${s.row.order_id}`}>{s.row.order_id}</Link></td>
                <td>{s.row.order_date}</td>
                <td>{s.row.category}{s.order.multi_size ? " (multi-size)" : ""}</td>
                <td>{vnd(Number(s.row.order_value_vnd))}</td>
                <td>{s.row.payment_method}</td>
                <td>{s.order.past_delivered_in_data} order, retur {s.order.customer_return_rate_in_data === null ? "-" : pct(s.order.customer_return_rate_in_data)}</td>
                <td>{catRates.has(s.row.category) ? `${pct(catRates.get(s.row.category)!.rate)} dari ${catRates.get(s.row.category)!.n}` : "-"}</td>
                <td>{s.row.address}, {s.order.estimated_delivery_distance_km} km</td>
                <td><Link className="underline" href={`/prediction${base}&order=${s.row.order_id}`}>{pct(s.r.predReturnProb)}</Link></td>
                <td>{s.r.rvs.toFixed(1)}</td>
                <td>{s.r.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 mt-3 text-sm">
        {page > 1 && <Link className="underline" href={`/orders${filterQs}&page=${page - 1}`}>Sebelumnya</Link>}
        {page < pages && <Link className="underline" href={`/orders${filterQs}&page=${page + 1}`}>Berikutnya</Link>}
      </div>
    </>
  );
}
