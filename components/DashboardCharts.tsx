import type { ReactNode } from "react";

/**
 * Dashboard charts, drawn as plain SVG / CSS (no chart library). Everything is passed in already calculated
 * and already formatted, so these components only draw. Colors follow the dashboard:
 * teal for the main series, the three recommendation colors for the score bands.
 * Hovering a bar or dot shows a styled tooltip at once (pure CSS, no script): an invisible HTML cell sits over
 * each mark, and its tooltip appears on hover or keyboard focus.
 */

const INK = "#174538";
const MUTED = "#355E3B";
export const TEAL = "#37a486";
export const TEAL_LIGHT = "#84d6c0";
export const TRACK_COLOR = "#d0f0e7";
export const BAND = { single: "#fffb9d", review: "#d6ef89", reusable: "#2a7e67" } as const;

/** White card with a title, used around every chart. */
export function ChartCard({ title, sub, children, footer }: { title: string; sub?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex flex-col rounded-[9px] border border-[#174538]/15 bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      {sub && <div className="mt-1.5 text-xs leading-relaxed text-[#355E3B]">{sub}</div>}
      <div className="mt-4 flex-1">{children}</div>
      {footer && <div className="mt-4 text-xs leading-relaxed text-[#355E3B]">{footer}</div>}
    </div>
  );
}

export function Swatch({ color, label, round }: { color: string; label: string; round?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 ${round ? "rounded-full" : "rounded-[2px]"}`} style={{ background: color }} />
      {label}
    </span>
  );
}

/** A round axis maximum with a whole-number half way mark (2, 4, 6, 8, 10 times a power of ten). */
function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, v)));
  return ([2, 4, 6, 8, 10].map((k) => k * p).find((m) => m >= v)) ?? 10 * p;
}

/* ------------------------------------------------------------------ hover tooltips */

/** A hover area in chart units (x, y, w, h) plus the point (ax, ay) the tooltip points at. */
interface Cell { x: number; y: number; w: number; h: number; ax: number; ay: number; text: string; round?: boolean }

/** Invisible cells laid over a chart; each shows its tooltip immediately on hover or focus. */
function HoverLayer({ W, H, cells }: { W: number; H: number; cells: Cell[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {cells.map((c, i) => {
        const fx = c.ax / W;
        const shift = fx < 0.18 ? "0%" : fx > 0.82 ? "-100%" : "-50%"; // keep the tooltip inside the card near the edges
        return (
          <div key={i} tabIndex={0} aria-label={c.text}
            className={`group pointer-events-auto absolute outline-none transition-colors hover:bg-[#174538]/[0.07] focus-visible:bg-[#174538]/[0.07] ${c.round ? "rounded-full" : "rounded-[3px]"}`}
            style={{ left: `${(c.x / W) * 100}%`, top: `${(c.y / H) * 100}%`, width: `${(c.w / W) * 100}%`, height: `${(c.h / H) * 100}%` }}>
            <span role="tooltip"
              className="pointer-events-none absolute z-30 hidden whitespace-pre rounded-[6px] bg-[#174538] px-2.5 py-1.5 text-xs font-medium text-[#FFFEF6] shadow-[0_8px_24px_-8px_rgba(23,69,56,0.6)] group-hover:block group-focus-visible:block"
              style={{ left: `${((c.ax - c.x) / c.w) * 100}%`, top: `${((c.ay - c.y) / c.h) * 100}%`, transform: `translate(${shift}, calc(-100% - 8px))` }}>
              {c.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ RVS score histogram */

/** Orders by Reuse Viability Score in bins of 10, colored by recommendation band, with the 40 and 70 thresholds marked. */
export function RvsHistogram({ bins, names, fmt, tip, label }: {
  bins: number[]; names: { single: string; review: string; reusable: string }; fmt: (n: number) => string;
  tip: (range: string, count: number) => string; label: string;
}) {
  const W = 600, H = 260, L = 48, R = 10, T = 32, B = 30;
  const pw = W - L - R, ph = H - T - B, bw = pw / 10;
  const max = niceMax(Math.max(...bins));
  const y = (v: number) => T + ph - (v / max) * ph;
  const color = (i: number) => (i < 4 ? BAND.single : i < 7 ? BAND.review : BAND.reusable);
  const cells: Cell[] = bins.map((v, i) => ({
    x: L + i * bw, y: T, w: bw, h: ph, ax: L + i * bw + bw / 2, ay: Math.min(y(v) - 16, T + ph - 4), // above the bar's own count label
    text: tip(i === 9 ? "90–100" : `${i * 10}–${i * 10 + 9}`, v),
  }));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full">
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={INK} strokeOpacity={v === 0 ? 0.35 : 0.1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmt(v)}</text>
          </g>
        ))}
        {bins.map((v, i) => (
          <g key={i}>
            <rect x={L + i * bw + 3} y={y(v)} width={bw - 6} height={Math.max(0, T + ph - y(v))} rx="2" fill={color(i)} />
            {v > 0 && <text x={L + i * bw + bw / 2} y={y(v) - 5} textAnchor="middle" fontSize="11" fill={INK}>{fmt(v)}</text>}
          </g>
        ))}
        {[4, 7].map((i) => <line key={i} x1={L + i * bw} x2={L + i * bw} y1={T - 8} y2={T + ph} stroke={INK} strokeOpacity={0.45} strokeDasharray="4 4" />)}
        {[[0, 4, names.single], [4, 7, names.review], [7, 10, names.reusable]].map(([a, b, name]) => (
          <text key={name as string} x={L + (((a as number) + (b as number)) / 2) * bw} y={T - 14} textAnchor="middle" fontSize="12" fontWeight="600" fill={INK}>{name}</text>
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <text key={i} x={L + i * bw} y={H - 10} textAnchor="middle" fontSize="11" fill={MUTED}>{i * 10}</text>
        ))}
      </svg>
      <HoverLayer W={W} H={H} cells={cells} />
    </div>
  );
}

/* ------------------------------------------------------------------ scenario lines */

/** Lines over a few x positions, with the zero line marked and the last value printed at the end of each line. */
export function LineChart({ xs, series, fmt, tip, label }: {
  xs: string[]; series: { name: string; color: string; points: number[] }[]; fmt: (n: number) => string;
  tip: (series: string, x: string, value: number) => string; label: string;
}) {
  const W = 700, H = 260, L = 66, R = 78, T = 16, B = 30;
  const pw = W - L - R, ph = H - T - B;
  const all = series.flatMap((s) => s.points);
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * 0.12;
  lo = lo < 0 ? lo - pad : lo; hi = hi > 0 ? hi + pad : hi;
  const x = (i: number) => L + (xs.length === 1 ? pw / 2 : (i / (xs.length - 1)) * pw);
  const y = (v: number) => T + ph - ((v - lo) / (hi - lo)) * ph;
  const ticks = [...new Set([lo, 0, hi].map((v) => Math.round(v)))];
  const cells: Cell[] = series.flatMap((s) => s.points.map((v, i) => ({
    x: x(i) - 13, y: y(v) - 13, w: 26, h: 26, ax: x(i), ay: y(v) - 6, text: tip(s.name, xs[i], v), round: true,
  })));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={INK} strokeOpacity={v === 0 ? 0.45 : 0.1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill={MUTED}>{fmt(v)}</text>
          </g>
        ))}
        {xs.map((t, i) => <text key={t} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill={MUTED}>{t}</text>)}
        {series.map((s) => (
          <g key={s.name}>
            <polyline points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {s.points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={s.color} />)}
            <text x={x(s.points.length - 1) + 10} y={y(s.points[s.points.length - 1]) + 4} fontSize="12" fontWeight="600" fill={INK}>{fmt(s.points[s.points.length - 1])}</text>
          </g>
        ))}
      </svg>
      <HoverLayer W={W} H={H} cells={cells} />
    </div>
  );
}

