import { Suspense, type CSSProperties, type ReactNode } from "react";
import { connection } from "next/server";
import AppShell from "@/components/AppShell";
import Controls from "@/components/Controls";
import PageSkeleton from "@/components/PageSkeleton";
import AppShellSkeleton from "@/components/AppShellSkeleton";
import AiInsight, { AiInsightSkeleton } from "@/components/AiInsight";
import SettingsBar from "@/components/SettingsBar";
import { presetLabel, methodLabel } from "@/lib/i18n";
import Stat from "@/components/Stat";
import { loadContext } from "@/lib/context";
import { categoryReturnRates, scoreAll, CUSTOM_PRESET, type Params, type Scored } from "@/lib/data";
import { simulate } from "@/lib/simulate";
import { TARGETS } from "@/lib/targets";
import { ChartCard, DotPlot, LineChart, MethodCompare, MonthlyCharts, RvsHistogram, Swatch, BAND, TEAL, TEAL_LIGHT, TRACK_COLOR as TRACK_SWATCH, type MonthPoint } from "@/components/DashboardCharts";

export const metadata = { title: "Dashboard" };

const H = "font-[family-name:var(--font-display)] font-normal tracking-tight";
const BTN = "inline-flex items-center gap-2 rounded-[9px] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85";
// Bars are flat and thin with barely rounded ends. Predicted = #37a486, actual = #84d6c0.
// The three recommendation colors: used for the dots next to the card titles, the legend and the mix bars.
const MIX = {
  REUSABLE: { background: "#2a7e67" },
  REVIEW: { background: "#d6ef89" },
  "SINGLE-USE": { background: "#fffb9d" },
} as const satisfies Record<string, CSSProperties>;
// The cards keep their landing page backgrounds (mint / lime / butter)
const CARD = { REUSABLE: "mint", REVIEW: "lime", "SINGLE-USE": "butter" } as const;
const NAME = { REUSABLE: "Reusable", REVIEW: "Review", "SINGLE-USE": "Single-use" } as const;
const PREDICTED = "#37a486";
const TRACK = "bg-[#d0f0e7]";
const MIXBAR = `flex h-2 overflow-hidden rounded-[2px] ${TRACK}`;
/** Staggered fade-in: each block starts a little after the previous one. */
const rise = (i: number) => ({ "--d": `${i * 0.08}s` }) as CSSProperties;

