import { PRESETS, CUSTOM_PRESET } from "@/lib/data";
import type { OrgInfo } from "@/lib/context";
import { getT, presetLabel } from "@/lib/i18n";

/** GET form for data set, brand type and pack collection method. Hidden fields keep other filters. */
export default async function Controls({
  method, presetKey, orgId, orgs, action, hidden = {}, hasCustom = false,
}: {
  method: string; presetKey: string; orgId: string; orgs: OrgInfo[];
  action: string; hidden?: Record<string, string>; hasCustom?: boolean;
}) {
  const { t } = await getT();
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded border p-3 text-sm">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label className="flex flex-col">
        {t("Data", "Dữ liệu")}
        <select name="org" defaultValue={orgId} className="rounded border bg-transparent p-1">
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col">
        {t("Brand type (single-use packaging)", "Loại thương hiệu (bao bì dùng một lần)")}
        <select name="preset" defaultValue={presetKey} className="rounded border bg-transparent p-1">
          {hasCustom && <option value={CUSTOM_PRESET}>{presetLabel(t, CUSTOM_PRESET)}</option>}
          {PRESETS.map((p) => <option key={p.key} value={p.key}>{presetLabel(t, p.key, p.label)}</option>)}
        </select>
      </label>
      <label className="flex flex-col">
        {t("How packs come back", "Cách thu hồi bao bì")}
        <select name="method" defaultValue={method} className="rounded border bg-transparent p-1">
          <option value="courier_pickup">{t("Courier pickup", "Shipper đến lấy")}</option>
          <option value="dropoff">{t("Drop-off (no courier)", "Khách tự gửi trả (không cần shipper)")}</option>
        </select>
      </label>
      <button className="rounded border px-3 py-1">{t("Apply", "Áp dụng")}</button>
    </form>
  );
}
