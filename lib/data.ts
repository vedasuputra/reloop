import { createClient } from "@/lib/supabase/server";
import {
  scoreOrder, withPreset, settingsFromConfig, packReturnProb,
  type Config, type Model, type Order, type CollectionMethod, type RvsResult,
} from "@/lib/rvs";
import configJson from "@/data/config.json";
import modelJson from "@/data/return_model.json";

export const baseConfig = configJson as unknown as Config;
export const model = modelJson as unknown as Model;

/** Demo presets from config.json (key + label). */
export const PRESETS: { key: string; label: string }[] = Object.entries(
  (configJson as unknown as { presets?: Record<string, { label: string }> }).presets ?? {},
)
  .filter(([k]) => !k.startsWith("_"))
  .map(([k, v]) => ({ key: k, label: v.label }));

export const DEFAULT_PRESET = "acuan_ukuran_baju";

/** One row of the Supabase "orders" table. */
export interface Row {
  id: number;
  order_id: string;
  customer_id: string;
  address: string | null;
  order_date: string | null;
  category: string;
  quantity_of_item: number;
  order_value_vnd: number;
  multi_size: number;
  payment_method: string;
  voucher_used: number;
  estimated_delivery_distance_km: number | string;
  order_status: string;
  past_delivered_in_data: number;
  customer_return_rate_in_data: number | string | null;
  was_returned: number | string | null;
  data_source: string | null;
}

export interface Scored {
  row: Row;
  order: Order;
  r: RvsResult;
  lostProb: number; // chance a reusable pack is lost
}

export type Params = { method?: string; preset?: string; org?: string; [k: string]: string | undefined };

/** A company's own numbers (stored per organisation in Supabase, table org_settings). */
export interface CostSettings {
  single_use_mailer_vnd: number;
  single_use_box_vnd: number;
  reusable_pack_vnd: number;
  reuse_cycles: number;
  cleaning_per_reuse_vnd: number;
  default_method: CollectionMethod;
  dropoff_recovery_target: number; // 0-1
  tariff_noi_tinh: number;
  tariff_noi_vung: number;
  tariff_lien_vung: number;
  pickup_order_share: number;      // 0-1, courier pickup fee as share of outbound fee
}

/** The reference numbers (sourced), used as defaults in the settings form. */
export function defaultCostSettings(cfg: Config = baseConfig): CostSettings {
  const v = (s: string, k: string) => cfg[s][k].value;
  const t = v("logistics", "ghn_tariff_vnd");
  return {
    single_use_mailer_vnd: v("packaging", "single_use_mailer_vnd"),
    single_use_box_vnd: v("packaging", "single_use_box_vnd"),
    reusable_pack_vnd: v("packaging", "reusable_pack_vnd"),
    reuse_cycles: v("packaging", "reuse_cycles"),
    cleaning_per_reuse_vnd: v("packaging", "cleaning_per_reuse_vnd"),
    default_method: v("logistics", "pack_collection_method") === "dropoff" ? "dropoff" : "courier_pickup",
    dropoff_recovery_target: v("generator", "dropoff_recovery_target"),
    tariff_noi_tinh: t.noi_tinh, tariff_noi_vung: t.noi_vung, tariff_lien_vung: t.lien_vung,
    pickup_order_share: v("logistics", "pickup_order_share"),
  };
}

/** Copy of the config with a company's own numbers applied. Weights and the 70 threshold are never changed. */
export function applyCostSettings(cfg: Config, c: CostSettings): Config {
  const out: Config = JSON.parse(JSON.stringify(cfg));
  const set = (s: string, k: string, val: unknown) => { out[s][k] = { ...out[s][k], value: val }; };
  set("packaging", "single_use_mailer_vnd", c.single_use_mailer_vnd);
  set("packaging", "single_use_box_vnd", c.single_use_box_vnd);
  set("packaging", "reusable_pack_vnd", c.reusable_pack_vnd);
  set("packaging", "reuse_cycles", c.reuse_cycles);
  set("packaging", "cleaning_per_reuse_vnd", c.cleaning_per_reuse_vnd);
  set("generator", "dropoff_recovery_target", c.dropoff_recovery_target);
  set("logistics", "ghn_tariff_vnd", { noi_tinh: c.tariff_noi_tinh, noi_vung: c.tariff_noi_vung, lien_vung: c.tariff_lien_vung });
  set("logistics", "pickup_order_share", c.pickup_order_share);
  return out;
}

