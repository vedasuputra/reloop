import { predictReturn, type Model, type Order } from "@/lib/rvs";
import { auc } from "@/lib/train";

/**
 * Fairness by group and wrong cases, measured on the test part of the data
 * (newest 25% of labelled orders, the same split used for training and AUC).
 */
export type LabelledRow = Order & { order_id: string; order_date: string | null; was_returned: number };

export interface GroupStat {
  group: string;
  n: number;
  actualRate: number;
  predictedRate: number;
  auc: number | null;     // null when the group has only one outcome
  reusableShare: number;  // share of these orders recommended REUSABLE
}

export function testPart(rows: LabelledRow[]): LabelledRow[] {
  const sorted = [...rows].sort((a, b) => (a.order_date ?? "").localeCompare(b.order_date ?? ""));
  return sorted.slice(Math.floor(sorted.length * 0.75));
}

export function groupStats(test: LabelledRow[], model: Model, recOf: Map<string, string>,
  groups: { name: string; test: (r: LabelledRow) => boolean }[]): GroupStat[] {
  return groups.map(({ name, test: inGroup }) => {
    const list = test.filter(inGroup);
    const y = list.map((r) => r.was_returned);
    const p = list.map((r) => predictReturn(model, r));
    const pos = y.filter((v) => v === 1).length;
    return {
      group: name,
      n: list.length,
      actualRate: list.length ? pos / list.length : 0,
      predictedRate: list.length ? p.reduce((a, b) => a + b, 0) / list.length : 0,
      auc: pos > 0 && pos < list.length ? auc(y, p) : null,
      reusableShare: list.length ? list.filter((r) => recOf.get(r.order_id) === "REUSABLE").length / list.length : 0,
    };
  });
}

export interface WrongCase { row: LabelledRow; predicted: number; error: number }

/** Test orders where the predicted return probability was furthest from what happened. */
export function wrongCases(test: LabelledRow[], model: Model, k = 8): WrongCase[] {
  return test
    .map((row) => { const predicted = predictReturn(model, row); return { row, predicted, error: Math.abs(row.was_returned - predicted) }; })
    .sort((a, b) => b.error - a.error)
    .slice(0, k);
}

/** The factors that pushed this order's prediction most (log-odds), for a short "why". */
export function topFactors(model: Model, o: Order): [string, number][] {
  const c = model.coefficients;
  const f: [string, number][] = [
    ["multi_size", c.multi_size * o.multi_size],
    ["cod", c.cod * (o.payment_method === "COD" ? 1 : 0)],
    ["voucher_used", c.voucher_used * o.voucher_used],
    ["qty_2plus", c.qty_2plus * (o.quantity_of_item >= 2 ? 1 : 0)],
    ["has_history", c.has_history * (o.past_delivered_in_data > 0 ? 1 : 0)],
    ["cust_rr", c.cust_rr * (o.customer_return_rate_in_data ?? 0)],
    ["cat_" + o.category, c["cat_" + o.category] ?? 0],
  ];
  return f.filter(([, v]) => Math.abs(v) > 0.05).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2);
}