/* ------------------------------------------------------------------ monthly charts */

export interface MonthPoint { key: string; orders: number; reusable: number; predicted: number }

/** Two stacked charts over the months in the data: orders (Reusable ones in dark green) and the average predicted return probability. */
export function MonthlyCharts({ months, fmtN, fmtPct, tipOrders, tipReturn, labels }: {
  months: MonthPoint[]; fmtN: (n: number) => string; fmtPct: (n: number) => string;
  tipOrders: (m: MonthPoint) => string; tipReturn: (m: MonthPoint) => string;
  labels: { orders: string; returns: string };
}) {
  const W = 1000, L = 52, R = 10; // drawn near its on-screen width, so the text keeps its size
  const pw = W - L - R, bw = pw / months.length;
  const step = Math.ceil(months.length / 12);
  const short = (k: string) => `${k.slice(5)}/${k.slice(2, 4)}`;
  const xLabels = (H: number) => months.map((m, i) => i % step === 0 && (
    <text key={m.key} x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED}>{short(m.key)}</text>
  ));

  // chart 1: orders per month
  const H1 = 190, T1 = 14, B1 = 28, ph1 = H1 - T1 - B1;
  const max1 = niceMax(Math.max(...months.map((m) => m.orders)));
  const y1 = (v: number) => T1 + ph1 - (v / max1) * ph1;
  const cells1: Cell[] = months.map((m, i) => ({ x: L + i * bw, y: T1, w: bw, h: ph1, ax: L + i * bw + bw / 2, ay: Math.min(y1(m.orders), T1 + ph1 - 4), text: tipOrders(m) }));

  // chart 2: average predicted return probability
  const H2 = 170, T2 = 14, B2 = 28, ph2 = H2 - T2 - B2;
  const top2 = Math.max(0.05, Math.ceil(Math.max(...months.map((m) => m.predicted)) * 20) / 20 + 0.05);
  const y2 = (v: number) => T2 + ph2 - (v / top2) * ph2;
  const px = (i: number) => L + i * bw + bw / 2;
  const cells2: Cell[] = months.map((m, i) => ({ x: L + i * bw, y: T2, w: bw, h: ph2, ax: px(i), ay: y2(m.predicted) - 4, text: tipReturn(m) }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold">{labels.orders}</p>
        <div className="relative mt-2">
          <svg viewBox={`0 0 ${W} ${H1}`} role="img" aria-label={labels.orders} className="block h-auto w-full">
            {[0, max1 / 2, max1].map((v) => (
              <g key={v}>
                <line x1={L} x2={W - R} y1={y1(v)} y2={y1(v)} stroke={INK} strokeOpacity={v === 0 ? 0.35 : 0.1} />
                <text x={L - 8} y={y1(v) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmtN(v)}</text>
              </g>
            ))}
            {months.map((m, i) => (
              <g key={m.key}>
                <rect x={L + i * bw + 2} y={y1(m.orders)} width={Math.max(1, bw - 4)} height={T1 + ph1 - y1(m.orders)} rx="1.5" fill={TRACK_COLOR} />
                {m.reusable > 0 && <rect x={L + i * bw + 2} y={y1(m.reusable)} width={Math.max(1, bw - 4)} height={T1 + ph1 - y1(m.reusable)} rx="1.5" fill={BAND.reusable} />}
              </g>
            ))}
            {xLabels(H1)}
          </svg>
          <HoverLayer W={W} H={H1} cells={cells1} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold">{labels.returns}</p>
        <div className="relative mt-2">
          <svg viewBox={`0 0 ${W} ${H2}`} role="img" aria-label={labels.returns} className="block h-auto w-full">
            {[0, top2 / 2, top2].map((v) => (
              <g key={v}>
                <line x1={L} x2={W - R} y1={y2(v)} y2={y2(v)} stroke={INK} strokeOpacity={v === 0 ? 0.35 : 0.1} />
                <text x={L - 8} y={y2(v) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmtPct(v)}</text>
              </g>
            ))}
            <polyline points={months.map((m, i) => `${px(i)},${y2(m.predicted)}`).join(" ")} fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {months.map((m, i) => <circle key={m.key} cx={px(i)} cy={y2(m.predicted)} r="2.8" fill={TEAL} />)}
            {xLabels(H2)}
          </svg>
          <HoverLayer W={W} H={H2} cells={cells2} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ courier vs drop-off */

export interface MethodResult { name: string; selected: boolean; reusable: number; share: number; diffPer1000: number }

/** The same orders under both ways of getting packs back: how many become Reusable and what the cost difference is. */
export function MethodCompare({ items, fmtN, fmtPct, fmtVnd, text }: {
  items: MethodResult[]; fmtN: (n: number) => string; fmtPct: (n: number) => string; fmtVnd: (n: number) => string;
  text: { reusable: string; cost: string; selected: string; saved: string; more: string; none: string };
}) {
  const maxShare = Math.max(0.0001, ...items.map((i) => i.share));
  const maxDiff = Math.max(1, ...items.map((i) => Math.abs(i.diffPer1000)));
  const color = (i: MethodResult) => (i.selected ? TEAL : TEAL_LIGHT);
  const bar = (frac: number, c: string) => (
    <div className="h-2.5 flex-1 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
      <div className="h-full" style={{ width: `${Math.min(1, frac) * 100}%`, background: c }} />
    </div>
  );
  return (
    // justify-evenly: the two blocks spread over the card, so a taller neighbour does not leave a gap at the bottom
    <div className="flex h-full flex-col justify-evenly gap-5">
      {[
        { title: text.reusable, row: (i: MethodResult) => ({ frac: i.share / maxShare, value: `${fmtN(i.reusable)} (${fmtPct(i.share)})` }) },
        { title: text.cost, row: (i: MethodResult) => ({
          frac: Math.abs(i.diffPer1000) / maxDiff,
          value: Math.round(i.diffPer1000) === 0 ? text.none : `${fmtVnd(Math.abs(i.diffPer1000))} ${i.diffPer1000 > 0 ? text.saved : text.more}`,
        }) },
      ].map((metric) => (
        <div key={metric.title}>
          <p className="text-xs font-semibold">{metric.title}</p>
          <div className="mt-2.5 space-y-3.5">
            {items.map((i) => {
              const r = metric.row(i);
              return (
                <div key={i.name}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span>{i.name}{i.selected && <span className="ml-2 rounded-[6px] border border-[#b7dccf] bg-[#DEF4EE] px-1.5 py-0.5 text-[10px] font-semibold">{text.selected}</span>}</span>
                    <b className="text-sm">{r.value}</b>
                  </div>
                  <div className="mt-1.5 flex">{bar(r.frac, color(i))}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ dot plot (predicted vs actual) */

export interface DotRow {
  name: string; orders: number; predicted: number; actual?: number;
  mix: { reusable: number; review: number; single: number }; tip: string;
}

/**
 * One row per category. Left: orders. Middle: a filled dot for the predicted return rate and a ring for the actual one, joined
 * by a line, so the gap between the model and reality shows at a glance. Right: a slim stacked bar of how the category is packed
 * (Reusable / Review / Single-use). Hover a row for every number. On phones it scrolls sideways instead of shrinking.
 */
export function DotPlot({ rows, fmtN, fmtPct, labels }: {
  rows: DotRow[]; fmtN: (n: number) => string; fmtPct: (n: number) => string;
  labels: { orders: string; predicted: string; actual: string; mix: string; legendPredicted: string; legendActual: string; reusable: string; review: string; single: string };
}) {
  const W = 1000, rowH = 46, T = 36, B = 28;
  const H = T + rows.length * rowH + B;
  const X0 = 190, X1 = 620;          // dot plot area (starts close to the category names)
  const MX0 = 855, MX1 = 990;        // mix bar, preceded by the Reusable count
  const top = Math.max(0.05, Math.ceil(Math.max(...rows.flatMap((r) => [r.predicted, r.actual ?? 0])) * 20) / 20);
  const x = (v: number) => X0 + (v / top) * (X1 - X0);
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += 0.1) ticks.push(+v.toFixed(2));
  if (ticks[ticks.length - 1] < top - 1e-6) ticks.push(top);
  const cy = (i: number) => T + i * rowH + rowH / 2;
  const cells: Cell[] = rows.map((r, i) => ({
    x: 0, y: T + i * rowH, w: W, h: rowH, ax: (x(r.predicted) + x(r.actual ?? r.predicted)) / 2, ay: cy(i) - 12, text: r.tip,
  }));
  const dot = (fill: string, stroke?: string) => (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r={stroke ? 5.5 : 5} fill={fill} stroke={stroke} strokeWidth={stroke ? 2 : 0} /></svg>
  );
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#355E3B]">
        <span className="flex items-center gap-2">{dot(TEAL)}{labels.legendPredicted}</span>
        <span className="flex items-center gap-2">{dot("none", INK)}{labels.legendActual}</span>
        <span className="hidden h-3 w-px bg-[#174538]/20 md:block" />
        <span className="flex items-center gap-2">{dot(BAND.reusable)}{labels.reusable}</span>
        <span className="flex items-center gap-2">{dot(BAND.review)}{labels.review}</span>
        <span className="flex items-center gap-2">{dot(BAND.single)}{labels.single}</span>
      </div>
      {/* Scrolls sideways on phones only; on larger screens the tooltips may stick out above the first row */}
      <div className="max-md:overflow-x-auto">
        <div className="relative md:min-w-0 max-md:min-w-[720px]">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${labels.legendPredicted} / ${labels.legendActual}`} className="block h-auto w-full">
            <defs>
              {rows.map((_, i) => <clipPath key={i} id={`mixclip${i}`}><rect x={MX0} y={cy(i) - 5} width={MX1 - MX0} height={10} rx={2} /></clipPath>)}
            </defs>
            {[[690, labels.predicted], [755, labels.actual], [830, labels.reusable]].map(([px, text]) => (
              <text key={text as string} x={px as number} y={20} textAnchor="end" fontSize="12" fontWeight="600" fill={MUTED}>{text}</text>
            ))}
            <text x={MX0} y={20} fontSize="12" fontWeight="600" fill={MUTED}>{labels.mix}</text>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={x(v)} x2={x(v)} y1={T} y2={T + rows.length * rowH} stroke={INK} strokeOpacity={v === 0 ? 0.3 : 0.08} />
                <text x={x(v)} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED}>{fmtPct(v)}</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const total = Math.max(1, r.mix.reusable + r.mix.review + r.mix.single);
              const wRe = ((MX1 - MX0) * r.mix.reusable) / total, wRv = ((MX1 - MX0) * r.mix.review) / total;
              return (
                <g key={r.name}>
                  <line x1={0} x2={W} y1={T + i * rowH} y2={T + i * rowH} stroke={INK} strokeOpacity={0.08} />
                  <text x={0} y={cy(i) - 3} fontSize="14" fontWeight="600" fill={INK}>{r.name}</text>
                  <text x={0} y={cy(i) + 14} fontSize="12" fill={MUTED}>{fmtN(r.orders)} {labels.orders}</text>                  <rect x={X0} y={cy(i) - 3} width={X1 - X0} height={6} rx={3} fill={TRACK_COLOR} />
                  {r.actual !== undefined && (
                    <line x1={x(Math.min(r.predicted, r.actual))} x2={x(Math.max(r.predicted, r.actual))} y1={cy(i)} y2={cy(i)} stroke={TEAL_LIGHT} strokeWidth={5} strokeLinecap="round" />
                  )}
                  <circle cx={x(r.predicted)} cy={cy(i)} r={6} fill={TEAL} />
                  {r.actual !== undefined && <circle cx={x(r.actual)} cy={cy(i)} r={8} fill="none" stroke={INK} strokeWidth={2} />}
                  <text x={690} y={cy(i) + 5} textAnchor="end" fontSize="14" fontWeight="600" fill={INK}>{fmtPct(r.predicted)}</text>
                  <text x={755} y={cy(i) + 5} textAnchor="end" fontSize="14" fontWeight="600" fill={INK}>{r.actual === undefined ? "-" : fmtPct(r.actual)}</text>
                  <text x={830} y={cy(i) + 5} textAnchor="end" fontSize="14" fontWeight="600" fill={INK}>{fmtN(r.mix.reusable)}</text>
                  <g clipPath={`url(#mixclip${i})`}>
                    <rect x={MX0} y={cy(i) - 5} width={MX1 - MX0} height={10} fill={TRACK_COLOR} />
                    <rect x={MX0} y={cy(i) - 5} width={wRe} height={10} fill={BAND.reusable} />
                    <rect x={MX0 + wRe} y={cy(i) - 5} width={wRv} height={10} fill={BAND.review} />
                    <rect x={MX0 + wRe + wRv} y={cy(i) - 5} width={Math.max(0, MX1 - MX0 - wRe - wRv)} height={10} fill={BAND.single} />
                  </g>
                </g>
              );
            })}
            <line x1={0} x2={W} y1={T + rows.length * rowH} y2={T + rows.length * rowH} stroke={INK} strokeOpacity={0.08} />
          </svg>
          <HoverLayer W={W} H={H} cells={cells} />
        </div>
      </div>
    </div>
  );
}
