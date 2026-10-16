/**
 * ReLoop AI - Reuse Viability Score (RVS v2), TypeScript version of rvs.py.
 *
 * RVS v2 = 0.55 * CostAdvantage + 0.30 * PackReturn + 0.15 * ReuseCycles   (each 0-100)
 * >= 70 REUSABLE, 40-69 REVIEW, < 40 SINGLE-USE.
 * Guard: never REUSABLE if reusable is more expensive than the single-use pack.
 *
 * Pure functions: pass in config.json and return_model.json (already parsed),
 * so the same code runs in a Next.js API route, a server action or the browser.
 */

export type CollectionMethod = "courier_pickup" | "dropoff";
export type Route = "noi_tinh" | "noi_vung" | "lien_vung";
export type Recommendation = "REUSABLE" | "REVIEW" | "SINGLE-USE";

/** One order, using the same column names as orders_simulated.csv. */
export interface Order {
  category: string;
  payment_method: string;               // "COD", "E-wallet", ...
  multi_size: number;                   // 0/1
  voucher_used: number;                 // 0/1
  quantity_of_item: number;
  past_delivered_in_data: number;       // earlier delivered orders of this customer
  customer_return_rate_in_data: number | null; // null if no history
  estimated_delivery_distance_km: number;
}

/** config.json: every entry is { value, status, note }. Only shape we rely on. */
export type Config = Record<string, Record<string, { value: any }>>;

export interface Model {
  intercept: number;
  coefficients: Record<string, number>;
}

export interface Settings {
  weights: { cost: number; pack_return: number; cycles: number };
  costFullScoreSaving: number;   // saving share of the single-use cost that earns 100 points
  reusableMin: number;
  reviewMin: number;
  cyclesFullScore: number;
  recoveryIfReturned: number;    // pack rides back with the returned item
  recoveryIfKeptCourier: number;
  recoveryIfKeptDropoff: number;
}

export interface RvsResult {
  predReturnProb: number;
  route: Route;
  expCostSingleVnd: number;
  expCostReusableVnd: number;
  packReturnProb: number;
  scoreCost: number;
  scorePackReturn: number;
  scoreCycles: number;
  rvs: number;
  recommendation: Recommendation;
  reason: string;
}

const v = (cfg: Config, sec: string, key: string) => cfg[sec][key].value;

/** Default settings, read from config.json where they live there. */
export function settingsFromConfig(cfg: Config): Settings {
  const w = cfg.rvs.weights_v2?.value ?? { cost: 0.55, pack_return: 0.3, cycles: 0.15 };
  return {
    weights: w,
    costFullScoreSaving: cfg.rvs.cost_full_score_saving?.value ?? 0.25,
    reusableMin: v(cfg, "rvs", "reusable_min"),
    reviewMin: v(cfg, "rvs", "review_min"),
    cyclesFullScore: 20,
    recoveryIfReturned: 0.89,
    recoveryIfKeptCourier: 0.63,
    recoveryIfKeptDropoff: v(cfg, "generator", "dropoff_recovery_target"),
  };
}

/** Route from distance (assumption until brands upload provinces). */
export function routeFromKm(cfg: Config, km: number): Route {
  const t = v(cfg, "logistics", "route_km_thresholds");
  if (km <= t.noi_tinh_max) return "noi_tinh";
  if (km <= t.noi_vung_max) return "noi_vung";
  return "lien_vung";
}

/** 1. Return probability from the trained logistic regression. */
export function predictReturn(model: Model, o: Order): number {
  const c = model.coefficients;
  let z = model.intercept;
  z += c.multi_size * o.multi_size;
  z += c.cod * (o.payment_method === "COD" ? 1 : 0);
  z += c.voucher_used * o.voucher_used;
  z += c.qty_2plus * (o.quantity_of_item >= 2 ? 1 : 0);
  z += c.has_history * (o.past_delivered_in_data > 0 ? 1 : 0);
  z += c.cust_rr * (o.customer_return_rate_in_data ?? 0);
  z += c["cat_" + o.category] ?? 0; // reference category = 0
  return 1 / (1 + Math.exp(-z));
}

