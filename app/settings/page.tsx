import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import Section from "@/components/Section";
import { Field, NumberInput, SelectInput } from "@/components/FormControls";
import { BAND, TEAL, TEAL_LIGHT } from "@/components/DashboardCharts";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, Dot, Notice, PageTitle, Tag, rise } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getOrgs, getCostSettings } from "@/lib/context";
import { defaultCostSettings, settingsFromConfig, CUSTOM_PRESET, PRESETS, baseConfig, type CostSettings } from "@/lib/data";
import { withPreset } from "@/lib/rvs";
import { getT, presetLabel } from "@/lib/i18n";
import { saveSettings, resetSettings } from "./actions";

type SP = { org?: string; ok?: string; error?: string; from?: string };

export const metadata = { title: "Cost settings" };

export default function Settings({ searchParams }: { searchParams: Promise<SP> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
}

/** Whether a number in config.json comes from a public source or is the team's assumption. */
const statusOf = (section: string, key: string): string =>
  (baseConfig as unknown as Record<string, Record<string, { status?: string }>>)[section]?.[key]?.status ?? "assumption";

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const { t, f } = await getT();
  const { data: { user } } = await (await createClient()).auth.getUser();
  const own = (await getOrgs()).filter((o) => o.role === "owner" || o.role === "editor");
  const org = own.find((o) => o.id === sp.org) ?? own[0];
  const saved = org ? await getCostSettings(org.id) : null;
  const d = defaultCostSettings();
  // "Start from a preset": prefill the form with a preset's numbers (not saved until "Save")
  const fromPreset = PRESETS.find((p) => p.key === sp.from);
  const v: CostSettings = fromPreset
    ? { ...(saved ?? d), ...pick(defaultCostSettings(withPreset(baseConfig, fromPreset.key))) }
    : saved ?? d;
  const qs = org ? `?org=${org.id}` : "";
  const w = settingsFromConfig(baseConfig);

  const ref = t("reference", "tham chiếu");
  const badge = (section: string, key: string) =>
    statusOf(section, key) === "sourced"
      ? <span className="text-xs font-normal text-[#2f8f7a]/85">{t("Sourced", "Có nguồn")}</span>
      : <span className="text-xs font-normal text-[#a68b00]/85">{t("Assumption", "Giả định")}</span>;
  const pct = (x: number) => Math.round(x * 100);

  const PRESET_DESC: Record<string, string> = {
    kemasan_murah: t("Small plain mailer, about 20 x 30 cm.", "Túi nhỏ không in, khoảng 20 x 30 cm."),
    acuan_ukuran_baju: t("Standard clothing mailer, about 25 x 35 cm.", "Túi quần áo tiêu chuẩn, khoảng 25 x 35 cm."),
    brand_premium: t("Mailer printed with your logo.", "Túi in logo thương hiệu."),
    brand_premium_box: t("Kraft box, 30 x 20 x 5 cm.", "Hộp giấy kraft, 30 x 20 x 5 cm."),
  };

  // What a self-return rate means for the life of a bag: a pack only completes another trip if it comes back
  const trips = (rate: number) => Math.min(v.reuse_cycles, 1 / (1 - Math.min(0.99, Math.max(0, rate))));
  const rates = [0.5, 0.67, 0.8, 0.9];

  return (
    <AppShell qs={qs} email={user?.email}>
      <PageTitle title={t("Cost settings", "Cài đặt chi phí")}
        sub={org
          ? <>
              {t("Enter the business numbers for", "Nhập số liệu kinh doanh cho")} <b className="font-semibold text-[#174538]">{org.name}</b>.{" "}
              {t("Starting values are sourced references (Lazada, GHN, HCMC laundries).", "Giá trị ban đầu là số tham chiếu có nguồn (Lazada, GHN, tiệm giặt ở TP.HCM).")}
            </>
          : undefined}
        actions={org && (saved ? <Tag tone="ok">{t("Your settings are saved", "Cài đặt của bạn đã được lưu")}</Tag> : <Tag tone="warn">{t("No saved settings yet", "Chưa có cài đặt nào được lưu")}</Tag>)} />

      {sp.ok && <Notice tone="ok" role="status" className="rl-rise mt-6">{sp.ok}</Notice>}
      {sp.error && <Notice tone="warn" role="alert" className="rl-rise mt-6">{sp.error}</Notice>}

      {!org ? (
        <Notice tone="info" className="rl-rise mt-6">{t("This account has no data set of its own yet.", "Tài khoản này chưa có bộ dữ liệu riêng.")}</Notice>
      ) : (
        <>
          {/* Presets: brand types from the team's cost model */}
          <Section title={t("Start from a preset", "Bắt đầu từ mẫu có sẵn")}
            sub={t("Fills the form with that brand type's single-use pack price. Nothing is saved until you click Save.", "Điền vào biểu mẫu giá bao bì dùng một lần của loại thương hiệu đó. Chưa có gì được lưu cho đến khi bạn bấm Lưu.")} i={1}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {PRESETS.map((p) => {
                const price = defaultCostSettings(withPreset(baseConfig, p.key)).single_use_mailer_vnd;
                const active = fromPreset?.key === p.key;
                return (
                  <Link key={p.key} href={`/settings?org=${org.id}&from=${p.key}`} aria-current={active ? "true" : undefined}
                    className={`relative flex flex-col rounded-[9px] border p-5 transition-colors hover:bg-[#FFFEF6] ${active ? "border-[#174538] bg-white shadow-[inset_0_-3px_0_0_#37a486]" : "border-[#174538]/15 bg-white"}`}>
                    <span className="text-sm font-semibold">{presetLabel(t, p.key, p.label)}</span>
                    <span className="mt-3 text-3xl font-medium tracking-tight">{f.n(price)}</span>
                    <span className="mt-1 text-xs text-[#355E3B]">{t("VND per order", "VND mỗi đơn")}</span>
                    <span className="mt-3 text-xs leading-relaxed text-[#355E3B]">{PRESET_DESC[p.key]}</span>
                  </Link>
                );
              })}
            </div>
            {fromPreset && (
              <Notice tone="info" className="mt-4">
                {t(`Form filled from the preset “${presetLabel(t, fromPreset.key, fromPreset.label)}”. Not saved yet.`, `Biểu mẫu được điền từ mẫu “${presetLabel(t, fromPreset.key, fromPreset.label)}”. Chưa lưu.`)}
              </Notice>
            )}
          </Section>

          <div className="mt-2 grid items-start gap-x-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <form key={`${fromPreset?.key ?? "saved"}:${JSON.stringify(saved)}`} action={saveSettings}>
              <input type="hidden" name="org" value={org.id} />

              <Section title={t("Packaging", "Bao bì")} sub={t("What each pack costs and how long a reusable bag lasts.", "Giá từng loại bao bì và số lần dùng của một túi tái sử dụng.")} i={2}>
                <div className={`${CARD} grid gap-x-5 gap-y-5 md:grid-cols-2`}>
                  <Field label={t("Single-use mailer", "Túi gói hàng dùng một lần")} badge={badge("packaging", "single_use_mailer_vnd")}
                    hint={`${ref} ${f.n(d.single_use_mailer_vnd)} VND`}>
                    <NumberInput name="single_use_mailer_vnd" defaultValue={v.single_use_mailer_vnd} suffix="VND" />
                  </Field>
                  <Field label={t("Single-use box for outerwear", "Hộp dùng một lần cho áo khoác")} badge={badge("packaging", "single_use_box_vnd")}
                    hint={`${ref} ${f.n(d.single_use_box_vnd)} VND`}>
                    <NumberInput name="single_use_box_vnd" defaultValue={v.single_use_box_vnd} suffix="VND" />
                  </Field>
                  <Field label={t("Reusable pack price", "Giá túi tái sử dụng")} badge={badge("packaging", "reusable_pack_vnd")}
                    hint={`${ref} ${f.n(d.reusable_pack_vnd)} VND ${t("each", "mỗi cái")}`}>
                    <NumberInput name="reusable_pack_vnd" defaultValue={v.reusable_pack_vnd} suffix="VND" />
                  </Field>
                  <Field label={t("Reusable pack lifetime", "Vòng đời túi tái sử dụng")} badge={badge("packaging", "reuse_cycles")}
                    hint={`${ref} ${d.reuse_cycles} ${t("uses (tested at 5 and 20)", "lần (đã thử ở 5 và 20)")}`}>
                    <NumberInput name="reuse_cycles" defaultValue={v.reuse_cycles} suffix={t("uses", "lần")} />
                  </Field>
                  <Field label={t("Cleaning cost per use", "Chi phí vệ sinh mỗi lần dùng")} badge={badge("packaging", "cleaning_per_reuse_vnd")}
                    hint={`${ref} ${f.n(d.cleaning_per_reuse_vnd)} VND ${t("(upper-bound estimate)", "(ước tính cận trên)")}`} className="md:col-span-2 md:max-w-[calc(50%-0.625rem)]">
                    <NumberInput name="cleaning_per_reuse_vnd" defaultValue={v.cleaning_per_reuse_vnd} suffix="VND" />
                  </Field>
                </div>
              </Section>

              <Section title={t("Getting packs back", "Thu hồi bao bì")} sub={t("The key unknown of the pilot: how many packs come back without a courier.", "Ẩn số chính của thí điểm: có bao nhiêu bao bì quay về mà không cần shipper.")} i={3}>
                <div className={`${CARD} grid gap-x-5 gap-y-5 md:grid-cols-2`}>
                  <Field label={t("How packs come back (default)", "Cách thu hồi bao bì (mặc định)")} badge={badge("logistics", "pack_collection_method")}
                    hint={`${ref}: ${t("courier pickup", "shipper đến lấy")}`}>
                    <SelectInput name="default_method" defaultValue={v.default_method} options={[
                      { value: "courier_pickup", label: t("Courier pickup", "Shipper đến lấy") },
                      { value: "dropoff", label: t("Drop-off (no courier)", "Khách tự gửi trả (không cần shipper)") },
                    ]} />
                  </Field>
                  <Field label={t("Packs returned without a courier", "Bao bì gửi trả không cần shipper")} badge={badge("generator", "dropoff_recovery_target")}
                    hint={t(`${ref} ${pct(d.dropoff_recovery_target)}% · pilot target ${pct(0.8)}%`, `${ref} ${pct(d.dropoff_recovery_target)}% · mục tiêu thí điểm ${pct(0.8)}%`)}>
                    <NumberInput name="dropoff_recovery_target" defaultValue={pct(v.dropoff_recovery_target)} suffix="%" />
                  </Field>
                  <Field label={t("Courier pickup fee", "Phí shipper đến lấy")} badge={badge("logistics", "pickup_order_share")}
                    hint={t(`${ref} ${pct(d.pickup_order_share)}% of shipping fee (GHN)`, `${ref} ${pct(d.pickup_order_share)}% phí vận chuyển (GHN)`)}>
                    <NumberInput name="pickup_order_share" defaultValue={pct(v.pickup_order_share)} suffix="%" />
                  </Field>
                </div>
              </Section>

              <Section title={t("Courier tariffs", "Cước vận chuyển")} sub={t("What the courier charges to deliver one order, by route.", "Số tiền shipper tính để giao một đơn hàng, theo tuyến.")} i={4}>
                <div className={`${CARD} grid gap-x-5 gap-y-5 md:grid-cols-3`}>
                  <Field label={t("Within a province", "Nội tỉnh")} badge={badge("logistics", "ghn_tariff_vnd")} hint={`${ref} ${f.n(d.tariff_noi_tinh)} (GHN)`}>
                    <NumberInput name="tariff_noi_tinh" defaultValue={v.tariff_noi_tinh} suffix="VND" />
                  </Field>
                  <Field label={t("Within a region", "Nội vùng")} badge={badge("logistics", "ghn_tariff_vnd")} hint={`${ref} ${f.n(d.tariff_noi_vung)} (GHN)`}>
                    <NumberInput name="tariff_noi_vung" defaultValue={v.tariff_noi_vung} suffix="VND" />
                  </Field>
                  <Field label={t("Between regions", "Liên vùng")} badge={badge("logistics", "ghn_tariff_vnd")} hint={`${ref} ${f.n(d.tariff_lien_vung)} (GHN)`}>
                    <NumberInput name="tariff_lien_vung" defaultValue={v.tariff_lien_vung} suffix="VND" />
                  </Field>
                </div>
              </Section>

              <div className="rl-rise mt-6 flex flex-wrap items-center gap-3" style={rise(5)}>
                <button className={BTN_PRIMARY}>{t("Save", "Lưu")}</button>
                {saved && <Link className={BTN_OUTLINE} href={`/dashboard?org=${org.id}&preset=${CUSTOM_PRESET}`}>{t("See Results", "Xem kết quả")}</Link>}
              </div>
              {saved && (
                <p className="mt-3 text-xs leading-relaxed text-[#355E3B]">
                  {t(`The results use “Our settings” as the brand type for ${org.name}.`, `Kết quả dùng “Cài đặt của chúng tôi” làm loại thương hiệu cho ${org.name}.`)}
                  <br />
                  {t("Upload orders under Upload data (CSV) first if this data set is still empty.", "Hãy tải đơn hàng lên ở mục Tải dữ liệu lên (CSV) trước nếu bộ dữ liệu này còn trống.")}
                </p>
              )}
            </form>

            {/* What ReLoop fixes, and what the numbers above mean for a bag's life */}
            <aside className="xl:sticky xl:top-6">
              <Section title={t("Fixed by ReLoop", "Do ReLoop cố định")} sub={t("The score weights and thresholds cannot be changed.", "Không thể thay đổi trọng số điểm và các ngưỡng.")} i={2}>
                <div className={CARD}>
                  <p className="text-sm font-semibold">{t("RVS = cost + pack return + reuse cycles", "RVS = chi phí + bao bì quay về + số vòng tái sử dụng")}</p>
                  <div className="mt-3 flex h-3 overflow-hidden rounded-[2px]" role="img"
                    aria-label={`${pct(w.weights.cost)}% / ${pct(w.weights.pack_return)}% / ${pct(w.weights.cycles)}%`}>
                    <div style={{ width: `${w.weights.cost * 100}%`, background: BAND.reusable }} />
                    <div style={{ width: `${w.weights.pack_return * 100}%`, background: TEAL }} />
                    <div style={{ width: `${w.weights.cycles * 100}%`, background: TEAL_LIGHT }} />
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {[
                      [BAND.reusable, t("Cost advantage", "Lợi thế chi phí"), w.weights.cost],
                      [TEAL, t("Chance the pack comes back", "Khả năng bao bì quay về"), w.weights.pack_return],
                      [TEAL_LIGHT, t("Reuse cycles", "Số vòng tái sử dụng"), w.weights.cycles],
                    ].map(([c, name, wt]) => (
                      <li key={name as string} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2"><Dot color={c as string} />{name as string}</span><b>{pct(wt as number)}%</b>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-2 border-t border-[#174538]/10 pt-4 text-sm">
                    <p className="flex items-center gap-2"><Dot color={BAND.reusable} /><b>Reusable</b> ≥ {w.reusableMin}</p>
                    <p className="flex items-center gap-2"><Dot color={BAND.review} /><b>Review</b> {w.reviewMin}–{w.reusableMin - 1}</p>
                    <p className="flex items-center gap-2"><Dot color={BAND.single} /><b>Single-use</b> &lt; {w.reviewMin}</p>
                  </div>
                  <p className="mt-4 border-t border-[#174538]/10 pt-4 text-xs leading-relaxed text-[#355E3B]">
                    {t("Guardrail: never Reusable when the reusable pack is expected to cost more than single-use.", "Cơ chế bảo vệ: không bao giờ đề xuất Reusable khi túi tái sử dụng dự kiến đắt hơn dùng một lần.")}
                  </p>
                </div>
              </Section>

              <Section title={t("What recovery means for a bag", "Tỷ lệ thu hồi ảnh hưởng thế nào đến một túi")}
                sub={t("Trips ≈ 1 ÷ (1 − recovery rate), up to the design life.", "Số chuyến ≈ 1 ÷ (1 − tỷ lệ thu hồi), tối đa bằng vòng đời thiết kế.")} i={3}>
                <div className={CARD}>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#174538]/15 text-left text-xs font-semibold text-[#355E3B]">
                      <th className="pb-2">{t("Packs come back", "Bao bì quay về")}</th><th className="pb-2 text-right">{t("Average trips", "Số chuyến trung bình")}</th>
                    </tr></thead>
                    <tbody>
                      {[pct(v.dropoff_recovery_target) / 100, ...rates.filter((r) => Math.abs(r - v.dropoff_recovery_target) > 0.005)].sort((a, b) => a - b).map((r) => (
                        <tr key={r} className={`border-b border-[#174538]/10 last:border-0 ${Math.abs(r - v.dropoff_recovery_target) < 0.005 ? "bg-[#FFFEF6] font-semibold" : ""}`}>
                          <td className="py-2">{pct(r)}%{Math.abs(r - v.dropoff_recovery_target) < 0.005 ? ` · ${t("your setting", "cài đặt của bạn")}` : ""}</td>
                          <td className="py-2 text-right">{f.n(trips(r), 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs leading-relaxed text-[#355E3B]">
                    {t(`A bag designed for ${f.n(v.reuse_cycles)} uses only gets there if almost every pack comes back. Lost bags are waste too.`,
                      `Một túi thiết kế cho ${f.n(v.reuse_cycles)} lần dùng chỉ đạt được con số đó nếu gần như mọi bao bì đều quay về. Túi bị mất cũng là rác thải.`)}
                  </p>
                </div>
              </Section>
            </aside>
          </div>

          {saved && (
            <form action={resetSettings} className="mt-8">
              <input type="hidden" name="org" value={org.id} />
              <button className="cursor-pointer text-sm font-semibold underline underline-offset-2 hover:opacity-70">{t("Reset to reference values", "Đặt lại về giá trị tham chiếu")}</button>
            </form>
          )}
        </>
      )}
    </AppShell>
  );
}

/** Presets only change packaging prices; keep the rest of the company's numbers. */
function pick(c: CostSettings): Partial<CostSettings> {
  return { single_use_mailer_vnd: c.single_use_mailer_vnd, single_use_box_vnd: c.single_use_box_vnd };
}