export default function Dashboard({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    // The fallback keeps the sidebar on screen while the data loads, instead of a blank page. AppShell reads the language
    // cookie, so it sits in its own boundary; the static skeleton covers the instant before it arrives.
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
  const { user, method, presetKey, cfg, orgs, orgId, rows, scored, qs, hasCustom, model, orgModel, modelLabel, t, f } = await loadContext(sp);

  const count = (rec: string) => scored.filter((s) => s.r.recommendation === rec).length;
  const reusable = scored.filter((s) => s.r.recommendation === "REUSABLE");
  const base = scored.reduce((a, s) => a + s.r.expCostSingleVnd, 0);
  const withReloop = scored.reduce(
    (a, s) => a + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);
  const lost = reusable.reduce((a, s) => a + s.lostProb, 0);

  // Progress against the pilot targets (baseline = all single-use)
  const n = Math.max(1, scored.length);
  const share = (c: number) => c / n;
  const packsPer1000 = (reusable.length / n) * 1000;
  const netPacksPer1000 = ((reusable.length - lost) / n) * 1000;
  const saving = base > 0 ? (base - withReloop) / base : 0;
  const auc: number | undefined = (model as { metrics?: { auc_model?: number } }).metrics?.auc_model;
  const selfReturn: number = cfg.generator.dropoff_recovery_target.value;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));

  // Figures for the cost cards, the charts and the assumptions
  const per1000 = (x: number) => (x / n) * 1000;
  const diff = base - withReloop;
  const noSavings = Math.round(diff) === 0;
  const netPacks = reusable.length - lost;
  const custom = presetKey === CUSTOM_PRESET;
  const pk = cfg.packaging;
  const perUse = pk.reusable_pack_vnd.value / pk.reuse_cycles.value + pk.cleaning_per_reuse_vnd.value;
  const pickupFee = cfg.logistics.ghn_tariff_vnd.value.noi_tinh * cfg.logistics.pickup_order_share.value;

  // Orders by score, in bins of 10
  const bins = Array<number>(10).fill(0);
  for (const s of scored) bins[Math.min(9, Math.max(0, Math.floor(s.r.rvs / 10)))]++;

  // Scenario curve: switch the top X% by score to reusable (same calculation as the Simulator page)
  const sim = simulate(scored);

  // The same orders under both ways of getting packs back
  const otherMethod = method === "dropoff" ? "courier_pickup" : "dropoff";
  const altScored = scoreAll(rows, cfg, otherMethod, model);
  const methodStats = (list: Scored[]) => {
    const b = list.reduce((a, s) => a + s.r.expCostSingleVnd, 0);
    const w = list.reduce((a, s) => a + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);
    const r = list.filter((s) => s.r.recommendation === "REUSABLE").length;
    return { reusable: r, share: r / Math.max(1, list.length), diffPer1000: ((b - w) / Math.max(1, list.length)) * 1000 };
  };
  const methodItems = [
    { name: t("Courier pickup", "Shipper đến lấy"), selected: method === "courier_pickup", ...methodStats(method === "courier_pickup" ? scored : altScored) },
    { name: t("Drop-off (no courier)", "Khách tự gửi trả (không cần shipper)"), selected: method === "dropoff", ...methodStats(method === "dropoff" ? scored : altScored) },
  ];

  // By order month
  const byMonth = new Map<string, Scored[]>();
  for (const s of scored) {
    const k = (s.row.order_date ?? "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(k)) continue;
    byMonth.set(k, [...(byMonth.get(k) ?? []), s]);
  }
  const months: MonthPoint[] = [...byMonth].sort(([a], [b]) => a.localeCompare(b)).map(([key, list]) => ({
    key, orders: list.length, reusable: list.filter((s) => s.r.recommendation === "REUSABLE").length,
    predicted: list.reduce((a, s) => a + s.r.predReturnProb, 0) / list.length,
  }));
  const kVnd = (v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "-"}${f.n(Math.abs(v) / 1000)}k`);

  // Assumptions: a quiet line in the page footer (prices come from sources; the first two are what the pilot tests)
  const cycles = pk.reuse_cycles.value;
  // Written as plain sentences; the footer adds "All demo data is simulated." to the same paragraph
  const assumptionNote = custom
    ? t(`Assumptions from your Cost settings: ${f.pct(selfReturn)} of packs are returned without a courier and a reusable pack lasts ${f.n(cycles)} uses. A reusable pack costs ${f.vnd(perUse)} per use and a courier pickup of an empty pack costs ${f.vnd(pickupFee)}.`,
        `Giả định từ Cài đặt chi phí của bạn: ${f.pct(selfReturn)} bao bì được gửi trả không cần shipper và mỗi túi tái sử dụng dùng được ${f.n(cycles)} lần. Mỗi lần dùng túi tái sử dụng tốn ${f.vnd(perUse)} và shipper lấy một bao bì rỗng tốn ${f.vnd(pickupFee)}.`)
    : t(`Assumptions: ${f.pct(selfReturn)} of packs are returned without a courier and a reusable pack lasts ${f.n(cycles)} uses. The pilot tests the first one at ${f.pct(TARGETS.selfReturn)}. From sources: a reusable pack costs ${f.vnd(perUse)} per use, including washing, and a courier pickup of an empty pack costs ${f.vnd(pickupFee)}.`,
        `Giả định: ${f.pct(selfReturn)} bao bì được gửi trả không cần shipper và mỗi túi tái sử dụng dùng được ${f.n(cycles)} lần. Thí điểm sẽ kiểm chứng giả định đầu ở mức ${f.pct(TARGETS.selfReturn)}. Có nguồn: mỗi lần dùng túi tái sử dụng tốn ${f.vnd(perUse)}, đã gồm giặt, và shipper lấy một bao bì rỗng tốn ${f.vnd(pickupFee)}.`);

  const targets = [
    { name: t("Packs avoided per 1,000 orders", "Bao bì được tránh trên 1.000 đơn"),
      now: f.n(packsPer1000), note: t(`net of lost bags: ${f.n(netPacksPer1000)}`, `sau khi trừ túi bị mất: ${f.n(netPacksPer1000)}`),
      target: `≥ ${f.n(TARGETS.packsAvoidedPer1000)}`, ok: packsPer1000 >= TARGETS.packsAvoidedPer1000, ratio: clamp(packsPer1000 / TARGETS.packsAvoidedPer1000) },
    { name: t("Packaging cost saving", "Tiết kiệm chi phí bao bì"),
      now: f.pct(saving), note: f.vnd(base - withReloop), target: `≥ ${f.pct(TARGETS.costSaving)}`, ok: saving >= TARGETS.costSaving, ratio: clamp(saving / TARGETS.costSaving) },
    { name: t("Prediction accuracy (AUC)", "Độ chính xác dự đoán (AUC)"),
      now: auc === undefined ? "-" : f.n(auc, 2), note: t("on newer orders not used for training", "trên các đơn mới hơn, không dùng để huấn luyện"),
      target: `≥ ${f.n(TARGETS.auc, 2)}`, ok: auc !== undefined && auc >= TARGETS.auc,
      // AUC 0.5 is a coin flip, so the bar runs from 0.5 to the target
      ratio: auc === undefined ? 0 : clamp((auc - 0.5) / (TARGETS.auc - 0.5)) },
    { name: t("Packs returned, no courier", "Bao bì gửi trả, không shipper"),
      now: f.pct(selfReturn), note: t("assumption in settings; measured in the pilot", "giả định trong cài đặt; sẽ đo trong thí điểm"),
      target: `≥ ${f.pct(TARGETS.selfReturn)}`, ok: selfReturn >= TARGETS.selfReturn, ratio: clamp(selfReturn / TARGETS.selfReturn) },
  ];

  const cats = [...new Set(scored.map((s) => s.row.category))].sort();
  const catRates = categoryReturnRates(rows);
  const catData = cats.map((c) => {
    const list = scored.filter((s) => s.row.category === c);
    const h = catRates.get(c);
    return {
      name: c, orders: list.length,
      predicted: list.reduce((a, s) => a + s.r.predReturnProb, 0) / list.length,
      actual: h?.rate, delivered: h?.n,
      mix: (["REUSABLE", "REVIEW", "SINGLE-USE"] as const).map((rec) => ({ rec, count: list.filter((s) => s.r.recommendation === rec).length })),
    };
  });

  return (
    <AppShell qs={qs} email={user?.email} footerNote={assumptionNote}>
      {/* Pinned to the top once the settings panel has scrolled away, so the settings in use are always visible */}
      <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")}
        items={[
          { label: t("Data", "Dữ liệu"), value: orgs.find((o) => o.id === orgId)?.name ?? "-" },
          { label: t("Brand type", "Loại thương hiệu"), short: t("Brand type", "Thương hiệu"), value: presetLabel(t, presetKey) },
          { label: t("Packs come back", "Thu hồi bao bì"), short: t("Packs", "Thu hồi"), value: methodLabel(t, method) },
        ]} />
      <div className="rl-rise flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={`${H} text-4xl md:text-5xl`}>{t("Dashboard", "Tổng quan")}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <a className={`${BTN} bg-[#174538] text-[#FFFEF6]`} href={`/export${qs}&rec=REUSABLE`}>
            <DownloadIcon />{t("Reusable List", "Danh sách Reusable")}
          </a>
          <a className={`${BTN} border border-[#174538]/40 bg-white`} href={`/export${qs}`}>
            <DownloadIcon />{t("All Recommendations", "Toàn bộ đề xuất")}
          </a>
        </div>
      </div>

      {/* relative z-20: the open dropdown lists must paint above the sections below, which fade in as their own layers */}
      <div id="settings-panel" className="rl-rise relative z-20 mt-6" style={rise(1)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/dashboard"
          modelNote={orgModel
            ? `${t("Return prediction uses", "Dự đoán hoàn hàng dùng")} ${modelLabel}.`
            : t("Return prediction uses the built-in model.", "Dự đoán hoàn hàng dùng mô hình mặc định.")} />
      </div>

      {/* AI summary of the numbers below. It streams in on its own, so the rest of the page never waits for it. */}
      <div className="rl-rise mt-5" style={rise(2)}>
        <Suspense fallback={<AiInsightSkeleton />}>
          <AiInsight scored={scored} rows={rows} cfg={cfg} method={method} model={model}
            presetName={presetLabel(t, presetKey)} modelLabel={modelLabel}
            targets={targets.map(({ name, now, target, ok }) => ({ name, now, target, ok }))} />
        </Suspense>
      </div>

      {/* Cost and impact: four cards of the same size; CO2 has no sourced data yet, so it is only a quiet note */}
      <Group title={t("Cost & Impact", "Chi phí & tác động")} i={3}
        sub={t("Packaging cost with and without ReLoop, and how many single-use packs are avoided.",
          "Chi phí bao bì khi có và không có ReLoop, và số bao bì dùng một lần được tránh.")}>
        {/* One container, four cells separated by thin lines (same look as the pilot targets) */}
        <div className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-2 xl:grid-cols-4">
          <Stat layout="cell" variant="green" value={noSavings ? t("No savings", "Không tiết kiệm") : f.vnd(Math.abs(diff))}
            label={noSavings ? t("Difference", "Chênh lệch") : diff > 0 ? t("Difference saved", "Chênh lệch tiết kiệm được") : t("Difference (more expensive)", "Chênh lệch (đắt hơn)")}
            note={noSavings ? undefined : `${f.vnd(Math.abs(per1000(diff)))} ${t("per 1,000 orders", "trên 1.000 đơn")}`} />
          <Stat layout="cell" label={t("Packaging cost, all single-use", "Chi phí bao bì, toàn bộ dùng một lần")} value={f.vnd(base)}
            note={`${f.vnd(per1000(base))} ${t("per 1,000 orders", "trên 1.000 đơn")}`} />
          <Stat layout="cell" label={t("Packaging cost, following ReLoop", "Chi phí bao bì, theo đề xuất ReLoop")} value={f.vnd(withReloop)}
            note={`${f.vnd(per1000(withReloop))} ${t("per 1,000 orders", "trên 1.000 đơn")}`} />
          <Stat layout="cell" label={t("Net single-use packs avoided", "Bao bì dùng một lần được tránh (ròng)")} value={f.n(Math.round(netPacks))}
            note={t(`${f.n(reusable.length)} avoided, ${f.n(Math.round(lost))} lost`,
              `tránh ${f.n(reusable.length)}, mất ${f.n(Math.round(lost))}`)} />
        </div>
        <p className="mt-3 text-xs text-[#355E3B]/70">
          {t("CO2 impact: not estimated yet (no sourced emission factor).", "Tác động CO2: chưa ước tính (chưa có hệ số phát thải có nguồn).")}
        </p>
      </Group>

      {/* Recommendations */}
      <Group title={t("Recommendations", "Đề xuất")} i={4}
        sub={t("What ReLoop recommends for each order, based on its score (RVS).",
          "ReLoop đề xuất gì cho từng đơn hàng, dựa trên điểm RVS của đơn.")}>
        {/* The four cards on the left, the score chart on the right (stacked on narrow screens) */}
        <div className="grid gap-5 lg:grid-cols-[5fr_7fr]">
          <div className="flex flex-col gap-3">
            <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-3">
              <Stat label={t("Orders scored", "Đơn hàng được chấm điểm")} value={f.n(scored.length)}
                note={t(`out of ${f.n(rows.length)}`, `trên tổng ${f.n(rows.length)}`)} />
              {(["REUSABLE", "REVIEW", "SINGLE-USE"] as const).map((r) => (
                <Stat key={r} variant={CARD[r]} dot={MIX[r].background} label={NAME[r]} value={f.n(count(r))} note={f.pct(share(count(r)))} />
              ))}
            </div>
            <div className={MIXBAR} role="img"
              aria-label={(["REUSABLE", "REVIEW", "SINGLE-USE"] as const).map((r) => `${r} ${f.pct(share(count(r)))}`).join(", ")}>
              {(["REUSABLE", "REVIEW", "SINGLE-USE"] as const).map((r) => (
                <div key={r} style={{ width: `${share(count(r)) * 100}%`, ...MIX[r] }} title={`${NAME[r]}: ${f.n(count(r))} (${f.n(share(count(r)) * 100, 1)}%)`} />
              ))}
            </div>
          </div>
          <ChartCard
            title={t("How the orders score", "Điểm của các đơn hàng")}
            sub={t("Orders grouped by score (RVS). 70 or more is Reusable, 40 to 69 Review, below 40 Single-use.",
              "Đơn hàng nhóm theo điểm (RVS). Từ 70 là Reusable, 40 đến 69 là Review, dưới 40 là Single-use.")}
            footer={t("Review orders ship in single-use packaging by default; the packing team can switch them to reusable.",
              "Đơn Review mặc định dùng bao bì một lần; đội đóng gói có thể chuyển sang tái sử dụng.")}>
            <RvsHistogram bins={bins} fmt={(v) => f.n(v)}
              names={{ single: NAME["SINGLE-USE"], review: NAME.REVIEW, reusable: NAME.REUSABLE }}
              tip={(range, c) => `${t("Score", "Điểm")} ${range}: ${f.n(c)} ${t("orders", "đơn")} (${f.n((c / n) * 100, 1)}%)`}
              label={t("Number of orders by RVS score", "Số đơn hàng theo điểm RVS")} />
          </ChartCard>
        </div>
      </Group>

      {/* Scenarios: more orders switching to reusable (same calculation as the Simulator), and courier pickup vs drop-off */}
      <Group title={t("Scenarios", "Kịch bản")} i={5}
        sub={t("How results change as more orders switch to reusable, and with each way packs come back.",
          "Kết quả thay đổi thế nào khi nhiều đơn chuyển sang tái sử dụng, và với từng cách thu hồi bao bì.")}>
        <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ChartCard
            title={t("Cost change as more orders switch to reusable", "Chi phí thay đổi khi nhiều đơn chuyển sang tái sử dụng")}
            sub={t(`Per 1,000 orders, with ${methodItems.find((m) => m.selected)?.name.toLowerCase()}. Below zero means money saved. "Highest scores first" switches the best-scoring orders first; "Random orders" switches the same number without looking at the score, as a comparison.`,
              `Trên 1.000 đơn, với hình thức ${methodItems.find((m) => m.selected)?.name.toLowerCase()}. Dưới 0 nghĩa là tiết kiệm được. "Điểm cao nhất trước" chuyển các đơn điểm cao trước; "Đơn ngẫu nhiên" chuyển cùng số đơn mà không xét điểm, để so sánh.`)}
            footer={<>
              <p className="font-semibold text-[#174538]">{t("Net single-use packs avoided per 1,000 orders", "Bao bì dùng một lần được tránh (ròng) trên 1.000 đơn")}</p>
              <p className="mt-1">{sim.filter((r) => r.sharePct > 0).map((r) => `${r.sharePct}%: ${f.n(r.packsAvoidedPer1000 - r.packsLostPer1000)}`).join("  ·  ")}</p>
            </>}>
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#355E3B]">
              <Swatch color={TEAL} label={t("Highest scores first", "Điểm cao nhất trước")} />
              <Swatch color={TEAL_LIGHT} label={t("Random orders", "Đơn ngẫu nhiên")} />
            </div>
            <LineChart xs={sim.map((r) => `${r.sharePct}%`)} fmt={kVnd}
              tip={(name, x, v) => `${name}, ${x} ${t("of orders switched", "số đơn chuyển đổi")}: ${
                Math.round(v) === 0 ? t("no change", "không đổi") : v > 0 ? `${f.vnd(v)} ${t("extra cost", "chi phí tăng thêm")}` : `${f.vnd(-v)} ${t("saved", "tiết kiệm")}`
              } ${t("per 1,000 orders", "trên 1.000 đơn")}`}
              label={t("Cost change per 1,000 orders by share of orders switched to reusable", "Thay đổi chi phí trên 1.000 đơn theo tỷ lệ đơn chuyển sang tái sử dụng")}
              series={[
                { name: t("Highest scores first", "Điểm cao nhất trước"), color: TEAL, points: sim.map((r) => r.extraPer1000) },
                { name: t("Random orders", "Đơn ngẫu nhiên"), color: TEAL_LIGHT, points: sim.map((r) => r.extraRandomPer1000) },
              ]} />
          </ChartCard>
          <ChartCard
            title={t("Courier pickup vs drop-off", "Shipper đến lấy so với khách tự gửi trả")}
            sub={t("The same orders under both ways of getting packs back.", "Cùng các đơn hàng này với hai cách thu hồi bao bì.")}
            footer={t(`Drop-off assumes ${f.pct(selfReturn)} of customers return the pack themselves; the pilot measures the real rate.`,
              `Khách tự gửi trả giả định ${f.pct(selfReturn)} khách tự trả bao bì; thí điểm sẽ đo tỷ lệ thật.`)}>
            <MethodCompare items={methodItems} fmtN={(v) => f.n(v)} fmtPct={(v) => f.pct(v)} fmtVnd={(v) => f.vnd(v)}
              text={{
                reusable: t("Reusable orders", "Đơn Reusable"),
                cost: t("Cost difference per 1,000 orders", "Chênh lệch chi phí trên 1.000 đơn"),
                selected: t("selected", "đang chọn"), saved: t("saved", "tiết kiệm"), more: t("more expensive", "đắt hơn"),
                none: t("No savings", "Không tiết kiệm"),
              }} />
          </ChartCard>
        </div>
      </Group>

      {/* Pilot targets */}
      <Group title={t("Pilot targets (month 12)", "Mục tiêu thí điểm (tháng 12)")} i={6}
        sub={t("Baseline: every order in single-use packaging. Values use the settings above.",
          "Mốc gốc: mọi đơn dùng bao bì một lần. Giá trị dùng các cài đặt ở trên.")}>
        {/* One container, four cells separated by thin lines */}
        {/* On wide screens the four cells share their rows (subgrid), so titles, numbers, bars and notes line up even when a title wraps to more lines */}
        <div className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[auto_auto_auto_1fr]">
          {targets.map((x) => (
            <div key={x.name} className="flex flex-col bg-white p-5 xl:row-span-4 xl:grid xl:grid-rows-subgrid">
              <div>
                <span className={`inline-block whitespace-nowrap rounded-[6px] border px-2 py-0.5 text-xs font-semibold ${
                  x.ok ? "border-[#b7dccf] bg-[#DEF4EE]" : "border-[#174538]/25 bg-[#FFFDD0]"}`}>
                  {x.ok ? t("Met", "Đạt") : t("Not yet", "Chưa đạt")}
                </span>
                <p className="mt-2 text-sm font-semibold leading-snug">{x.name}</p>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <p className="text-3xl font-medium tracking-tight">{x.now}</p>
                <p className="text-sm text-[#355E3B]">{t("Target", "Mục tiêu")} {x.target}</p>
              </div>
              <div className={`mt-3 h-1.5 overflow-hidden rounded-[2px] ${TRACK}`} role="progressbar" aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={Math.round(x.ratio * 100)} aria-label={x.name}>
                <div className="h-full" style={{ width: `${x.ratio * 100}%`, background: PREDICTED }} />
              </div>
              <p className="mt-2 text-xs text-[#355E3B]">{x.note}</p>
            </div>
          ))}
        </div>
      </Group>


      {/* By category: one row per category, predicted vs actual return rate */}
      <Group title={t("By category", "Theo danh mục")} i={7}
        sub={t("Return rates and recommendations for each product category.",
          "Tỷ lệ hoàn hàng và đề xuất cho từng danh mục sản phẩm.")}>
        <div className="rounded-[9px] border border-[#174538]/15 bg-white p-5">
          <DotPlot fmtN={(v) => f.n(v)} fmtPct={(v) => f.pct(v)}
            labels={{
              orders: t("orders", "đơn"), predicted: t("Predicted", "Dự đoán"), actual: t("Actual", "Thực tế"), mix: t("Recommendations", "Đề xuất"), reusable: t("Reusable", "Reusable"), review: t("Review", "Review"), single: t("Single-use", "Single-use"),
              legendPredicted: t("Predicted by the model", "Mô hình dự đoán"), legendActual: t("Actual returns (history)", "Hoàn hàng thực tế (lịch sử)"),
            }}
            rows={[...catData].sort((a, b) => b.predicted - a.predicted).map((c) => {
              const n = (rec: string) => c.mix.find((m) => m.rec === rec)?.count ?? 0;
              return {
                name: c.name, orders: c.orders, predicted: c.predicted, actual: c.actual, mix: { reusable: n("REUSABLE"), review: n("REVIEW"), single: n("SINGLE-USE") },
                tip: [
                  `${c.name}: ${f.n(c.orders)} ${t("orders", "đơn")}`,
                  `${t("Return rate", "Tỷ lệ hoàn")}: ${t("predicted", "dự đoán")} ${f.n(c.predicted * 100, 1)}%, ${t("actual", "thực tế")} ${c.actual === undefined ? "-" : f.n(c.actual * 100, 1) + "%"}${c.delivered ? ` (${f.n(c.delivered)} ${t("delivered", "đã giao")})` : ""}`,
                  `Reusable ${f.n(n("REUSABLE"))} · Review ${f.n(n("REVIEW"))} · Single-use ${f.n(n("SINGLE-USE"))}`,
                ].join("\n"),
              };
            })} />
        </div>
      </Group>
      {/* Over time */}
      {months.length >= 2 && (
        <Group title={t("Over time", "Theo thời gian")} i={8}
          sub={t("By the month the order was placed.", "Theo tháng đặt hàng.")}>
          <ChartCard title={t("Orders and predicted returns by month", "Đơn hàng và dự đoán hoàn hàng theo tháng")}
            sub={
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <Swatch color={BAND.reusable} label={t("Reusable orders", "Đơn Reusable")} />
                <Swatch color={TRACK_SWATCH} label={t("All orders", "Tất cả đơn hàng")} />
                <Swatch color={TEAL} label={t("Average predicted return probability", "Xác suất hoàn trung bình (dự đoán)")} />
              </div>
            }>
            <MonthlyCharts months={months} fmtN={(v) => f.n(v)} fmtPct={(v) => f.pct(v)}
              tipOrders={(m) => `${m.key}: ${f.n(m.orders)} ${t("orders", "đơn")}, ${f.n(m.reusable)} Reusable`}
              tipReturn={(m) => `${m.key}: ${f.n(m.predicted * 100, 1)}% ${t("average predicted return probability", "xác suất hoàn trung bình (dự đoán)")}`}
              labels={{ orders: t("Orders per month", "Số đơn hàng mỗi tháng"), returns: t("Average predicted return probability", "Xác suất hoàn trung bình (dự đoán)") }} />
          </ChartCard>
        </Group>
      )}

    </AppShell>
  );
}

/** A titled block of the dashboard; `i` staggers its fade-in. */
function Group({ title, sub, i, children }: { title: string; sub?: string; i: number; children: ReactNode }) {
  return (
    <section className="rl-rise mt-10" style={rise(i)}>
      <h2 className={`${H} text-3xl`}>{title}</h2>
      {sub && <p className="mt-1 text-sm leading-relaxed text-[#355E3B]">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13h11" />
    </svg>
  );
}
