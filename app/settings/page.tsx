import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { getOrgs, getCostSettings } from "@/lib/context";
import { defaultCostSettings, CUSTOM_PRESET, PRESETS, baseConfig, type CostSettings } from "@/lib/data";
import { withPreset } from "@/lib/rvs";
import { getT, presetLabel } from "@/lib/i18n";
import { saveSettings, resetSettings } from "./actions";

type SP = { org?: string; ok?: string; error?: string; from?: string };

export default function Settings({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const { t } = await getT();
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

  const ref = t("reference", "tham chiếu");
  return (
    <>
      <Nav qs={org ? `?org=${org.id}` : ""} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">{t("Cost Settings", "Cài đặt chi phí")}</h1>
      {sp.ok && <p className="text-green-500 text-sm mb-3">{sp.ok}</p>}
      {sp.error && <p className="text-red-500 text-sm mb-3">{sp.error}</p>}

      {!org ? <p>{t("This account has no data set of its own yet.", "Tài khoản này chưa có bộ dữ liệu riêng.")}</p> : (
        <>
          <p className="text-sm mb-4">
            {t("Enter the business numbers for", "Nhập số liệu kinh doanh cho")} <b>{org.name}</b>.{" "}
            {t("Starting values are sourced references (Lazada, GHN, HCMC laundries).", "Giá trị ban đầu là số tham chiếu có nguồn (Lazada, GHN, tiệm giặt ở TP.HCM).")}
            {saved ? t(" Your settings are saved.", " Cài đặt của bạn đã được lưu.") : t(" No saved settings yet.", " Chưa có cài đặt nào được lưu.")}{" "}
            {t("The RVS weights and the 70 threshold cannot be changed.", "Không thể thay đổi trọng số RVS và ngưỡng 70.")}
          </p>
          <div className="mb-4 text-sm">
            <p className="mb-1">{t("Start from a preset (fills the form; click Save to keep it):", "Bắt đầu từ mẫu có sẵn (điền vào biểu mẫu; bấm Lưu để giữ lại):")}</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Link key={p.key} href={`/settings?org=${org.id}&from=${p.key}`}
                  className={`rounded border px-2 py-1 ${fromPreset?.key === p.key ? "font-semibold" : ""}`}>{presetLabel(t, p.key, p.label)}</Link>
              ))}
            </div>
            {fromPreset && <p className="text-xs text-gray-500 mt-1">
              {t(`Form filled from the preset "${presetLabel(t, fromPreset.key, fromPreset.label)}". Not saved yet.`, `Biểu mẫu được điền từ mẫu "${presetLabel(t, fromPreset.key, fromPreset.label)}". Chưa lưu.`)}</p>}
          </div>
          <form key={fromPreset?.key ?? "saved"} action={saveSettings} className="grid md:grid-cols-2 gap-4 rounded border p-4 text-sm">
            <input type="hidden" name="org" value={org.id} />
            {field("single_use_mailer_vnd", t("Single-use mailer (VND per bag)", "Túi gói hàng dùng một lần (VND/túi)"), `${ref} ${d.single_use_mailer_vnd}`, v.single_use_mailer_vnd)}
            {field("single_use_box_vnd", t("Single-use box for outerwear (VND)", "Hộp dùng một lần cho áo khoác (VND)"), `${ref} ${d.single_use_box_vnd}`, v.single_use_box_vnd)}
            {field("reusable_pack_vnd", t("Reusable pack price (VND each)", "Giá túi tái sử dụng (VND/cái)"), `${ref} ${d.reusable_pack_vnd}`, v.reusable_pack_vnd)}
            {field("reuse_cycles", t("Reusable pack lifetime (uses)", "Vòng đời túi tái sử dụng (số lần)"), `${ref} ${d.reuse_cycles}`, v.reuse_cycles)}
            {field("cleaning_per_reuse_vnd", t("Cleaning cost per use (VND)", "Chi phí vệ sinh mỗi lần dùng (VND)"), `${ref} ${d.cleaning_per_reuse_vnd}`, v.cleaning_per_reuse_vnd)}
            <label className="flex flex-col gap-1">
              <span>{t("How packs come back (default)", "Cách thu hồi bao bì (mặc định)")}</span>
              <select name="default_method" defaultValue={v.default_method} className="rounded border bg-transparent p-1">
                <option value="courier_pickup">{t("Courier pickup", "Shipper đến lấy")}</option>
                <option value="dropoff">{t("Drop-off (no courier)", "Khách tự gửi trả (không cần shipper)")}</option>
              </select>
              <span className="text-xs text-gray-500">{ref}: {t("courier pickup", "shipper đến lấy")}</span>
            </label>
            {field("dropoff_recovery_target", t("Customers who return the pack without a courier (%)", "Tỷ lệ khách tự gửi trả bao bì không cần shipper (%)"),
              t(`${ref} ${Math.round(d.dropoff_recovery_target * 100)}% (assumption, needs a pilot)`, `${ref} ${Math.round(d.dropoff_recovery_target * 100)}% (giả định, cần thí điểm)`), Math.round(v.dropoff_recovery_target * 100))}
            {field("pickup_order_share", t("Courier pickup fee (% of shipping fee)", "Phí shipper đến lấy (% phí vận chuyển)"), `${ref} ${Math.round(d.pickup_order_share * 100)}% (GHN)`, Math.round(v.pickup_order_share * 100))}
            {field("tariff_noi_tinh", t("Shipping within a province (VND)", "Phí giao nội tỉnh (VND)"), `${ref} ${d.tariff_noi_tinh} (GHN)`, v.tariff_noi_tinh)}
            {field("tariff_noi_vung", t("Shipping within a region (VND)", "Phí giao nội vùng (VND)"), `${ref} ${d.tariff_noi_vung} (GHN)`, v.tariff_noi_vung)}
            {field("tariff_lien_vung", t("Shipping between regions (VND)", "Phí giao liên vùng (VND)"), `${ref} ${d.tariff_lien_vung} (GHN)`, v.tariff_lien_vung)}
            <div className="md:col-span-2"><button className="rounded border px-3 py-1">{t("Save", "Lưu")}</button></div>
          </form>
          {saved && (
            <form action={resetSettings} className="mt-4">
              <input type="hidden" name="org" value={org.id} />
              <button className="text-sm underline text-red-500">{t("Reset to reference values", "Đặt lại về giá trị tham chiếu")}</button>
            </form>
          )}
          {saved && (
            <p className="mt-6 text-sm">
              <Link className="underline" href={`/?org=${org.id}&preset=${CUSTOM_PRESET}`}>{t("See the results on the Dashboard", "Xem kết quả ở trang Tổng quan")}</Link>
              {" "}{t(`(${org.name} with "Our settings"). Upload orders in Upload CSV first if this data set is still empty.`,
                       `(${org.name} với "Cài đặt của chúng tôi"). Hãy tải đơn hàng lên ở mục Tải lên CSV trước nếu bộ dữ liệu này còn trống.`)}
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
