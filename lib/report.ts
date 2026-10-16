import type { Scored } from "@/lib/data";
import type { Config } from "@/lib/rvs";

/**
 * Pack weights for the sustainability report.
 * Mailer: K&S Lazada listing "500gr" pack, 25x35 ~50 bags (10 g) and 28x42 ~39 bags (12.8 g), average ~11.4 g.
 * Reusable 30x40 zip bag: 1 kg / 55 pcs = ~18 g (khanghuystore), same as config.non_cost_value.pack_weight_kg.
 * Box weight: no source yet, so boxes are counted but not weighed.
 */
export const MAILER_KG = 0.0114;
export const REUSABLE_KG = 0.018;

export interface ReportRow {
  key: string;            // "2024-03" or "Total"
  orders: number;
  reusableUses: number;   // orders that ship in a reusable pack
  mailersAvoided: number;
  boxesAvoided: number;
  newReusablePacks: number; // worn out (uses / cycles) + expected lost
  plasticAvoidedKg: number; // mailers only
  plasticUsedKg: number;    // new reusable packs
  costSingle: number;
  costReloop: number;
  eprSimVnd: number | null;
}

export function buildReport(scored: Scored[], cfg: Config): ReportRow[] {
  const cycles = cfg.packaging.reuse_cycles.value as number;
  const boxCats = cfg.packaging.box_categories.value as string[];
  const N = cfg.non_cost_value;
  const eprPerKg = N.fs_vnd_per_kg.value != null && N.mandatory_recycling_rate.value != null && N.epr_applies_to_client.value
    ? N.mandatory_recycling_rate.value * N.fs_vnd_per_kg.value * (1 + (N.admin_share.value ?? 0)) : null;

  const groups = new Map<string, Scored[]>();
  for (const s of scored) {
    const k = (s.row.order_date ?? "").slice(0, 7) || "Tanpa tanggal";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  }
  const make = (key: string, list: Scored[]): ReportRow => {
    const reu = list.filter((s) => s.r.recommendation === "REUSABLE");
    const boxes = reu.filter((s) => boxCats.includes(s.row.category)).length;
    const mailers = reu.length - boxes;
    const lost = reu.reduce((t, s) => t + s.lostProb, 0);
    const newPacks = reu.length / cycles + lost;
    const avoided = mailers * MAILER_KG;
    return {
      key, orders: list.length, reusableUses: reu.length, mailersAvoided: mailers, boxesAvoided: boxes,
      newReusablePacks: newPacks, plasticAvoidedKg: avoided, plasticUsedKg: newPacks * REUSABLE_KG,
      costSingle: list.reduce((t, s) => t + s.r.expCostSingleVnd, 0),
      costReloop: list.reduce((t, s) => t + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0),
      eprSimVnd: eprPerKg === null ? null : avoided * eprPerKg,
    };
  };
  const rows = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([k, l]) => make(k, l));
  return [...rows, make("Total", scored)];
}
