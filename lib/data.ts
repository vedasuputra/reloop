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
  (configJson as any).presets ?? {},
)
  .filter(([k]) => !k.startsWith("_"))
  .map(([k, v]: [string, any]) => ({ key: k, label: v.label }));

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

/** Read method + preset from the URL, falling back to safe defaults. */
export function readSettings(sp: Params) {
  const method: CollectionMethod = sp.method === "dropoff" ? "dropoff" : "courier_pickup";
  const presetKey = PRESETS.some((p) => p.key === sp.preset) ? sp.preset! : DEFAULT_PRESET;
  const cfg = withPreset(baseConfig, presetKey);
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
export function scoreAll(rows: Row[], cfg: Config, method: CollectionMethod): Scored[] {
  const s = settingsFromConfig(cfg);
  const q1 = s.recoveryIfReturned;
  const q0 = method === "dropoff" ? s.recoveryIfKeptDropoff : s.recoveryIfKeptCourier;
  const bom = cfg.logistics.failed_delivery_rate.value;
  return rows
    .filter((row) => row.order_status !== "Cancelled")
    .map((row) => {
      const order = toOrder(row);
      const r = scoreOrder(cfg, model, order, method, s);
      const p = r.predReturnProb;
      const lostProb = (1 - bom) * (p * (1 - q1) + (1 - p) * (1 - q0));
      return { row, order, r, lostProb };
    });
}

export { packReturnProb, settingsFromConfig };

export const vnd = (x: number) => Math.round(x).toLocaleString("id-ID") + " VND";
export const pct = (x: number) => Math.round(x * 100) + "%";
export const METHOD_LABEL: Record<CollectionMethod, string> = {
  courier_pickup: "Dijemput kurir",
  dropoff: "Drop-off (tanpa kurir)",
};
