import { Suspense, type CSSProperties } from "react";
import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppShellSkeleton from "@/components/AppShellSkeleton";
import PageSkeleton from "@/components/PageSkeleton";
import Controls from "@/components/Controls";
import SettingsBar from "@/components/SettingsBar";
import RecPill from "@/components/RecPill";
import Section from "@/components/Section";
import { BAND, TEAL, TEAL_LIGHT, TRACK_COLOR } from "@/components/DashboardCharts";
import { loadContext } from "@/lib/context";
import { settingsFromConfig, type Params } from "@/lib/data";
import { scoreOrder, type CollectionMethod } from "@/lib/rvs";
import { methodLabel, reasonText } from "@/lib/i18n";
import { factorList, instructionCode, instructionText, settingsItems } from "@/lib/orderView";

export const metadata = { title: "Order" };

const H = "font-[family-name:var(--font-display)] font-normal tracking-tight";
const BTN = "inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-85";
const CARD = "rounded-[9px] border border-[#174538]/15 bg-white p-5";
const rise = (i: number) => ({ "--d": `${i * 0.08}s` }) as CSSProperties;

/** One order: the packing instruction and why, the AI return prediction and what drives it, the score and the cost. */
export default function OrderPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
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
  const { user, method, presetKey, cfg, orgs, orgId, scored, qs, hasCustom, model, modelLabel, t, f } = await loadContext(sp);

  const wanted = (sp.order ?? "").trim().toUpperCase();
  const idx = scored.findIndex((x) => x.row.order_id.toUpperCase() === wanted);
  const s = idx >= 0 ? scored[idx] : scored.find((x) => x.row.order_status === "Delivered") ?? scored[0];
  if (!s) {
    return <AppShell qs={qs} email={user?.email}><p className="text-sm">{t("No orders yet.", "Chưa có đơn hàng.")}</p></AppShell>;
  }
  const at = scored.indexOf(s);
  const prev = scored[at - 1], next = scored[at + 1];

  const r = s.r, o = s.order;
  const w = settingsFromConfig(cfg).weights;
  const other: CollectionMethod = method === "dropoff" ? "courier_pickup" : "dropoff";
  const r2 = scoreOrder(cfg, model, o, other);
  const boxCats = cfg.packaging.box_categories.value as string[];
  const code = instructionCode(s, boxCats, false);

  // Prediction baseline (average returns of the same category) and what drives the probability
  const sameCat = scored.filter((x) => x.row.category === s.row.category && x.row.order_status === "Delivered" && x.row.was_returned !== null);
  const baseline = sameCat.reduce((a, x) => a + Number(x.row.was_returned), 0) / Math.max(1, sameCat.length);
  const factors = factorList(model, o, t);
  const maxFactor = Math.max(0.01, ...factors.map(([, v]) => Math.abs(v)));
  const auc = (model as any).metrics?.auc_model;
  const aucBase = (model as any).metrics?.auc_baseline_category_mean;

  const link = (id: string) => `/order${qs}&order=${id}`;
  const cost = Math.max(r.expCostSingleVnd, r.expCostReusableVnd, 1);
  const saving = r.expCostSingleVnd - r.expCostReusableVnd;
  const parts = [
    { name: t("Cost advantage", "Lợi thế chi phí"), score: r.scoreCost, weight: w.cost },
    { name: t(`Chance the pack comes back (${f.pct(r.packReturnProb)})`, `Khả năng bao bì quay về (${f.pct(r.packReturnProb)})`), score: r.scorePackReturn, weight: w.pack_return },
    { name: t(`Reuse cycles (${cfg.packaging.reuse_cycles.value} times)`, `Số vòng tái sử dụng (${cfg.packaging.reuse_cycles.value} lần)`), score: r.scoreCycles, weight: w.cycles },
  ];
  const hasOutcome = s.row.order_status === "Delivered" && s.row.was_returned !== null;
  const meta = [s.row.category + (o.multi_size ? t(" (multi-size)", " (nhiều cỡ)") : ""), f.vnd(Number(s.row.order_value_vnd)), s.row.payment_method,
    `${t("customer", "khách hàng")} ${s.row.customer_id}`, `${s.row.address}, ${o.estimated_delivery_distance_km} km`, s.row.order_date];

  return (
    <AppShell qs={qs} email={user?.email}>
      <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")} items={settingsItems(t, orgs, orgId, presetKey, method)} />

      <div className="rl-rise flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link className="font-semibold underline underline-offset-2" href={`/orders${qs}`}>← {t("All orders", "Tất cả đơn hàng")}</Link>
        <div className="flex gap-2">
          {prev ? <Link className={`${BTN} border border-[#174538]/40 bg-white`} href={link(prev.row.order_id)}>← {prev.row.order_id}</Link> : null}
          {next ? <Link className={`${BTN} border border-[#174538]/40 bg-white`} href={link(next.row.order_id)}>{next.row.order_id} →</Link> : null}
        </div>
      </div>

      <div className="rl-rise mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4" style={rise(1)}>
        <div>
          <h1 className={`${H} text-4xl md:text-5xl`}>{t("Order", "Đơn hàng")} {s.row.order_id}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#355E3B]">{meta.join(" · ")}</p>
        </div>
        <form action="/order" className="flex items-end gap-2">
          <input type="hidden" name="method" value={method} /><input type="hidden" name="preset" value={presetKey} /><input type="hidden" name="org" value={orgId} />
          <label className="text-sm font-semibold">
            {t("Open another order", "Mở đơn hàng khác")}
            <input name="order" placeholder={t("O000123", "O000123")} defaultValue="" className="mt-1.5 block w-40 rounded-[9px] border border-[#174538]/25 bg-[#FFFEF6] px-3 py-2 text-sm font-normal text-[#174538] outline-none placeholder:text-[#355E3B]/60 focus:border-[#174538]" />
          </label>
          <button className={`${BTN} cursor-pointer border border-[#174538]/40 bg-white`}>{t("Show", "Xem")}</button>
        </form>
      </div>

      {/* relative z-20: the open dropdown lists must paint above the sections below */}
      <div id="settings-panel" className="rl-rise relative z-20 mt-6" style={rise(2)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/order" hidden={{ order: s.row.order_id }} />
      </div>

      {/* 1. What to pack, and the AI prediction */}
      <Section title={t("Recommendation", "Đề xuất")} i={3}
        sub={t(`What to pack this order in, and why. ${methodLabel(t, method)}.`, `Nên đóng gói đơn này bằng gì, và vì sao. ${methodLabel(t, method)}.`)}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={CARD}>
            <p className="text-xs text-[#355E3B]">{t("Packing instruction", "Chỉ dẫn đóng gói")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <RecPill rec={r.recommendation} size="lg" />
              <span className="font-semibold">{instructionText(t, code)}</span>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">{f.n(r.rvs, 1)}</span>
              <span className="text-sm text-[#355E3B]">/ 100 RVS</span>
            </div>
            {/* Gauge: the three bands, with a marker at this order's score */}
            <div className="relative mt-3">
              <div className="flex h-3 overflow-hidden rounded-[2px]">
                <div style={{ width: "40%", background: BAND.single }} /><div style={{ width: "30%", background: BAND.review }} /><div style={{ width: "30%", background: BAND.reusable }} />
              </div>
              <div aria-hidden className="absolute -top-1 h-5 w-[3px] -translate-x-1/2 rounded-full bg-[#174538] ring-2 ring-white" style={{ left: `${Math.min(100, Math.max(0, r.rvs))}%` }} />
              <div className="mt-1.5 flex text-[11px] text-[#355E3B]">
                <span style={{ width: "40%" }}>Single-use &lt; 40</span><span style={{ width: "30%" }}>Review 40-69</span><span className="text-right" style={{ width: "30%" }}>Reusable ≥ 70</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed"><span className="font-semibold">{t("Why", "Lý do")}:</span> {reasonText(t, f, r, method)}</p>
            <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#174538]/10 pt-3 text-sm text-[#355E3B]">
              {other === "dropoff"
                ? t("If customers return the pack without a courier:", "Nếu khách tự gửi trả bao bì không cần shipper:")
                : t("If a courier picks up the pack:", "Nếu shipper đến lấy bao bì:")}
              <RecPill rec={r2.recommendation} /> <span>RVS {f.n(r2.rvs, 1)}</span>
            </p>
          </div>

          <div className={CARD}>
            <p className="text-xs text-[#355E3B]">{t("AI return prediction", "Dự đoán hoàn hàng bằng AI")}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">{f.pct(r.predReturnProb)}</span>
              <span className="text-sm text-[#355E3B]">{t("chance this order is returned", "khả năng đơn này bị hoàn")}</span>
            </div>
            <div className="mt-5 space-y-3.5">
              {[
                { label: t("This order", "Đơn này"), v: r.predReturnProb, color: TEAL },
                { label: t(`Average for ${s.row.category}`, `Trung bình của ${s.row.category}`), v: baseline, color: TEAL_LIGHT },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between text-xs"><span>{b.label}</span><b className="text-sm">{f.pct(b.v)}</b></div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
                    <div className="h-full" style={{ width: `${Math.min(100, b.v * 100)}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
            {hasOutcome && (
              <p className="mt-5 border-t border-[#174538]/10 pt-3 text-sm text-[#355E3B]">
                {t("Outcome in the data", "Kết quả trong dữ liệu")}:{" "}
                <b className="text-[#174538]">{Number(s.row.was_returned) === 1 ? t("returned", "đã hoàn") : t("not returned", "không hoàn")}</b>
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* 2. Why that probability */}
      <Section title={t("Why this return probability", "Vì sao có xác suất hoàn này")} i={4}
        sub={t("What raises or lowers the chance this order is returned.", "Điều gì làm tăng hoặc giảm khả năng đơn này bị hoàn.")}>
        <div className={CARD}>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#355E3B]">
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: TEAL }} />{t("Raises the chance", "Làm tăng khả năng")}</span>
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: TEAL_LIGHT }} />{t("Lowers the chance", "Làm giảm khả năng")}</span>
          </div>
          <div className="mt-4 divide-y divide-[#174538]/10">
            {factors.map(([name, val]) => (
              <div key={name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_4.5rem] items-center gap-4 py-2.5 text-sm">
                <span className={val === 0 ? "text-[#355E3B]" : ""}>{name}</span>
                <div className="relative h-3">
                  <div aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-[#174538]/30" />
                  {val !== 0 && (
                    <div className="absolute inset-y-0.5 rounded-[2px]"
                      style={{ background: val > 0 ? TEAL : TEAL_LIGHT, width: `${(Math.abs(val) / maxFactor) * 50}%`, ...(val > 0 ? { left: "50%" } : { right: "50%" }) }} />
                  )}
                </div>
                <span className={`text-right ${val === 0 ? "text-xs text-[#355E3B]" : "font-semibold"}`}>
                  {val === 0 ? t("n/a", "không áp dụng") : (val > 0 ? "+" : "") + f.n(val, 2)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#355E3B]">
            {t("Effect in log-odds (the model's own scale). ", "Ảnh hưởng theo log-odds (thang riêng của mô hình). ")}
            {t("Model used", "Mô hình đang dùng")}: {modelLabel}. AUC {auc ?? "-"} {t("vs category baseline", "so với mốc theo danh mục")} {aucBase ?? "-"}.
            {(model as any).trained_at
              ? t(" Measured on the newest 25% of this data set's orders, which were not used for training.", " Được đo trên 25% đơn hàng mới nhất của bộ dữ liệu này, không dùng khi huấn luyện.")
              : t(" This shows the pipeline works, not real-world accuracy. Brands can retrain it on their own data on the AI Model page.",
                  " Điều này cho thấy quy trình hoạt động, chưa phải độ chính xác thực tế. Thương hiệu có thể huấn luyện lại bằng dữ liệu riêng tại trang Mô hình AI.")}
          </p>
        </div>
      </Section>

      {/* 3 and 4. How the score is built, and what it costs */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={t("How the score is built", "Cách tính điểm")} i={5}
          sub={t("Three parts, each scored from 0 to 100.", "Ba phần, mỗi phần chấm từ 0 đến 100.")}>
          <div className={`${CARD} h-full`}>
            <div className="space-y-4">
              {parts.map((p) => (
                <div key={p.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{p.name}</span>
                    <span className="shrink-0 text-xs text-[#355E3B]">{f.pct(p.weight)} {t("weight", "trọng số")}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
                      <div className="h-full" style={{ width: `${Math.min(100, p.score)}%`, background: TEAL }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm"><b>{f.n(p.score)}</b> <span className="text-xs text-[#355E3B]">→ {f.n(p.weight * p.score, 1)}</span></span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 flex items-baseline justify-between border-t border-[#174538]/10 pt-3 text-sm">
              <span className="text-[#355E3B]">{t("Total score (RVS)", "Tổng điểm (RVS)")}</span>
              <b className="text-xl font-medium">{f.n(r.rvs, 1)}</b>
            </p>
          </div>
        </Section>

        <Section title={t("Expected packaging cost", "Chi phí bao bì dự kiến")} i={6}
          sub={t("For this one order.", "Cho riêng đơn hàng này.")}>
          <div className={`${CARD} h-full`}>
            <div className="space-y-4">
              {[
                { label: t("Single-use", "Dùng một lần"), v: r.expCostSingleVnd, color: TEAL_LIGHT },
                { label: t("Reusable", "Tái sử dụng"), v: r.expCostReusableVnd, color: TEAL },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between text-sm"><span>{b.label}</span><b className="text-base">{f.vnd(b.v)}</b></div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
                    <div className="h-full" style={{ width: `${(b.v / cost) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-[#174538]/10 pt-3 text-sm">
              {Math.round(saving) === 0
                ? t("No difference in expected cost.", "Chi phí dự kiến không chênh lệch.")
                : saving > 0
                  ? t(`Reusable is expected to save ${f.vnd(saving)} on this order.`, `Bao bì tái sử dụng dự kiến tiết kiệm ${f.vnd(saving)} cho đơn này.`)
                  : t(`Reusable is expected to cost ${f.vnd(-saving)} more on this order.`, `Bao bì tái sử dụng dự kiến tốn thêm ${f.vnd(-saving)} cho đơn này.`)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#355E3B]">
              {method === "dropoff"
                ? t("Reusable includes cleaning, return without a courier, and the risk of losing the pack.", "Tái sử dụng gồm vệ sinh, khách tự gửi trả không cần shipper, và rủi ro mất bao bì.")
                : t("Reusable includes cleaning, the courier pickup fee, and the risk of losing the pack.", "Tái sử dụng gồm vệ sinh, phí shipper đến lấy, và rủi ro mất bao bì.")}
            </p>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
