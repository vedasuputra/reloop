import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { getOrgs, getCostSettings } from "@/lib/context";
import { defaultCostSettings, CUSTOM_PRESET, PRESETS, baseConfig, type CostSettings } from "@/lib/data";
import { withPreset } from "@/lib/rvs";
import { saveSettings, resetSettings } from "./actions";

type SP = { org?: string; ok?: string; error?: string; from?: string };

export default function Settings({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const { data: { user } } = await (await createClient()).auth.getUser();
  const own = (await getOrgs()).filter((o) => o.role === "owner" || o.role === "editor");
  const org = own.find((o) => o.id === sp.org) ?? own[0];
  const saved = org ? await getCostSettings(org.id) : null;
  const d = defaultCostSettings();
  // "Mulai dari preset": prefill the form with a preset's numbers (not saved until "Simpan")
  const fromPreset = PRESETS.find((p) => p.key === sp.from);
  const v: CostSettings = fromPreset
    ? { ...(saved ?? d), ...pick(defaultCostSettings(withPreset(baseConfig, fromPreset.key))) }
    : saved ?? d;

  const field = (name: keyof CostSettings, label: string, hint: string, value: number, step = "1") => (
    <label className="flex flex-col gap-1">
      <span>{label}</span>
      <input name={name} type="number" step={step} defaultValue={value} required
        className="rounded border bg-transparent p-1" />
      <span className="text-xs text-gray-500">{hint}</span>
    </label>
  );

  return (
    <>
      <Nav qs={org ? `?org=${org.id}` : ""} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">Pengaturan biaya</h1>
      {sp.ok && <p className="text-green-500 text-sm mb-3">{sp.ok}</p>}
      {sp.error && <p className="text-red-500 text-sm mb-3">{sp.error}</p>}

      {!org ? <p>Akun ini belum punya data sendiri.</p> : (
        <>
          <p className="text-sm mb-4">
            Isi angka bisnis untuk <b>{org.name}</b>. Angka awal adalah acuan bersumber (Lazada, GHN, laundry HCMC).
            {saved ? " Pengaturan kamu sudah tersimpan." : " Belum ada pengaturan tersimpan."} Bobot rumus RVS dan ambang 70 tidak bisa diubah.
          </p>
          <div className="mb-4 text-sm">
            <p className="mb-1">Mulai dari preset (mengisi formulir; klik Simpan untuk menyimpan):</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Link key={p.key} href={`/settings?org=${org.id}&from=${p.key}`}
                  className={`rounded border px-2 py-1 ${fromPreset?.key === p.key ? "font-semibold" : ""}`}>{p.label}</Link>
              ))}
            </div>
            {fromPreset && <p className="text-xs text-gray-500 mt-1">Formulir diisi dari preset "{fromPreset.label}". Belum disimpan.</p>}
          </div>
          <form key={fromPreset?.key ?? "saved"} action={saveSettings} className="grid md:grid-cols-2 gap-4 rounded border p-4 text-sm">
            <input type="hidden" name="org" value={org.id} />
            {field("single_use_mailer_vnd", "Mailer sekali pakai (VND per kantong)", `acuan ${d.single_use_mailer_vnd}`, v.single_use_mailer_vnd)}
            {field("single_use_box_vnd", "Kotak sekali pakai untuk outerwear (VND)", `acuan ${d.single_use_box_vnd}`, v.single_use_box_vnd)}
            {field("reusable_pack_vnd", "Harga kemasan reusable (VND per buah)", `acuan ${d.reusable_pack_vnd}`, v.reusable_pack_vnd)}
            {field("reuse_cycles", "Umur pakai kemasan reusable (kali)", `acuan ${d.reuse_cycles}`, v.reuse_cycles)}
            {field("cleaning_per_reuse_vnd", "Biaya cuci per pemakaian (VND)", `acuan ${d.cleaning_per_reuse_vnd}`, v.cleaning_per_reuse_vnd)}
            <label className="flex flex-col gap-1">
              <span>Cara kemasan kembali (bawaan)</span>
              <select name="default_method" defaultValue={v.default_method} className="rounded border bg-transparent p-1">
                <option value="courier_pickup">Dijemput kurir</option>
                <option value="dropoff">Drop-off (tanpa kurir)</option>
              </select>
              <span className="text-xs text-gray-500">acuan: dijemput kurir</span>
            </label>
            {field("dropoff_recovery_target", "Pelanggan yang mengembalikan kemasan tanpa kurir (%)", `acuan ${Math.round(d.dropoff_recovery_target * 100)}% (asumsi, perlu pilot)`, Math.round(v.dropoff_recovery_target * 100))}
            {field("pickup_order_share", "Biaya jemput kurir (% dari ongkir)", `acuan ${Math.round(d.pickup_order_share * 100)}% (GHN)`, Math.round(v.pickup_order_share * 100))}
            {field("tariff_noi_tinh", "Ongkir dalam provinsi (VND)", `acuan ${d.tariff_noi_tinh} (GHN)`, v.tariff_noi_tinh)}
            {field("tariff_noi_vung", "Ongkir satu wilayah (VND)", `acuan ${d.tariff_noi_vung} (GHN)`, v.tariff_noi_vung)}
            {field("tariff_lien_vung", "Ongkir antar wilayah (VND)", `acuan ${d.tariff_lien_vung} (GHN)`, v.tariff_lien_vung)}
            <div className="md:col-span-2"><button className="rounded border px-3 py-1">Simpan</button></div>
          </form>
          {saved && (
            <form action={resetSettings} className="mt-4">
              <input type="hidden" name="org" value={org.id} />
              <button className="text-sm underline text-red-500">Kembalikan ke angka acuan</button>
            </form>
          )}
          {saved && (
            <p className="mt-6 text-sm">
              <Link className="underline" href={`/?org=${org.id}&preset=${CUSTOM_PRESET}`}>Lihat hasilnya di Dashboard</Link>
              {" "}(data {org.name} dengan "Pengaturan kami"). Upload order dulu di Upload CSV kalau data ini masih kosong.
            </p>
          )}
        </>
      )}
    </>
  );
}

/** Presets only change packaging prices; keep the rest of the company's numbers. */
function pick(c: CostSettings): Partial<CostSettings> {
  return { single_use_mailer_vnd: c.single_use_mailer_vnd, single_use_box_vnd: c.single_use_box_vnd };
}
