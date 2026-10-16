/**
 * ReLoop AI - retrain the return model on one company's own orders.
 * TypeScript version of train_model.py: same features, same reference category,
 * same time-based split (train on the earliest 75%, test on the latest 25%),
 * and the same logistic regression as scikit-learn's default (L2 penalty, C = 1,
 * intercept not penalised), solved with Newton's method.
 */
import type { Model } from "@/lib/rvs";

export interface TrainRow {
  order_date: string | null;
  category: string;
  payment_method: string;
  multi_size: number;
  voucher_used: number;
  quantity_of_item: number;
  past_delivered_in_data: number;
  customer_return_rate_in_data: number | null;
  was_returned: number; // 0/1
}

export interface TrainedModel extends Model {
  model: "logistic_regression";
  reference_category: string;
  trained_at: string;
  metrics: {
    auc_model: number;
    auc_baseline_category_mean: number;
    n_train: number;
    n_test: number;
    test_return_rate: number;
  };
}

export const MIN_TRAIN_ROWS = 200;
const BASE_FEATURES = ["multi_size", "cod", "voucher_used", "qty_2plus", "has_history", "cust_rr"];

/** Area under the ROC curve (ties count half). */
export function auc(y: number[], score: number[]): number {
  const idx = y.map((_, i) => i).sort((a, b) => score[a] - score[b]);
  const rank = new Array(y.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && score[idx[j + 1]] === score[idx[i]]) j++;
    for (let k = i; k <= j; k++) rank[idx[k]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  const pos = y.filter((v) => v === 1).length, neg = y.length - pos;
  let sum = 0;
  y.forEach((v, i) => { if (v === 1) sum += rank[i]; });
  return (sum - (pos * (pos + 1)) / 2) / (pos * neg);
}

function features(r: TrainRow, cats: string[]): number[] {
  return [
    Number(r.multi_size),
    r.payment_method === "COD" ? 1 : 0,
    Number(r.voucher_used),
    Number(r.quantity_of_item) >= 2 ? 1 : 0,
    Number(r.past_delivered_in_data) > 0 ? 1 : 0,
    r.customer_return_rate_in_data ?? 0,
    ...cats.slice(1).map((c) => (r.category === c ? 1 : 0)),
  ];
}

/** Solve a small linear system A x = b (Gaussian elimination with pivoting). */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/** Logistic regression, L2 penalty with C = 1 (like sklearn), intercept is the last weight and not penalised. */
export function fitLogistic(X: number[][], y: number[], C = 1): number[] {
  const d = X[0].length + 1;
  let w = new Array(d).fill(0);
  for (let it = 0; it < 100; it++) {
    const g = new Array(d).fill(0);
    const H = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < X.length; i++) {
      const x = [...X[i], 1];
      let z = 0;
      for (let k = 0; k < d; k++) z += w[k] * x[k];
      const p = 1 / (1 + Math.exp(-z)), wt = p * (1 - p);
      for (let a = 0; a < d; a++) {
        g[a] += C * (p - y[i]) * x[a];
        if (x[a] === 0) continue;
        for (let b = a; b < d; b++) H[a][b] += C * wt * x[a] * x[b];
      }
    }
    for (let a = 0; a < d; a++) for (let b = 0; b < a; b++) H[a][b] = H[b][a];
    for (let k = 0; k < d - 1; k++) { g[k] += w[k]; H[k][k] += 1; }
    const step = solve(H, g);
    w = w.map((v, k) => v - step[k]);
    if (Math.max(...step.map(Math.abs)) < 1e-10) break;
  }
  return w;
}

/** Why a dataset cannot be used for training, or null when it can. */
export function cannotTrain(rows: TrainRow[]): string | null {
  if (rows.length < MIN_TRAIN_ROWS)
    return `Butuh minimal ${MIN_TRAIN_ROWS} order terkirim yang punya kolom was_returned; sekarang baru ${rows.length}.`;
  const sorted = [...rows].sort(byDate);
  const cut = Math.floor(sorted.length * 0.75);
  for (const part of [sorted.slice(0, cut), sorted.slice(cut)]) {
    const r = part.filter((x) => x.was_returned === 1).length;
    if (r === 0 || r === part.length)
      return "Data harus berisi order yang di-return dan yang tidak, baik di bagian lama maupun bagian terbaru.";
  }
  return null;
}

const byDate = (a: TrainRow, b: TrainRow) => (a.order_date ?? "").localeCompare(b.order_date ?? "");

/** Train on the earliest 75% of orders, test on the latest 25% (as in train_model.py). */
export function trainModel(rows: TrainRow[]): TrainedModel {
  const why = cannotTrain(rows);
  if (why) throw new Error(why);
  const D = [...rows].sort(byDate);
  const cats = [...new Set(D.map((r) => r.category))].sort();
  const cut = Math.floor(D.length * 0.75);
  const tr = D.slice(0, cut), te = D.slice(cut);
  const w = fitLogistic(tr.map((r) => features(r, cats)), tr.map((r) => r.was_returned));
  const names = [...BASE_FEATURES, ...cats.slice(1).map((c) => "cat_" + c)];
  const coefficients = Object.fromEntries(names.map((n, k) => [n, w[k]]));
  const intercept = w[w.length - 1];

  const prob = (r: TrainRow) => {
    const x = features(r, cats);
    let z = intercept;
    x.forEach((v, k) => (z += w[k] * v));
    return 1 / (1 + Math.exp(-z));
  };
  // baseline: each category's return rate in the training part
  const rate = new Map<string, [number, number]>();
  for (const r of tr) {
    const [s, n] = rate.get(r.category) ?? [0, 0];
    rate.set(r.category, [s + r.was_returned, n + 1]);
  }
  const overall = tr.reduce((s, r) => s + r.was_returned, 0) / tr.length;
  const base = (r: TrainRow) => { const v = rate.get(r.category); return v ? v[0] / v[1] : overall; };
  const yte = te.map((r) => r.was_returned);
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return {
    model: "logistic_regression",
    intercept, coefficients, reference_category: cats[0],
    trained_at: new Date().toISOString(),
    metrics: {
      auc_model: r3(auc(yte, te.map(prob))),
      auc_baseline_category_mean: r3(auc(yte, te.map(base))),
      n_train: tr.length, n_test: te.length,
      test_return_rate: r3(yte.reduce((a, b) => a + b, 0) / yte.length),
    },
  };
}
