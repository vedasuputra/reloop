import { Suspense, type CSSProperties } from "react";
import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppShellSkeleton from "@/components/AppShellSkeleton";
import PageSkeleton from "@/components/PageSkeleton";
import Controls from "@/components/Controls";
import SettingsBar from "@/components/SettingsBar";
import MultiSelect from "@/components/MultiSelect";
import SoftForm from "@/components/SoftForm";
import LiveSearch from "@/components/LiveSearch";
import TableVeil from "@/components/TableVeil";
import OrderLink from "@/components/OrderLink";
import OrderPopup from "@/components/OrderPopup";
import DownloadIcon from "@/components/DownloadIcon";
import RecPill from "@/components/RecPill";
import { BAND, TEAL, TRACK_COLOR } from "@/components/DashboardCharts";
import { loadContext } from "@/lib/context";
import type { Params, Scored } from "@/lib/data";
import { instructionCode, reviewPlan, settingsItems, topFactor } from "@/lib/orderView";
import { buildOrderDetail, categoryBaselines, orderLabels } from "@/lib/orderDetail";
import { methodLabel } from "@/lib/i18n";

const PAGE_SIZE = 50;

export const metadata = { title: "Orders" };

const H = "font-[family-name:var(--font-display)] font-normal tracking-tight";
const BTN = "inline-flex h-10 items-center gap-2 rounded-[9px] px-5 text-sm font-semibold transition-opacity hover:opacity-85"; // 40px with or without a border, like the inputs
const PAGE_BTN = "inline-flex h-9 min-w-9 items-center justify-center rounded-[9px] border px-3 text-sm font-semibold transition-colors";
const INPUT = "h-10 w-full rounded-[9px] border border-[#174538]/25 bg-[#FFFEF6] px-3 py-2 text-sm text-[#174538] outline-none transition-colors placeholder:text-[#355E3B]/60 focus:border-[#174538]";
/** Staggered fade-in: each block starts a little after the previous one. */
const rise = (i: number) => ({ "--d": `${i * 0.08}s` }) as CSSProperties;

const REC_RANK: Record<string, number> = { REUSABLE: 0, REVIEW: 1, "SINGLE-USE": 2 };
/** How each sortable column orders the rows (ascending). */
const SORTERS: Record<string, (a: Scored, b: Scored) => number> = {
  order: (a, b) => a.row.order_id.localeCompare(b.row.order_id, undefined, { numeric: true }),
  category: (a, b) => a.row.category.localeCompare(b.row.category),
  customer: (a, b) => a.row.customer_id.localeCompare(b.row.customer_id, undefined, { numeric: true }),
  dest: (a, b) => (a.row.address ?? "").localeCompare(b.row.address ?? ""),
  prob: (a, b) => a.r.predReturnProb - b.r.predReturnProb,
  rvs: (a, b) => a.r.rvs - b.r.rvs,
  instruction: (a, b) => REC_RANK[a.r.recommendation] - REC_RANK[b.r.recommendation] || b.r.rvs - a.r.rvs,
};
const NUMERIC_FIRST_DESC = ["prob", "rvs"]; // for numbers, the first click shows the highest first

/** Page numbers to show: 1 2 3 4 … 96 for the first pages, 1 … 47 48 49 … 96 in the middle, and so on. */
function pageList(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => keep.add(n));
  const nums = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  nums.forEach((n, i) => { if (i > 0 && n - nums[i - 1] > 1) out.push("gap"); out.push(n); });
  return out;
}

