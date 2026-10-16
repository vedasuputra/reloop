"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CostSettings } from "@/lib/data";
import { getT } from "@/lib/i18n";

/** Allowed range per field, so a typo cannot break the scoring. */
const FIELDS: Record<keyof Omit<CostSettings, "default_method">, [number, number]> = {
  single_use_mailer_vnd: [0, 100000],
  single_use_box_vnd: [0, 200000],
  reusable_pack_vnd: [1, 1000000],
  reuse_cycles: [1, 500],
  cleaning_per_reuse_vnd: [0, 100000],
  dropoff_recovery_target: [0.01, 0.99],
  tariff_noi_tinh: [0, 500000],
  tariff_noi_vung: [0, 500000],
  tariff_lien_vung: [0, 500000],
  pickup_order_share: [0, 2],
};

function back(orgId: string, key: "ok" | "error", msg: string) {
  redirect(`/settings?org=${orgId}&${key}=${encodeURIComponent(msg)}`);
}

export async function saveSettings(formData: FormData) {
  const { t } = await getT();
  const orgId = String(formData.get("org") ?? "");
  const supabase = await createClient();
  const { data: me } = await supabase.from("members").select("role").eq("org_id", orgId).maybeSingle();
  if (!me || !["owner", "editor"].includes(me.role)) back(orgId, "error", t("You don't have permission to change this data set's settings.", "Bạn không có quyền thay đổi cài đặt của bộ dữ liệu này."));

  const out: Record<string, unknown> = {};
  for (const [k, [lo, hi]] of Object.entries(FIELDS)) {
    let raw = String(formData.get(k) ?? "").replace(/,/g, ".").trim();
    let n = Number(raw);
    if (k === "dropoff_recovery_target" || k === "pickup_order_share") n = n / 100; // form uses percent
    if (raw === "" || !Number.isFinite(n) || n < lo || n > hi) back(orgId, "error", t(`The value of "${k}" is not valid.`, `Giá trị "${k}" không hợp lệ.`));
    out[k] = n;
  }
  out.default_method = formData.get("default_method") === "dropoff" ? "dropoff" : "courier_pickup";

  const { error } = await supabase.from("org_settings")
    .upsert({ org_id: orgId, settings: out, updated_at: new Date().toISOString() });
  if (error) back(orgId, "error", t("Could not save: ", "Không lưu được: ") + error.message);
  back(orgId, "ok", t("Settings saved. On the other screens, choose this data set and the brand type \"Our settings\".", "Đã lưu cài đặt. Ở các màn hình khác, chọn bộ dữ liệu này và loại thương hiệu \"Cài đặt của chúng tôi\"."));
}

export async function resetSettings(formData: FormData) {
  const { t } = await getT();
  const orgId = String(formData.get("org") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("org_settings").delete().eq("org_id", orgId);
  if (error) back(orgId, "error", t("Could not reset: ", "Không đặt lại được: ") + error.message);
  back(orgId, "ok", t("Settings reset to the reference values.", "Đã đặt lại cài đặt về giá trị tham chiếu."));
}