export const CUSTOM_PRESET = "custom";

/** Read method + preset from the URL. "custom" uses the organisation's own numbers when they exist. */
export function readSettings(sp: Params, custom: CostSettings | null = null) {
  const valid = PRESETS.some((p) => p.key === sp.preset) || (custom !== null && sp.preset === CUSTOM_PRESET);
  const presetKey = valid ? sp.preset! : custom ? CUSTOM_PRESET : DEFAULT_PRESET;
  const method: CollectionMethod =
    sp.method === "dropoff" || sp.method === "courier_pickup"
      ? sp.method
      : presetKey === CUSTOM_PRESET && custom ? custom.default_method : "courier_pickup";
  const cfg = presetKey === CUSTOM_PRESET && custom
    ? applyCostSettings(baseConfig, custom)
    : withPreset(baseConfig, presetKey);
  return { method, presetKey, cfg };
}

/** Orders of one organisation (RLS still applies), in pages of 1,000. */
export async function fetchOrders(orgId: string): Promise<Row[]> {
  const supabase = await createClient();
  const all: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("orders").select("*").eq("org_id", orgId).order("id").range(from, from + 999);
    if (error) throw error;
    all.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return all;
}

export function toOrder(r: Row): Order {
  return {
    category: r.category,
    payment_method: r.payment_method,
    multi_size: Number(r.multi_size),
    voucher_used: Number(r.voucher_used),
    quantity_of_item: Number(r.quantity_of_item),
    past_delivered_in_data: Number(r.past_delivered_in_data),
    customer_return_rate_in_data:
      r.customer_return_rate_in_data === null ? null : Number(r.customer_return_rate_in_data),
    estimated_delivery_distance_km: Number(r.estimated_delivery_distance_km),
  };
}

/** Score every order that still needs packing (Cancelled excluded). */
export function scoreAll(rows: Row[], cfg: Config, method: CollectionMethod, m: Model = model): Scored[] {
  const s = settingsFromConfig(cfg);
  const q1 = s.recoveryIfReturned;
  const q0 = method === "dropoff" ? s.recoveryIfKeptDropoff : s.recoveryIfKeptCourier;
  const bom = cfg.logistics.failed_delivery_rate.value;
  return rows
    .filter((row) => row.order_status !== "Cancelled")
    .map((row) => {
      const order = toOrder(row);
      const r = scoreOrder(cfg, m, order, method, s);
      const p = r.predReturnProb;
      const lostProb = (1 - bom) * (p * (1 - q1) + (1 - p) * (1 - q0));
      return { row, order, r, lostProb };
    });
}

export { packReturnProb, settingsFromConfig };

/** Actual return rate per category from delivered orders that have a was_returned label. */
export function categoryReturnRates(rows: Row[]): Map<string, { rate: number; n: number }> {
  const acc = new Map<string, [number, number]>();
  for (const r of rows) {
    if (r.order_status !== "Delivered" || r.was_returned === null || r.was_returned === "") continue;
    const [s, n] = acc.get(r.category) ?? [0, 0];
    acc.set(r.category, [s + Number(r.was_returned), n + 1]);
  }
  return new Map([...acc].map(([c, [s, n]]) => [c, { rate: s / n, n }]));
}

// Formatting and labels live in lib/i18n.ts (fmt, methodLabel, presetLabel).

/** Delivered orders with a was_returned label, in the shape the trainer needs. */
export function trainingRows(rows: Row[]) {
  return rows
    .filter((r) => r.order_status === "Delivered" && r.was_returned !== null && r.was_returned !== "")
    .map((r) => ({ ...toOrder(r), order_id: r.order_id, order_date: r.order_date, was_returned: Number(r.was_returned) === 1 ? 1 : 0 }));
}
