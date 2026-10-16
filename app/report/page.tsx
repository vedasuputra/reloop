import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import PrintButton from "@/components/PrintButton";
import { loadContext } from "@/lib/context";
import { buildReport, MAILER_KG, REUSABLE_KG } from "@/lib/report";
import { vnd, METHOD_LABEL, type Params } from "@/lib/data";

const n = (x: number, d = 0) => x.toLocaleString("id-ID", { maximumFractionDigits: d, minimumFractionDigits: d });

export default function Report({ searchParams }: { searchParams: Promise<Params> }) {
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
  const { user, method, presetKey, cfg, orgs, orgId, scored, qs, hasCustom, modelLabel } = await loadContext(sp);
  const rows = buildReport(scored, cfg);
  const total = rows[rows.length - 1];
  const org = orgs.find((o) => o.id === orgId)?.name;

  return (
    <>
      <div className="print:hidden"><Nav qs={qs} email={user?.email} /></div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Laporan Sustainability &amp; EPR</h1>
        <PrintButton />
      </div>
      <p className="text-sm text-gray-500 mb-3">{org} · {METHOD_LABEL[method]} · {modelLabel}</p>
      <div className="print:hidden">
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/report" />
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        <Stat label="Kemasan sekali pakai dihindari" value={n(total.mailersAvoided + total.boxesAvoided)} note={`${n(total.mailersAvoided)} mailer, ${n(total.boxesAvoided)} kotak`} />
        <Stat label="Plastik mailer dihindari" value={`${n(total.plasticAvoidedKg, 1)} kg`} note={`${n(MAILER_KG * 1000, 1)} g per mailer; kotak belum ditimbang`} />
        <Stat label="Plastik kantong reusable baru" value={`${n(total.plasticUsedKg, 1)} kg`} note={`${n(total.newReusablePacks)} kantong (aus + perkiraan hilang), ${REUSABLE_KG * 1000} g/kantong`} />
        <Stat label="Selisih plastik bersih" value={`${n(total.plasticAvoidedKg - total.plasticUsedKg, 1)} kg`} note={total.plasticAvoidedKg >= total.plasticUsedKg ? "berkurang" : "bertambah"} />
        <Stat label="Biaya kemasan, semua sekali pakai" value={vnd(total.costSingle)} />
        <Stat label="Biaya kemasan, ikut ReLoop" value={vnd(total.costReloop)} />
        <Stat label="Kewajiban EPR dihindari (ilustrasi)" value={total.eprSimVnd === null ? "Belum diestimasi" : vnd(total.eprSimVnd)} note="tarif Fs & rasio daur ulang masih simulasi" />
        <Stat label="Dampak CO2" value="Belum diestimasi" note="belum ada faktor emisi bersumber" />
      </section>

      <h2 className="font-semibold mb-2">Per bulan</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th>Bulan</th><th>Order</th><th>Pakai reusable</th><th>Mailer dihindari</th><th>Kotak dihindari</th>
            <th>Plastik dihindari (kg)</th><th>Plastik reusable baru (kg)</th><th>Biaya sekali pakai</th><th>Biaya ikut ReLoop</th><th>EPR (ilustrasi)</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={`border-b ${r.key === "Total" ? "font-semibold" : ""}`}>
                <td>{r.key}</td><td>{n(r.orders)}</td><td>{n(r.reusableUses)}</td><td>{n(r.mailersAvoided)}</td><td>{n(r.boxesAvoided)}</td>
                <td>{n(r.plasticAvoidedKg, 2)}</td><td>{n(r.plasticUsedKg, 2)}</td>
                <td>{vnd(r.costSingle)}</td><td>{vnd(r.costReloop)}</td><td>{r.eprSimVnd === null ? "-" : vnd(r.eprSimVnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold mt-6 mb-1">Cara menghitung</h2>
      <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1">
        <li>Hanya order yang direkomendasikan REUSABLE yang dihitung memakai kantong reusable; sisanya tetap sekali pakai.</li>
        <li>Berat mailer {n(MAILER_KG * 1000, 1)} g: listing Lazada K&amp;S (paket 500 g, ukuran 25x35 dan 28x42). Kantong reusable {REUSABLE_KG * 1000} g: 1 kg / 55 kantong (listing Lazada). Berat kotak belum ada sumbernya, jadi tidak ditimbang.</li>
        <li>Kantong reusable baru = jumlah pemakaian / {cfg.packaging.reuse_cycles.value} siklus + perkiraan kantong yang tidak kembali.</li>
        <li>EPR (Dekret 05/2025): berat dihindari × rasio daur ulang wajib × Fs × (1 + 2% biaya admin). Rasio dan Fs di sini masih angka SIMULASI, bukan angka resmi; ganti dengan angka resmi sebelum dipakai untuk pelaporan.</li>
        <li>Semua order adalah data simulasi kecuali data yang diupload perusahaan sendiri.</li>
      </ul>
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