/** Chance the reusable pack comes back. */
export function packReturnProb(cfg: Config, s: Settings, method: CollectionMethod, p: number): number {
  const bom = v(cfg, "logistics", "failed_delivery_rate");
  const q1 = s.recoveryIfReturned;
  const q0 = method === "dropoff" ? s.recoveryIfKeptDropoff : s.recoveryIfKeptCourier;
  return bom + (1 - bom) * (p * q1 + (1 - p) * q0);
}

/** 2. Expected packaging cost per order (VND). */
export function expectedCosts(
  cfg: Config, s: Settings, method: CollectionMethod, o: Order, route: Route, p: number,
): { single: number; reusable: number; perUse: number } {
  const pack = v(cfg, "packaging", "reusable_pack_vnd");
  const cycles = v(cfg, "packaging", "reuse_cycles");
  const perUse = pack / cycles + v(cfg, "packaging", "cleaning_per_reuse_vnd");
  const loss = pack * v(cfg, "packaging", "unrecovered_pack_loss_share");
  const bom = v(cfg, "logistics", "failed_delivery_rate");
  const boxCats: string[] = v(cfg, "packaging", "box_categories");
  const single = boxCats.includes(o.category)
    ? v(cfg, "packaging", "single_use_box_vnd")
    : v(cfg, "packaging", "single_use_mailer_vnd");
  const pickup = method === "dropoff" ? 0 : v(cfg, "logistics", "ghn_tariff_vnd")[route] * v(cfg, "logistics", "pickup_order_share");
  const q1 = s.recoveryIfReturned;
  const q0 = method === "dropoff" ? s.recoveryIfKeptDropoff : s.recoveryIfKeptCourier;
  const ifReturned = q1 * perUse + (1 - q1) * loss;
  const ifKept = q0 * (perUse + pickup) + (1 - q0) * loss;
  const reusable = bom * perUse + (1 - bom) * (p * ifReturned + (1 - p) * ifKept);
  return { single, reusable, perUse };
}

/** 3. Score one order. */
export function scoreOrder(
  cfg: Config, model: Model, o: Order, method: CollectionMethod, s: Settings = settingsFromConfig(cfg),
): RvsResult {
  const p = predictReturn(model, o);
  const route = routeFromKm(cfg, o.estimated_delivery_distance_km);
  const { single, reusable } = expectedCosts(cfg, s, method, o, route, p);
  const saving = single - reusable; // > 0: reusable is cheaper

  // cost: 50 = break-even, 100 = saves >= 25% of single-use cost, 0 = loses a full single-use cost or more
  const scoreCost = saving >= 0
    ? 50 + 50 * Math.min(1, saving / (s.costFullScoreSaving * single))
    : 50 * Math.max(0, 1 + saving / single);
  const pr = packReturnProb(cfg, s, method, p);
  const scorePackReturn = 100 * pr;
  const cycles = v(cfg, "packaging", "reuse_cycles");
  const scoreCycles = 100 * Math.min(cycles / s.cyclesFullScore, 1);

  const w = s.weights;
  const rvs = w.cost * scoreCost + w.pack_return * scorePackReturn + w.cycles * scoreCycles;
  let recommendation: Recommendation =
    rvs >= s.reusableMin ? "REUSABLE" : rvs >= s.reviewMin ? "REVIEW" : "SINGLE-USE";
  if (recommendation === "REUSABLE" && saving < 0) recommendation = "REVIEW"; // guard

  const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
  const reason =
    `return ${Math.round(p * 100)}%; reusable ${fmt(reusable)} vs single-use ${fmt(single)} VND ` +
    `(${saving > 0 ? "cheaper" : "more expensive"}); pack comes back ${Math.round(pr * 100)}% via ${method}`;

  return {
    predReturnProb: p, route, expCostSingleVnd: single, expCostReusableVnd: reusable, packReturnProb: pr,
    scoreCost, scorePackReturn, scoreCycles, rvs, recommendation, reason,
  };
}

/** Apply a demo preset from config.presets (e.g. "brand_premium_box") without mutating cfg. */
export function withPreset(cfg: Config, presetKey: string): Config {
  const preset = (cfg as any).presets?.[presetKey];
  if (!preset) throw new Error(`Unknown preset: ${presetKey}`);
  const out: Config = JSON.parse(JSON.stringify(cfg));
  for (const [k, val] of Object.entries(preset)) {
    if (!k.includes(".")) continue; // label, status, note
    const [sec, key] = k.split(".");
    out[sec][key] = { ...out[sec][key], value: val };
  }
  return out;
}
