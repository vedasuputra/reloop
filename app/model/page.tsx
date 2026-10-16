import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import { loadContext } from "@/lib/context";
import { model as baseModel, trainingRows, type Params } from "@/lib/data";
import { trainModel, cannotTrain, MIN_TRAIN_ROWS, type TrainedModel } from "@/lib/train";
import { retrainModel, deleteModel } from "./actions";

const LABEL: Record<string, string> = {
  multi_size: "Beli lebih dari satu ukuran",
  cod: "Bayar COD",
  voucher_used: "Pakai voucher",
  qty_2plus: "2 barang atau lebih",
  has_history: "Pernah order sebelumnya",
  cust_rr: "Riwayat retur pelanggan (0-1)",
};
const label = (k: string) => LABEL[k] ?? (k.startsWith("cat_") ? `Kategori ${k.slice(4)}` : k);

export default function ModelPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, orgs, orgId, rows, qs, orgModel } = await loadContext(sp);
  const org = orgs.find((o) => o.id === orgId);
  const canEdit = org?.role === "owner" || org?.role === "editor";

  const train = trainingRows(rows);
  const why = cannotTrain(train);
  // Preview: what retraining would give right now (not saved)
  const preview: TrainedModel | null = why ? null : trainModel(train);
  const current = orgModel ?? (baseModel as TrainedModel);
  const keys = [...new Set([...Object.keys(current.coefficients), ...Object.keys(preview?.coefficients ?? {})])];

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-1">Model AI</h1>
      <p className="text-sm text-gray-500 mb-4">
        Melatih ulang model prediksi retur dengan riwayat order data ini sendiri (Custom AI Model).
        Model belajar dari order yang sudah terkirim dan punya kolom <code>was_returned</code>.
      </p>

      <div className="rounded border p-3 mb-4 text-sm space-y-1">
        <p className="font-semibold">Mau mencoba melatih ulang?</p>
        <ol className="list-decimal pl-5">
          <li>Download <a className="underline" href="/contoh_latih_ulang.csv" download>contoh_latih_ulang.csv</a> (1.000 order simulasi yang sudah punya kolom was_returned).</li>
          <li>Buka <a className="underline" href={`/upload?org=${orgId}`}>Upload CSV</a>, pilih &quot;Data saya&quot;, lalu upload file itu.</li>
          <li>Kembali ke sini, pilih &quot;Data saya&quot;, lalu klik &quot;Latih ulang dan pakai model ini&quot;.</li>
        </ol>
        <p className="text-gray-500">Perusahaan sungguhan memakai riwayat order mereka sendiri dengan kolom yang sama.</p>
      </div>

      {sp.ok && <p className="rounded border border-green-600 p-2 mb-3 text-sm">{sp.ok}</p>}
      {sp.error && <p className="rounded border border-red-600 p-2 mb-3 text-sm">{sp.error}</p>}

      <form action="/model" className="flex items-end gap-3 text-sm mb-4">
        <label className="flex flex-col">Data
          <select name="org" defaultValue={orgId} className="rounded border bg-transparent p-1">
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <button className="rounded border px-3 py-1">Pilih</button>
      </form>

      <section className="rounded border p-4 space-y-1 text-sm">
        <p><b>Model yang sedang dipakai:</b> {orgModel ? `model khusus data ini, dilatih ${orgModel.trained_at.slice(0, 16).replace("T", " ")}` : "model bawaan (dilatih di data simulasi)"}</p>
        <p>AUC {current.metrics?.auc_model ?? "-"} (baseline rata-rata kategori {current.metrics?.auc_baseline_category_mean ?? "-"}), {current.metrics?.n_train ?? "-"} order latih, {current.metrics?.n_test ?? "-"} order uji.</p>
        <p>Order yang bisa dipakai untuk melatih: <b>{train.length.toLocaleString("id-ID")}</b> (minimal {MIN_TRAIN_ROWS}).</p>
      </section>

      {why && <p className="mt-3 text-sm">Belum bisa melatih: {why}</p>}

      {preview && (
        <>
          <h2 className="font-semibold mt-6 mb-2">Hasil kalau dilatih ulang sekarang</h2>
          <p className="text-sm mb-2">
            Dilatih di {preview.metrics.n_train} order terlama, diuji di {preview.metrics.n_test} order terbaru
            (tingkat retur {Math.round(preview.metrics.test_return_rate * 100)}%).
            AUC model <b>{preview.metrics.auc_model}</b> dibanding baseline kategori <b>{preview.metrics.auc_baseline_category_mean}</b>
            {preview.metrics.auc_model > preview.metrics.auc_baseline_category_mean
              ? " — model lebih baik dari sekadar melihat kategori."
              : " — model belum lebih baik dari baseline; datanya mungkin terlalu sedikit."}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th>Faktor</th><th>Model dipakai</th><th>Hasil latih ulang</th></tr></thead>
              <tbody>
                <tr className="border-b"><td>Intercept</td><td>{current.intercept.toFixed(3)}</td><td>{preview.intercept.toFixed(3)}</td></tr>
                {keys.map((k) => (
                  <tr key={k} className="border-b">
                    <td>{label(k)}</td>
                    <td>{current.coefficients[k]?.toFixed(3) ?? "-"}</td>
                    <td>{preview.coefficients[k]?.toFixed(3) ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Angka positif menaikkan peluang retur, negatif menurunkan. Kategori pembanding: {preview.reference_category}.
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-3 mt-6 text-sm">
        {canEdit ? (
          <>
            {preview && (
              <form action={retrainModel}>
                <input type="hidden" name="org" value={orgId} />
                <button className="rounded border px-3 py-1 font-semibold">Latih ulang dan pakai model ini</button>
              </form>
            )}
            {orgModel && (
              <form action={deleteModel}>
                <input type="hidden" name="org" value={orgId} />
                <button className="rounded border px-3 py-1">Kembali ke model bawaan</button>
              </form>
            )}
          </>
        ) : (
          <p className="text-gray-500">
            Data demo hanya bisa dilihat. Untuk menyimpan model sendiri, upload CSV berisi kolom was_returned ke &quot;Data saya&quot;, lalu kembali ke sini.
          </p>
        )}
      </div>
    </>
  );
}
