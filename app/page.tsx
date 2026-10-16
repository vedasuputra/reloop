import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import { loadContext } from "@/lib/context";
import { vnd, pct, METHOD_LABEL, categoryReturnRates, type Params } from "@/lib/data";

export default function Dashboard({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, orgs, orgId, rows, scored, qs, hasCustom, modelLabel } = await loadContext(sp);

  const count = (rec: string) => scored.filter((s) => s.r.recommendation === rec).length;
  const reusable = scored.filter((s) => s.r.recommendation === "REUSABLE");
  const base = scored.reduce((t, s) => t + s.r.expCostSingleVnd, 0);
  const withReloop = scored.reduce(
    (t, s) => t + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);
  const lost = reusable.reduce((t, s) => t + s.lostProb, 0);

  const cats = [...new Set(scored.map((s) => s.row.category))].sort();
  const catRates = categoryReturnRates(rows);

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">Dashboard</h1>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/" />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        <Stat label="Order dinilai" value={scored.length.toLocaleString("id-ID")} note={`${rows.length} order, tanpa Cancelled`} />
        <Stat label="REUSABLE" value={count("REUSABLE").toLocaleString("id-ID")} />
        <Stat label="REVIEW" value={count("REVIEW").toLocaleString("id-ID")} />
        <Stat label="SINGLE-USE" value={count("SINGLE-USE").toLocaleString("id-ID")} />
        <Stat label="Biaya kemasan, semua sekali pakai" value={vnd(base)} />
        <Stat label="Biaya kemasan, ikut rekomendasi ReLoop" value={vnd(withReloop)} />
        <Stat label="Selisih" value={vnd(base - withReloop)} note={base - withReloop >= 0 ? "hemat" : "lebih mahal"} />
        <Stat label="Kemasan sekali pakai dihindari" value={reusable.length.toLocaleString("id-ID")}
          note={`perkiraan ${Math.round(lost)} kantong reusable hilang`} />
        <Stat label="Dampak CO2" value="Belum diestimasi" note="belum ada faktor emisi bersumber" />
      </section>

      <p className="text-sm text-gray-500 mb-2">
        Prediksi retur memakai {modelLabel}. Pengaturan: {METHOD_LABEL[method]}, kemasan sekali pakai {vnd(cfg.packaging.single_use_mailer_vnd.value)} (mailer)
        dan {vnd(cfg.packaging.single_use_box_vnd.value)} (kotak, outerwear).
      </p>

      <p className="text-sm flex flex-wrap gap-4">
        <a className="underline" href={`/export${qs}&rec=REUSABLE`}>Download daftar REUSABLE (CSV)</a>
        <a className="underline" href={`/export${qs}`}>Download semua rekomendasi (CSV)</a>
      </p>

      <h2 className="font-semibold mt-6 mb-2">Per kategori</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b">
          <th>Kategori</th><th>Order</th><th>Retur sebenarnya (riwayat)</th><th>Rata-rata peluang retur (prediksi)</th><th>REUSABLE</th>
        </tr></thead>
        <tbody>
          {cats.map((c) => {
            const list = scored.filter((s) => s.row.category === c);
            const avg = list.reduce((t, s) => t + s.r.predReturnProb, 0) / list.length;
            return (
              <tr key={c} className="border-b">
                <td>{c}</td><td>{list.length}</td>
                <td>{catRates.has(c) ? `${pct(catRates.get(c)!.rate)} (${catRates.get(c)!.n} terkirim)` : "-"}</td>
                <td>{pct(avg)}</td>
                <td>{list.filter((s) => s.r.recommendation === "REUSABLE").length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  );
}
