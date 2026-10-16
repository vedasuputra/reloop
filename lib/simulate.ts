import type { Scored } from "@/lib/data";

export interface SimRow {
  sharePct: number;
  switched: number;
  totalCost: number;
  extraVsAllSingle: number;      // negative = saving
  extraPer1000: number;
  extraRandomPer1000: number;
  packsAvoidedPer1000: number;
  packsLostPer1000: number;
}

/** Deterministic shuffle so the "random" comparison is the same on every visit. */
function shuffled<T>(arr: T[], seed = 42): T[] {
  const a = [...arr];
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Rank by RVS, switch the top X% to reusable; compare with a random pick. */
export function simulate(scored: Scored[], shares = [0, 10, 20, 30, 40]): SimRow[] {
  const n = scored.length;
  if (n === 0) return [];
  const base = scored.reduce((t, s) => t + s.r.expCostSingleVnd, 0);
  const ranked = [...scored].sort((a, b) => b.r.rvs - a.r.rvs);
  const random = shuffled(scored);

  const costOf = (list: Scored[], k: number) =>
    list.reduce((t, s, i) => t + (i < k ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);

  return shares.map((sharePct) => {
    const k = Math.round((n * sharePct) / 100);
    const total = costOf(ranked, k);
    const totalRandom = costOf(random, k);
    const lost = ranked.slice(0, k).reduce((t, s) => t + s.lostProb, 0);
    return {
      sharePct,
      switched: k,
      totalCost: total,
      extraVsAllSingle: total - base,
      extraPer1000: ((total - base) / n) * 1000,
      extraRandomPer1000: ((totalRandom - base) / n) * 1000,
      packsAvoidedPer1000: (k / n) * 1000,
      packsLostPer1000: (lost / n) * 1000,
    };
  });
}
