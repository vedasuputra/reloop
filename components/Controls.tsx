import Link from "next/link";
import { PRESETS, CUSTOM_PRESET, baseConfig } from "@/lib/data";
import { DEMO_ORG, type OrgInfo } from "@/lib/context";
import { withPreset } from "@/lib/rvs";
import { getT, presetLabel } from "@/lib/i18n";
import DescribedSelect from "@/components/DescribedSelect";

const LINK = "font-semibold text-[#174538] underline underline-offset-2 hover:opacity-70";

/**
 * Filter panel: data set, brand type and how packs come back. Every option explains itself, and choosing one applies it at once.
 * The footer points to the screens for entering your own costs or orders. Hidden fields keep other filters.
 * `modelNote` lets a screen say which AI model the numbers come from.
 */
export default async function Controls({
  method, presetKey, orgId, orgs, action, hidden = {}, hasCustom = false, modelNote,
}: {
  method: string; presetKey: string; orgId: string; orgs: OrgInfo[];
  action: string; hidden?: Record<string, string>; hasCustom?: boolean; modelNote?: string;
}) {
  const { t, f } = await getT();
  const qs = `?method=${method}&preset=${presetKey}&org=${orgId}`;

  const price = (key: string) => f.vnd(withPreset(baseConfig, key).packaging.single_use_mailer_vnd.value);
  const PRESET_DESC: Record<string, string> = {
    kemasan_murah: t(`Small plain mailer, about 20 x 30 cm. ${price("kemasan_murah")} per pack.`, `Túi nhỏ không in, khoảng 20 x 30 cm. ${price("kemasan_murah")} mỗi bao bì.`),
    acuan_ukuran_baju: t(`Standard clothing mailer, about 25 x 35 cm. ${price("acuan_ukuran_baju")} per pack.`, `Túi quần áo tiêu chuẩn, khoảng 25 x 35 cm. ${price("acuan_ukuran_baju")} mỗi bao bì.`),
    brand_premium: t(`Mailer printed with your logo. ${price("brand_premium")} per pack.`, `Túi in logo thương hiệu. ${price("brand_premium")} mỗi bao bì.`),
    brand_premium_box: t(`Kraft box, 30 x 20 x 5 cm. ${price("brand_premium_box")} per pack.`, `Hộp giấy kraft, 30 x 20 x 5 cm. ${price("brand_premium_box")} mỗi bao bì.`),
    [CUSTOM_PRESET]: t("Your own pack prices and courier costs from Cost settings.", "Giá bao bì và cước vận chuyển của bạn trong Cài đặt chi phí."),
  };

  const orgOptions = orgs.map((o) => ({
    value: o.id, label: o.name,
    description: o.id === DEMO_ORG
      ? t("Shared demo orders, all simulated.", "Đơn hàng demo dùng chung, toàn bộ là dữ liệu mô phỏng.")
      : t("Your own orders and settings.", "Đơn hàng và cài đặt của riêng bạn."),
  }));
  const presetOptions = [
    ...(hasCustom ? [CUSTOM_PRESET] : []), ...PRESETS.map((p) => p.key),
  ].map((key) => ({ value: key, label: presetLabel(t, key, PRESETS.find((p) => p.key === key)?.label), description: PRESET_DESC[key] }));
  const methodOptions = [
    { value: "courier_pickup", label: t("Courier pickup", "Shipper đến lấy"),
      description: t("A courier collects each empty pack, adding a cost per pack.", "Shipper đến lấy từng bao bì rỗng, thêm chi phí mỗi bao bì.") },
    { value: "dropoff", label: t("Drop-off (no courier)", "Khách tự gửi trả (không cần shipper)"),
      description: t("Customers bring packs back themselves: no courier cost.", "Khách tự mang bao bì đến trả: không tốn phí shipper.") },
  ];

  return (
    <form action={action} className="rounded-[9px] border border-[#174538]/15 bg-white">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="grid gap-5 p-5 md:grid-cols-3">
        <DescribedSelect name="org" label={t("Data", "Dữ liệu")} defaultValue={orgId} options={orgOptions} />
        <DescribedSelect name="preset" label={t("Brand type (single-use packaging)", "Loại thương hiệu (bao bì dùng một lần)")} defaultValue={presetKey} options={presetOptions} />
        <DescribedSelect name="method" label={t("How packs come back", "Cách thu hồi bao bì")} defaultValue={method} options={methodOptions} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-b-[9px] border-t border-[#174538]/10 bg-[#FFFEF6] px-5 py-3 text-xs leading-relaxed text-[#355E3B]">
        <p>{modelNote ?? ""}</p>
        <p>
          {t("Presets not a good fit?", "Mẫu có sẵn chưa phù hợp?")}{" "}
          <Link href={"/settings" + qs} className={LINK}>{t("Enter your own costs", "Nhập chi phí của riêng bạn")}</Link>
          <span aria-hidden className="mx-2 opacity-40">|</span>
          <Link href={"/upload" + qs} className={LINK}>{t("Upload your own orders", "Tải đơn hàng của bạn lên")}</Link>
        </p>
      </div>
      {/* Without JavaScript the form cannot submit itself, and the custom dropdowns need it to open */}
      <noscript>
        <div className="border-t border-[#174538]/10 p-3 text-xs text-[#355E3B]">{t("Turn on JavaScript to change these settings.", "Hãy bật JavaScript để thay đổi các cài đặt này.")}</div>
      </noscript>
    </form>
  );
}
