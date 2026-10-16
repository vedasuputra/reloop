import { PRESETS } from "@/lib/data";
import type { OrgInfo } from "@/lib/context";

/** GET form for organisation, brand type and pack collection method. Hidden fields keep other filters. */
export default function Controls({
  method, presetKey, orgId, orgs, action, hidden = {},
}: {
  method: string; presetKey: string; orgId: string; orgs: OrgInfo[];
  action: string; hidden?: Record<string, string>;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded border p-3 text-sm">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label className="flex flex-col">
        Data
        <select name="org" defaultValue={orgId} className="rounded border bg-transparent p-1">
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col">
        Tipe brand (kemasan sekali pakai)
        <select name="preset" defaultValue={presetKey} className="rounded border bg-transparent p-1">
          {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col">
        Cara kemasan kembali
        <select name="method" defaultValue={method} className="rounded border bg-transparent p-1">
          <option value="courier_pickup">Dijemput kurir</option>
          <option value="dropoff">Drop-off (tanpa kurir)</option>
        </select>
      </label>
      <button className="rounded border px-3 py-1">Terapkan</button>
    </form>
  );
}
