import { cookies } from "next/headers";

/**
 * Two languages, English by default. The choice lives in the "lang" cookie (set by LangSwitch).
 * Usage:  const { t, f } = await getT();   t("Dashboard", "Bảng điều khiển")   f.vnd(1234)
 */
export type Lang = "en" | "vi";
export type T = (en: string, vi: string) => string;

export const tFor = (lang: Lang): T => (en, vi) => (lang === "vi" ? vi : en);

export function fmt(lang: Lang) {
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const n = (x: number, digits = 0) =>
    x.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return {
    n,
    vnd: (x: number) => n(Math.round(x)) + " VND",
    pct: (x: number) => Math.round(x * 100) + "%",
  };
}
export type Fmt = ReturnType<typeof fmt>;

export async function getLang(): Promise<Lang> {
  return (await cookies()).get("lang")?.value === "vi" ? "vi" : "en";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: tFor(lang), f: fmt(lang) };
}

export const methodLabel = (t: T, m: string) =>
  m === "dropoff" ? t("Drop-off (no courier)", "Khách tự gửi trả (không cần shipper)") : t("Courier pickup", "Shipper đến lấy");

const PRESET_LABEL: Record<string, [string, string]> = {
  kemasan_murah: ["Low-cost packaging", "Bao bì giá rẻ"],
  acuan_ukuran_baju: ["Clothing-size reference", "Tham chiếu theo cỡ quần áo"],
  brand_premium: ["Premium brand, logo mailer", "Thương hiệu cao cấp, túi in logo"],
  brand_premium_box: ["Premium brand, box", "Thương hiệu cao cấp, hộp giấy"],
  custom: ["Our settings", "Cài đặt của chúng tôi"],
};
export const presetLabel = (t: T, key: string, fallback = key) =>
  PRESET_LABEL[key] ? t(...PRESET_LABEL[key]) : fallback;

/** Organisation names stored in Supabase are Indonesian ("Data saya (email)"); show them in the chosen language. */
export const orgLabel = (t: T, name: string) =>
  name.replace(/^Data saya/, t("My data", "Dữ liệu của tôi"))
    .replace(/^Demo \(data simulasi\)/, t("Sample data (simulated)", "Dữ liệu mẫu (mô phỏng)"));

/** One-line reason for a recommendation, in the chosen language. */
export function reasonText(t: T, f: Fmt, r: { predReturnProb: number; expCostReusableVnd: number; expCostSingleVnd: number; packReturnProb: number }, method: string) {
  const cheaper = r.expCostReusableVnd < r.expCostSingleVnd;
  return t(
    `return ${f.pct(r.predReturnProb)}; reusable ${f.vnd(r.expCostReusableVnd)} vs single-use ${f.vnd(r.expCostSingleVnd)} (${cheaper ? "cheaper" : "more expensive"}); pack comes back ${f.pct(r.packReturnProb)} via ${methodLabel(t, method).toLowerCase()}`,
    `hoàn hàng ${f.pct(r.predReturnProb)}; tái sử dụng ${f.vnd(r.expCostReusableVnd)} so với dùng một lần ${f.vnd(r.expCostSingleVnd)} (${cheaper ? "rẻ hơn" : "đắt hơn"}); bao bì quay về ${f.pct(r.packReturnProb)} qua hình thức ${methodLabel(t, method).toLowerCase()}`,
  );
}
