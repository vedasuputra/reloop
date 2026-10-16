import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import { loadContext } from "@/lib/context";
import { vnd, METHOD_LABEL, type Params } from "@/lib/data";
import { simulate } from "@/lib/simulate";

export default function Simulator({ searchParams }: { searchParams: Promise<Params> }) {
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
  const { user, method, presetKey, orgs, orgId, scored, qs } = await loadContext(sp);
  const sim = simulate(scored);
  const basePer1000 = (scored.reduce((t, s) => t + s.r.expCostSingleVnd, 0) / Math.max(1, scored.length)) * 1000;

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">Scenario Simulator</h1>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} action="/simulator" />
      <p className="text-sm text-gray-500 my-3">
        Order diurutkan dari skor RVS tertinggi, lalu X% teratas dipindahkan ke kemasan reusable.
        Pembanding: memilih order secara acak. {METHOD_LABEL[method]}. Biaya dasar semua sekali pakai: {vnd(basePer1000)} per 1.000 order.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th>Reusable</th><th>Order dipindah</th><th>Selisih biaya per 1.000 order (RVS)</th>
            <th>Selisih biaya per 1.000 order (acak)</th><th>Kemasan sekali pakai dihindari per 1.000</th>
            <th>Kantong reusable hilang per 1.000</th>
          </tr></thead>
          <tbody>
            {sim.filter((r) => r.sharePct > 0).map((r) => (
              <tr key={r.sharePct} className="border-b">
                <td>{r.sharePct}%</td>
                <td>{r.switched.toLocaleString("id-ID")}</td>
                <td>{label(r.extraPer1000)}</td>
                <td>{label(r.extraRandomPer1000)}</td>
                <td>{Math.round(r.packsAvoidedPer1000)}</td>
                <td>{Math.round(r.packsLostPer1000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Dampak CO2 belum diestimasi karena belum ada faktor emisi yang bersumber. Kantong reusable yang hilang juga menjadi sampah.
      </p>
    </>
  );
}

function label(x: number) {
  return x <= 0 ? `hemat ${vnd(-x)}` : `tambah ${vnd(x)}`;
}