export default function Orders({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    // The fallback keeps the sidebar on screen while the data loads. AppShell reads the language cookie, so it sits in its own boundary.
    <Suspense fallback={
      <Suspense fallback={<AppShellSkeleton />}>
        <AppShell><PageSkeleton /></AppShell>
      </Suspense>
    }>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, model, modelLabel, orgs, orgId, scored, qs, hasCustom, t, f } = await loadContext(sp);

  const list = (v?: string) => (v ?? "").split(",").filter(Boolean);
  const cats = list(sp.category);
  const dests = list(sp.dest);
  const rec = sp.rec ?? "";
  const qRaw = (sp.q ?? "").trim();
  const q = qRaw.toUpperCase();
  const targetRaw = (sp.target ?? "").trim();
  const target = targetRaw === "" || !Number.isFinite(Number(targetRaw)) ? null : Math.min(100, Math.max(0, Number(targetRaw)));
  const sortKey = sp.sort && SORTERS[sp.sort] ? sp.sort : "order"; // visibly sorted by default, so the arrow shows the columns can be sorted
  const dir = sp.dir === "desc" ? "desc" : "asc";
  // the default (Order, ascending) stays out of the address
  const defaultSort = sortKey === "order" && dir === "asc";
  const sortParam = defaultSort ? "" : sortKey;
  const dirParam = defaultSort ? "" : dir;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  // Orders matching the search, categories and destinations; the recommendation cells count within this pool
  const pool = scored.filter((s) =>
    (!cats.length || cats.includes(s.row.category)) &&
    (!dests.length || dests.includes(s.row.address ?? "")) &&
    (!q || s.row.order_id.toUpperCase().includes(q) || s.row.customer_id.toUpperCase().includes(q)));
  const filtered = pool.filter((s) => !rec || s.r.recommendation === rec);
  const sorted = sortKey ? [...filtered].sort((a, b) => (dir === "asc" ? 1 : -1) * SORTERS[sortKey](a, b)) : filtered;
  const count = (r: string) => pool.filter((s) => s.r.recommendation === r).length;
  const reviewTotal = scored.filter((s) => s.r.recommendation === "REVIEW").length;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Filter options with how many orders each has
  const tally = (pick: (s: Scored) => string) => {
    const m = new Map<string, number>();
    for (const s of scored) { const k = pick(s); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([value, n]) => ({ value, label: value, count: n }));
  };
  const catOptions = tally((s) => s.row.category);
  const destOptions = tally((s) => s.row.address ?? "");

  // Details for the order popup: every order on this page (so it opens at once), plus the one named in the address, if any
  const baselines = categoryBaselines(scored);
  const wantedId = (sp.order ?? "").trim().toUpperCase();
  const extra = wantedId ? scored.find((x) => x.row.order_id.toUpperCase() === wantedId) : undefined;
  const forPopup = new Map(shown.map((s) => [s.row.order_id, s]));
  if (extra) forPopup.set(extra.row.order_id, extra);
  const details = Object.fromEntries([...forPopup].map(([id, s]) => [id, buildOrderDetail({ s, baselines, cfg, model, modelLabel, method, t, f })]));

  // Review queue: switch the cheapest Review orders to reusable to fill a management target
  const plan = reviewPlan(scored, target);
  const boxCats = cfg.packaging.box_categories.value as string[];

  const params = (over: Record<string, string> = {}) => {
    const p: Record<string, string> = { category: cats.join(","), dest: dests.join(","), rec, q: qRaw, target: targetRaw, sort: sortParam, dir: dirParam, ...over };
    return Object.entries(p).filter(([, v]) => v).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join("");
  };
  const listHref = (over?: Record<string, string>) => `/orders${qs}${params(over)}`;
  const exportHref = `/export${qs}${params({ sort: "", dir: "" })}`;
  const filtersOn = !!(cats.length || dests.length || rec || qRaw);
  const from = sorted.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, sorted.length);
  const share = (c: number) => (pool.length ? c / pool.length : 0);
  const pct1 = (x: number) => `${f.n(x * 100, 1)}%`;
  const ordersWord = (n: number) => (n === 1 ? t("1 order", "1 đơn") : t(`${n} orders`, `${n} đơn`));

  const chips = [
    { key: "", label: t("All orders", "Tất cả đơn hàng"), n: pool.length, dot: "" },
    { key: "REUSABLE", label: "Reusable", n: count("REUSABLE"), dot: BAND.reusable },
    { key: "REVIEW", label: "Review", n: count("REVIEW"), dot: BAND.review },
    { key: "SINGLE-USE", label: "Single-use", n: count("SINGLE-USE"), dot: BAND.single },
  ];
  const columns: { key: string; label: string }[] = [
    { key: "order", label: t("Order", "Đơn") }, { key: "category", label: t("Category", "Danh mục") },
    { key: "customer", label: t("Customer", "Khách hàng") }, { key: "dest", label: t("Destination", "Nơi nhận") },
    { key: "prob", label: t("Return probability", "Xác suất hoàn") }, { key: "rvs", label: "RVS" },
    { key: "", label: t("Main return factor", "Yếu tố hoàn chính") }, { key: "instruction", label: t("Packing instruction", "Chỉ dẫn đóng gói") },
  ];

  return (
    <AppShell qs={qs} email={user?.email}>
      {/* Pinned to the top once the settings panel has scrolled away */}
      <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")} items={settingsItems(t, orgs, orgId, presetKey, method)} />

      <div className="rl-rise flex flex-wrap items-start justify-between gap-4">
        <h1 className={`${H} text-4xl md:text-5xl`}>{t("Orders", "Đơn hàng")}</h1>
        <div className="flex flex-wrap gap-3">
          <Link href={`/score${qs}`} className={`${BTN} border border-[#174538]/40 bg-white`}>+ {t("Score a new order", "Chấm điểm đơn mới")}</Link>
          <a href={exportHref} className={`${BTN} bg-[#174538] text-[#FFFEF6]`}><DownloadIcon />{t("Packing list", "Danh sách đóng gói")}</a>
        </div>
      </div>

      {/* relative z-20: the open dropdown lists must paint above the sections below */}
      <div id="settings-panel" className="rl-rise relative z-20 mt-6" style={rise(1)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/orders"
          hidden={{ category: cats.join(","), dest: dests.join(","), rec, q: qRaw, target: targetRaw, sort: sortParam, dir: dirParam }} />
      </div>

      {/* How the matching orders split; each cell filters the list */}
      <div className="rl-rise mt-5" style={rise(2)}>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 xl:grid-cols-4">
          {chips.map((c) => {
            const active = rec === c.key;
            return (
              <Link key={c.key} href={listHref({ rec: c.key, page: "" })} aria-current={active ? "true" : undefined}
                className={`relative flex flex-col p-5 transition-colors hover:bg-[#FFFEF6] ${active ? "bg-[#FFFEF6]" : "bg-white"}`}>
                <span className="flex items-center gap-2 text-sm text-[#355E3B]">
                  {c.dot && <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.dot, boxShadow: "inset 0 0 0 1px rgba(23,69,56,0.25)" }} />}
                  {c.label}
                </span>
                <span className="mt-3 text-3xl font-medium tracking-tight">{f.n(c.n)}</span>
                <span className="mt-1.5 text-xs text-[#355E3B]">{c.key ? `${pct1(share(c.n))} ${t("of these orders", "số đơn này")}` : t("matching the search and filters", "khớp với tìm kiếm và bộ lọc")}</span>
                {active && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: TEAL }} />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Review queue: Review orders ship single-use unless switched, to fill a management target, cheapest-saving first */}
      {(reviewTotal > 0 || plan) && (
        <div className="rl-rise mt-5 rounded-[9px] border border-[#174538]/15 bg-white p-5" style={rise(3)}>
          <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold">{t("Review queue", "Hàng đợi Review")}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#355E3B]">
                {t(`${f.n(reviewTotal)} orders ship single-use unless a supervisor switches them. To fill a target for Reusable orders, the ones that cost the least extra switch first.`,
                  `${f.n(reviewTotal)} đơn dùng bao bì một lần trừ khi giám sát chuyển đổi. Để đạt mục tiêu đơn Reusable, các đơn tốn thêm ít nhất chuyển trước.`)}
              </p>
            </div>
            <div>
              <SoftForm action="/orders" className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="method" value={method} /><input type="hidden" name="preset" value={presetKey} /><input type="hidden" name="org" value={orgId} />
                <input type="hidden" name="category" value={cats.join(",")} /><input type="hidden" name="dest" value={dests.join(",")} /><input type="hidden" name="rec" value={rec} /><input type="hidden" name="q" value={qRaw} />
                <input type="hidden" name="sort" value={sortParam} /><input type="hidden" name="dir" value={dirParam} />
                <label className="min-w-[10rem] flex-1 text-sm font-semibold">
                  {t("Target share of Reusable orders (%)", "Tỷ lệ đơn Reusable mục tiêu (%)")}
                  <input name="target" type="number" min={0} max={100} step={1} defaultValue={targetRaw} placeholder="20" className={`${INPUT} mt-1.5 font-normal`} />
                </label>
                <button className={`${BTN} cursor-pointer bg-[#174538] text-[#FFFEF6]`}>{t("Apply", "Áp dụng")}</button>
                {plan && <Link href={listHref({ target: "", page: "" })} className={`${BTN} border border-[#174538]/40 bg-white`}>{t("Clear", "Xóa")}</Link>}
              </SoftForm>
              {plan && (
                <p className="mt-4 rounded-[9px] border border-[#b7dccf] bg-[#DEF4EE] px-4 py-3 text-sm leading-relaxed">
                  {plan.needed === 0
                    ? t(`Reusable orders are already ${pct1(plan.reusable / Math.max(1, plan.total))} of all orders, at or above the ${f.n(target ?? 0)}% target. No Review orders need to switch.`,
                        `Đơn Reusable đã chiếm ${pct1(plan.reusable / Math.max(1, plan.total))} tổng số đơn, đạt hoặc vượt mục tiêu ${f.n(target ?? 0)}%. Không cần chuyển đơn Review nào.`)
                    : t(`${plan.reachable ? `To reach ${f.n(target ?? 0)}%` : `Even switching every Review order only reaches ${pct1(plan.reachedShare)}, short of the ${f.n(target ?? 0)}% target. Switching all of them`}, ${plan.reachable ? "switch" : "means switching"} ${f.n(plan.switched)} Review orders (cheapest first, marked in the list). Expected cost: ${Math.round(plan.extraCost) === 0 ? "no change" : `${f.vnd(Math.abs(plan.extraCost))} ${plan.extraCost > 0 ? "more" : "less"} than shipping them single-use`}.`,
                        `${plan.reachable ? `Để đạt ${f.n(target ?? 0)}%` : `Dù chuyển toàn bộ đơn Review cũng chỉ đạt ${pct1(plan.reachedShare)}, chưa tới mục tiêu ${f.n(target ?? 0)}%. Chuyển tất cả`}, ${plan.reachable ? "hãy chuyển" : "nghĩa là chuyển"} ${f.n(plan.switched)} đơn Review (rẻ nhất trước, được đánh dấu trong danh sách). Chi phí dự kiến: ${Math.round(plan.extraCost) === 0 ? "không đổi" : `${plan.extraCost > 0 ? "cao hơn" : "thấp hơn"} ${f.vnd(Math.abs(plan.extraCost))} so với đóng gói dùng một lần`}.`)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* The packing list */}
      <div className="rl-rise mt-5" style={rise(4)}>
        {/* relative z-20: the open filter lists must paint above the table */}
        <SoftForm action="/orders" className="relative z-20 flex flex-wrap items-end gap-3">
          <input type="hidden" name="method" value={method} /><input type="hidden" name="preset" value={presetKey} /><input type="hidden" name="org" value={orgId} />
          <input type="hidden" name="rec" value={rec} /><input type="hidden" name="target" value={targetRaw} />
          <input type="hidden" name="sort" value={sortParam} /><input type="hidden" name="dir" value={dirParam} />
          <LiveSearch name="q" label={t("Search order or customer", "Tìm đơn hàng hoặc khách hàng")} placeholder={t("O000123 or C01235", "O000123 hoặc C01235")} defaultValue={qRaw} />
          <div className="min-w-[12rem] flex-1">
            <MultiSelect name="category" label={t("Category", "Danh mục")} options={catOptions} selected={cats}
              allLabel={t("All categories", "Tất cả danh mục")} selectedWord={t("selected", "đã chọn")} clearLabel={t("Clear", "Xóa")} applyLabel={t("Apply", "Áp dụng")} />
          </div>
          <div className="min-w-[12rem] flex-1">
            <MultiSelect name="dest" label={t("Destination", "Nơi nhận")} options={destOptions} selected={dests}
              allLabel={t("All destinations", "Tất cả nơi nhận")} selectedWord={t("selected", "đã chọn")} clearLabel={t("Clear", "Xóa")} applyLabel={t("Apply", "Áp dụng")} />
          </div>
          {filtersOn && <Link href={listHref({ category: "", dest: "", rec: "", q: "", page: "" })} className={`${BTN} border border-[#174538]/40 bg-white`}>{t("Clear", "Xóa")}</Link>}
        </SoftForm>

        <p className="mb-2 mt-5 text-xs text-[#355E3B]">
          {sorted.length
            ? t(`Showing ${f.n(from)} to ${f.n(to)} of ${f.n(sorted.length)} orders. The download includes every order that matches.`,
                `Hiển thị ${f.n(from)} đến ${f.n(to)} trên ${f.n(sorted.length)} đơn. Tệp tải về gồm tất cả đơn khớp bộ lọc.`)
            : ""}
        </p>
        <TableVeil>
        <div className="overflow-x-auto rounded-[9px] border border-[#174538]/15 bg-white">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-[#174538]/15 text-left text-xs text-[#355E3B]">
                {columns.map((c) => {
                  if (!c.key) return <th key={c.label} className="px-4 py-3 font-semibold">{c.label}</th>;
                  const active = sortKey === c.key;
                  const first = NUMERIC_FIRST_DESC.includes(c.key) ? "desc" : "asc";
                  const next = active ? (dir === "asc" ? "desc" : "asc") : first;
                  return (
                    <th key={c.key} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 font-semibold">
                      <Link href={listHref({ sort: c.key, dir: next, page: "" })} className={`inline-flex items-center gap-1 whitespace-nowrap underline-offset-2 hover:text-[#174538] hover:underline ${active ? "text-[#174538]" : ""}`}>
                        {c.label}
                        {active && <span aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>}
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody key={[current, sortKey, dir, rec, cats.join(), dests.join(), qRaw, targetRaw].join("|")} className="rl-fade">
              {shown.map((s) => {
                const code = instructionCode(s, boxCats, plan?.ids.has(s.row.order_id) ?? false);
                const factor = topFactor(model, s.order, t);
                const rvsColor = s.r.rvs >= 70 ? BAND.reusable : s.r.rvs >= 40 ? BAND.review : BAND.single;
                return (
                  <tr key={s.row.id} className={`border-b border-[#174538]/10 last:border-0 hover:bg-[#FFFEF6] ${code === "switch" ? "bg-[#F4FBF8]" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <OrderLink id={s.row.order_id} href={`/order${qs}&order=${s.row.order_id}`} className="font-semibold underline underline-offset-2">{s.row.order_id}</OrderLink>
                      <p className="mt-0.5 text-xs text-[#355E3B]">{s.row.order_date}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold">{s.row.category}{s.order.multi_size ? <span className="ml-1.5 text-xs font-normal text-[#355E3B]">{t("multi-size", "nhiều cỡ")}</span> : null}</p>
                      <p className="mt-0.5 text-xs text-[#355E3B]">{f.vnd(Number(s.row.order_value_vnd))} · {s.row.payment_method}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold">{s.row.customer_id}</p>
                      <p className="mt-0.5 text-xs text-[#355E3B]">
                        {ordersWord(s.order.past_delivered_in_data)}
                        {s.order.customer_return_rate_in_data === null ? "" : `, ${f.pct(s.order.customer_return_rate_in_data)} ${t("returned", "đã hoàn")}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p>{s.row.address}</p>
                      <p className="mt-0.5 text-xs text-[#355E3B]">{s.order.estimated_delivery_distance_km} km</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold">{f.pct(s.r.predReturnProb)}</p>
                      <div className="mt-1.5 h-1.5 w-16 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
                        <div className="h-full" style={{ width: `${Math.min(100, s.r.predReturnProb * 100)}%`, background: TEAL }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold">{f.n(s.r.rvs, 1)}</p>
                      <div className="mt-1.5 h-1.5 w-16 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
                        <div className="h-full" style={{ width: `${Math.min(100, s.r.rvs)}%`, background: rvsColor }} />
                      </div>
                    </td>
                    <td className="max-w-[11rem] px-4 py-3 align-top text-xs leading-relaxed text-[#355E3B]">{factor ?? t("Nothing unusual", "Không có yếu tố nổi bật")}</td>
                    <td className="px-4 py-3 align-top">
                      {/* A switched order shows Reusable (its instruction); the shaded row and the legend say it came from Review */}
                      <RecPill rec={code === "switch" ? "REUSABLE" : s.r.recommendation} />
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#355E3B]">{t("No orders match these filters.", "Không có đơn hàng nào khớp bộ lọc.")}</td></tr>
              )}
            </tbody>
            {/* Footer row of the table: what each recommendation means for the packing team */}
            <tfoot>
              <tr>
                <td colSpan={8} className="border-t border-[#174538]/15 p-0">
                  <div className={`grid divide-y divide-[#174538]/15 sm:divide-x sm:divide-y-0 ${plan ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                    {[
                      { bg: "#DEF4EE", dot: BAND.reusable, text: t("Reusable bag", "Túi tái sử dụng") },
                      { bg: "#F5FBE2", dot: BAND.review, text: t("Single-use for now, supervisor decides", "Tạm dùng một lần, giám sát quyết định") },
                      { bg: "#FFFDD0", dot: BAND.single, text: boxCats.length ? t(`Single-use mailer, or box for ${boxCats.join(", ")}`, `Túi gói hàng dùng một lần, hoặc hộp cho ${boxCats.join(", ")}`) : t("Single-use mailer", "Túi gói hàng dùng một lần") },
                    ].map((c) => (
                      <div key={c.text} className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold" style={{ background: c.bg }}>
                        <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: c.dot, boxShadow: "inset 0 0 0 1px rgba(23,69,56,0.25)" }} />
                        {c.text}
                      </div>
                    ))}
                    {plan && (
                      <div className="flex items-center gap-2.5 bg-[#F4FBF8] px-4 py-3 text-sm font-semibold">
                        <span aria-hidden className="inline-block h-3 w-5 shrink-0 rounded-[3px] border border-[#b7dccf] bg-white" />
                        {t("Shaded row: switched from Review", "Hàng được tô: chuyển từ Review")}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        </TableVeil>

        {/* Previous at the left edge, the numbers in the middle, Next at the right edge: the full width of the table */}
        {pages > 1 && (
          <nav aria-label={t("Pages", "Trang")} className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {current > 1
              ? <Link className={`${PAGE_BTN} border-[#174538]/40 bg-white hover:bg-[#FFFEF6]`} href={listHref({ page: String(current - 1) })}>{t("Previous", "Trước")}</Link>
              : <span className={`${PAGE_BTN} border-[#174538]/15 text-[#355E3B]/50`}>{t("Previous", "Trước")}</span>}
            <div className="order-last flex w-full flex-wrap items-center justify-center gap-2 sm:order-none sm:w-auto">
              {pageList(current, pages).map((n, i) => n === "gap"
                ? <span key={`gap${i}`} aria-hidden className="px-1 text-[#355E3B]">…</span>
                : n === current
                  ? <span key={n} aria-current="page" className={`${PAGE_BTN} border-[#174538] bg-[#174538] text-[#FFFEF6]`}>{f.n(n)}</span>
                  : <Link key={n} className={`${PAGE_BTN} border-[#174538]/25 bg-white hover:bg-[#FFFEF6]`} href={listHref({ page: String(n) })}>{f.n(n)}</Link>)}
            </div>
            {current < pages
              ? <Link className={`${PAGE_BTN} border-[#174538]/40 bg-white hover:bg-[#FFFEF6]`} href={listHref({ page: String(current + 1) })}>{t("Next", "Sau")}</Link>
              : <span className={`${PAGE_BTN} border-[#174538]/15 text-[#355E3B]/50`}>{t("Next", "Sau")}</span>}
          </nav>
        )}
      </div>

      <OrderPopup details={details} ids={shown.map((x) => x.row.order_id)} labels={orderLabels(t, methodLabel(t, method))}
        initial={extra?.row.order_id ?? null} pageBase={`/order${qs}`} />
    </AppShell>
  );
}
