import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import Controls from "@/components/Controls";
import SettingsBar from "@/components/SettingsBar";
import SoftForm from "@/components/SoftForm";
import Section from "@/components/Section";
import Stat from "@/components/Stat";
import { Field, NumberInput, SelectInput } from "@/components/FormControls";
import { ChartCard, LineChart, Swatch, TEAL, TEAL_LIGHT } from "@/components/DashboardCharts";
import { BTN_PRIMARY, BTN_OUTLINE, CARD, Notice, PageTitle, TABLE_BOX, TH, TR, Tag, rise } from "@/components/ui";
import { loadContext } from "@/lib/context";
import { scoreAll, type Params } from "@/lib/data";
import { simulate, type SimRow } from "@/lib/simulate";
import { methodLabel, type Fmt, type T } from "@/lib/i18n";
import { settingsItems } from "@/lib/orderView";

export const metadata = { title: "Simulator" };

const SHARES = [10, 20, 30, 40];
/** Coolmate's volume in the team's plan (about 10,000 orders a day). */
const DEFAULT_DAILY = 10000;

export default function Simulator({ searchParams }: { searchParams: Promise<Params> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, model, orgs, orgId, rows, scored, qs, hasCustom, t, f } = await loadContext(sp);

  // Both ways of getting packs back, so they can be read side by side
  const other = method === "dropoff" ? "courier_pickup" : "dropoff";
  const simSel = simulate(scored);
  const simAlt = simulate(scoreAll(rows, cfg, other, model));
  const simOf = (m: string) => (m === method ? simSel : simAlt);

  const n = Math.max(1, scored.length);
  const basePer1000 = (scored.reduce((a, s) => a + s.r.expCostSingleVnd, 0) / n) * 1000;
  const top = simSel.find((r) => r.sharePct === 40);

  // "Scale to your volume": the per-1,000 results of the chosen share, multiplied up to a daily order count
  const dailyDigits = Number((sp.daily ?? "").replace(/[^\d]/g, ""));
  const daily = dailyDigits > 0 ? Math.min(10_000_000, dailyDigits) : DEFAULT_DAILY;
  const share = SHARES.includes(Number(sp.share)) ? Number(sp.share) : 40;
  const pick = simSel.find((r) => r.sharePct === share);
  const perDay = (per1000: number) => (per1000 * daily) / 1000;

  // Shares at which picking at random is cheaper than following the score (an honest limit, not hidden)
  const randomWins = simSel.filter((r) => r.sharePct > 0 && r.extraPer1000 > r.extraRandomPer1000 + 1).map((r) => `${r.sharePct}%`);

  const kVnd = (v: number) => (Math.round(v / 1000) === 0 ? "0" : `${v > 0 ? "+" : "−"}${f.n(Math.abs(v) / 1000)}k`);

  return (
    <AppShell qs={qs} email={user?.email}>
      <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")} items={settingsItems(t, orgs, orgId, presetKey, method)} />
      <PageTitle title={t("Scenario simulator", "Mô phỏng kịch bản")}
        sub={t("Rank every order by its score (RVS), switch the top 10 to 40% to reusable packs, and see what it does to cost and single-use packs. The comparison picks the same number of orders at random.",
          "Xếp mọi đơn hàng theo điểm RVS, chuyển 10 đến 40% đơn cao nhất sang bao bì tái sử dụng và xem chi phí cùng số bao bì dùng một lần thay đổi ra sao. Phép so sánh chọn cùng số đơn một cách ngẫu nhiên.")} />

      <div id="settings-panel" className="rl-rise relative z-20 mt-6" style={rise(1)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/simulator" />
      </div>

      {!top ? (
        <Notice tone="warn" className="rl-rise mt-6">
          {t("This data set has no orders to simulate yet.", "Bộ dữ liệu này chưa có đơn hàng để mô phỏng.")}{" "}
          <Link href={`/upload${qs}`} className="font-semibold underline underline-offset-2">{t("Upload orders", "Tải đơn hàng lên")}</Link>
        </Notice>
      ) : (
        <>
          {/* Headline numbers at the largest share, for the way packs come back chosen above */}
          <div className="rl-rise mt-5" style={rise(2)}>
            <div className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-2 xl:grid-cols-4">
              <Stat layout="cell" label={t("Baseline cost, all single-use", "Chi phí gốc, toàn bộ dùng một lần")} value={f.vnd(basePer1000)}
                note={t("per 1,000 orders", "trên 1.000 đơn")} />
              <Stat layout="cell" variant="green"
                label={t("Cost change at 40% reusable", "Thay đổi chi phí ở mức 40% tái sử dụng")}
                value={Math.round(top.extraPer1000) === 0 ? t("No change", "Không đổi") : `${top.extraPer1000 < 0 ? "−" : "+"}${f.vnd(Math.abs(top.extraPer1000))}`}
                note={t(`per 1,000 orders, highest scores first · ${methodLabel(t, method).toLowerCase()}`, `trên 1.000 đơn, điểm cao nhất trước · ${methodLabel(t, method).toLowerCase()}`)} />
              <Stat layout="cell" label={t("Net single-use packs avoided at 40%", "Bao bì dùng một lần được tránh (ròng) ở mức 40%")}
                value={f.n(Math.round(top.packsAvoidedPer1000 - top.packsLostPer1000))}
                note={t(`${f.n(Math.round(top.packsAvoidedPer1000))} avoided, ${f.n(Math.round(top.packsLostPer1000))} reusable bags lost, per 1,000 orders`,
                  `tránh ${f.n(Math.round(top.packsAvoidedPer1000))}, mất ${f.n(Math.round(top.packsLostPer1000))} túi tái sử dụng, trên 1.000 đơn`)} />
              <Stat layout="cell" label={t("Scores vs picking at random, at 40%", "Theo điểm so với chọn ngẫu nhiên, ở mức 40%")}
                value={Math.round(top.extraRandomPer1000 - top.extraPer1000) === 0 ? t("Same cost", "Cùng chi phí") : f.vnd(Math.abs(top.extraRandomPer1000 - top.extraPer1000))}
                note={Math.round(top.extraRandomPer1000 - top.extraPer1000) === 0 ? undefined
                  : top.extraPer1000 < top.extraRandomPer1000
                    ? t("cheaper per 1,000 orders when following the score", "rẻ hơn trên 1.000 đơn khi theo điểm số")
                    : t("cheaper per 1,000 orders with random picking", "rẻ hơn trên 1.000 đơn khi chọn ngẫu nhiên")} />
            </div>
          </div>

          <Section title={t("Cost as more orders switch", "Chi phí khi nhiều đơn chuyển đổi")}
            sub={t("Per 1,000 orders. Below zero means money saved.", "Trên 1.000 đơn. Dưới 0 nghĩa là tiết kiệm được.")} i={3}>
            <ChartCard title={t(`Cost change per 1,000 orders, ${methodLabel(t, method).toLowerCase()}`, `Thay đổi chi phí trên 1.000 đơn, ${methodLabel(t, method).toLowerCase()}`)}
              sub={
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <Swatch color={TEAL} label={t("Highest scores first", "Điểm cao nhất trước")} />
                  <Swatch color={TEAL_LIGHT} label={t("Random orders", "Đơn ngẫu nhiên")} />
                </div>
              }
              footer={t("“Highest scores first” switches the best-scoring orders first; “Random orders” switches the same number without looking at the score.",
                "“Điểm cao nhất trước” chuyển các đơn điểm cao trước; “Đơn ngẫu nhiên” chuyển cùng số đơn mà không xét điểm.")}>
              <LineChart xs={simSel.map((r) => `${r.sharePct}%`)} fmt={kVnd}
                tip={(name, x, v) => `${name}, ${x} ${t("of orders switched", "số đơn chuyển đổi")}: ${
                  Math.round(v) === 0 ? t("no change", "không đổi") : v > 0 ? `${f.vnd(v)} ${t("extra cost", "chi phí tăng thêm")}` : `${f.vnd(-v)} ${t("saved", "tiết kiệm")}`
                } ${t("per 1,000 orders", "trên 1.000 đơn")}`}
                label={t("Cost change per 1,000 orders by share of orders switched to reusable", "Thay đổi chi phí trên 1.000 đơn theo tỷ lệ đơn chuyển sang tái sử dụng")}
                series={[
                  { name: t("Highest scores first", "Điểm cao nhất trước"), color: TEAL, points: simSel.map((r) => r.extraPer1000) },
                  { name: t("Random orders", "Đơn ngẫu nhiên"), color: TEAL_LIGHT, points: simSel.map((r) => r.extraRandomPer1000) },
                ]} />
            </ChartCard>
          </Section>

          <Section title={t("Courier pickup vs drop-off", "Shipper đến lấy so với khách tự gửi trả")}
            sub={t("The same orders under both ways of getting packs back, per 1,000 orders. Net packs = single-use packs avoided minus reusable bags lost.",
              "Cùng các đơn hàng này với hai cách thu hồi bao bì, trên 1.000 đơn. Bao bì ròng = bao bì dùng một lần được tránh trừ túi tái sử dụng bị mất.")} i={4}>
            <div className="space-y-5">
              {(["courier_pickup", "dropoff"] as const).map((m) => (
                <ScenarioTable key={m} method={m} selected={m === method} sim={simOf(m)} t={t} f={f} />
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#355E3B]">
              {t(`Drop-off assumes ${f.pct(cfg.generator.dropoff_recovery_target.value)} of customers return the pack themselves; the pilot measures the real rate. Change it under Cost settings.`,
                `Khách tự gửi trả giả định ${f.pct(cfg.generator.dropoff_recovery_target.value)} khách tự trả bao bì; thí điểm sẽ đo tỷ lệ thật. Bạn có thể đổi ở Cài đặt chi phí.`)}
            </p>
          </Section>

          {/* Scale to a daily volume */}
          <Section title={t("Scale to your volume", "Quy đổi theo quy mô của bạn")}
            sub={t("Multiplies the per-1,000 result of the way packs come back chosen above up to a daily order count.",
              "Nhân kết quả trên 1.000 đơn của cách thu hồi đã chọn ở trên theo số đơn mỗi ngày.")} i={5}>
            <div className={CARD}>
              <SoftForm action="/simulator" className="flex flex-wrap items-end gap-4">
                <input type="hidden" name="method" value={method} /><input type="hidden" name="preset" value={presetKey} /><input type="hidden" name="org" value={orgId} />
                <Field label={t("Orders per day", "Số đơn mỗi ngày")} className="min-w-[11rem] flex-1">
                  <NumberInput name="daily" defaultValue={daily} min={1} max={10000000} suffix={t("orders", "đơn")} />
                </Field>
                <Field label={t("Share switched to reusable", "Tỷ lệ chuyển sang tái sử dụng")} className="min-w-[11rem] flex-1">
                  <SelectInput name="share" defaultValue={String(share)} options={SHARES.map((s) => ({ value: String(s), label: `${s}%` }))} />
                </Field>
                <button className={BTN_PRIMARY}>{t("Calculate", "Tính")}</button>
                {(daily !== DEFAULT_DAILY || share !== 40) && (
                  <Link href={`/simulator${qs}`} className={BTN_OUTLINE}>{t("Reset", "Đặt lại")}</Link>
                )}
              </SoftForm>

              {pick && (
                <div className="mt-5 grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat layout="cell" label={t("Single-use packs avoided per day", "Bao bì dùng một lần được tránh mỗi ngày")} value={f.n(Math.round(perDay(pick.packsAvoidedPer1000)))}
                    note={t(`${share}% of ${f.n(daily)} orders`, `${share}% của ${f.n(daily)} đơn`)} />
                  <Stat layout="cell" label={t("Reusable bags lost per day", "Túi tái sử dụng bị mất mỗi ngày")} value={f.n(Math.round(perDay(pick.packsLostPer1000)))}
                    note={t("count as waste too", "cũng tính là rác thải")} />
                  <Stat layout="cell" variant="green" label={t("Net packs avoided per day", "Bao bì được tránh (ròng) mỗi ngày")}
                    value={f.n(Math.round(perDay(pick.packsAvoidedPer1000 - pick.packsLostPer1000)))} />
                  <Stat layout="cell" label={t("Cost change per day", "Thay đổi chi phí mỗi ngày")}
                    value={Math.round(perDay(pick.extraPer1000)) === 0 ? t("No change", "Không đổi") : `${pick.extraPer1000 < 0 ? "−" : "+"}${f.vnd(Math.abs(perDay(pick.extraPer1000)))}`}
                    note={pick.extraPer1000 < 0 ? t("saved", "tiết kiệm") : pick.extraPer1000 > 0 ? t("extra cost", "chi phí tăng thêm") : undefined} />
                </div>
              )}
              <p className="mt-4 text-xs leading-relaxed text-[#355E3B]">
                {t(`Illustrative: ${f.n(DEFAULT_DAILY)} orders a day is Coolmate's volume in the team's plan. The result is the per-1,000 figure scaled in a straight line, using this data set and these settings.`,
                  `Minh họa: ${f.n(DEFAULT_DAILY)} đơn mỗi ngày là quy mô của Coolmate trong kế hoạch của đội. Kết quả là số liệu trên 1.000 đơn nhân tuyến tính, dùng bộ dữ liệu và cài đặt này.`)}
              </p>
            </div>
          </Section>

          <Section title={t("Read this before quoting a number", "Đọc điều này trước khi trích dẫn số liệu")} i={6}>
            <div className="grid gap-5 md:grid-cols-2">
              <Notice tone="info" title={t("Honest limits", "Giới hạn được nêu rõ")}>
                <ul className="list-disc space-y-1 pl-5">
                  {randomWins.length > 0 && (
                    <li>{t(`In this data set, picking at random is slightly cheaper at ${randomWins.join(", ")}. That usually happens when most orders already qualify for reusable, so ranking has little to add; the score pays off at higher shares.`,
                      `Trong bộ dữ liệu này, chọn ngẫu nhiên rẻ hơn một chút ở mức ${randomWins.join(", ")}. Điều này thường xảy ra khi phần lớn đơn đã đủ điều kiện tái sử dụng nên việc xếp hạng ít bổ sung; điểm số phát huy ở tỷ lệ cao hơn.`)}</li>
                  )}
                  <li>{t("Reusable bags that are not returned also become waste.", "Túi tái sử dụng không quay về cũng trở thành rác thải.")}</li>
                  <li>{t("CO₂ is not estimated: there is no sourced emission factor yet. EPR credits are excluded.", "CO₂ chưa được ước tính vì chưa có hệ số phát thải có nguồn. Không tính tín chỉ EPR.")}</li>
                </ul>
              </Notice>
              <Notice tone="warn" title={t("Simulated data, not pilot results", "Dữ liệu mô phỏng, không phải kết quả thí điểm")}>
                {t("Who returns an item and whether a pack comes back are simulated; prices and courier tariffs are sourced. The month 4 to 7 pilot replaces the assumptions with measured rates.",
                  "Việc ai hoàn hàng và bao bì có quay về hay không là mô phỏng; giá và cước vận chuyển có nguồn. Thí điểm từ tháng 4 đến 7 sẽ thay các giả định bằng tỷ lệ đo được.")}
              </Notice>
            </div>
          </Section>
        </>
      )}
    </AppShell>
  );
}

/** One way of getting packs back: the four shares, with the cost result of following the score and of picking at random. */
function ScenarioTable({ method, selected, sim, t, f }: { method: string; selected: boolean; sim: SimRow[]; t: T; f: Fmt }) {
  const rowsShown = sim.filter((r) => r.sharePct > 0);
  const kVnd = (v: number) => (Math.round(v / 1000) === 0 ? "0 VND" : `${v > 0 ? "+" : "−"}${f.n(Math.abs(v) / 1000)}k VND`);
  const cost = (v: number) => <Tag tone={Math.round(v / 1000) === 0 ? "plain" : v < 0 ? "ok" : "warn"}>{kVnd(v)}</Tag>;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h3 className="font-semibold">{methodLabel(t, method)}</h3>
        {selected && <Tag tone="ok">{t("selected above", "đang chọn ở trên")}</Tag>}
      </div>
      <div className={TABLE_BOX}>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[#174538]/15">
              <th className={TH}>{t("Reusable share", "Tỷ lệ tái sử dụng")}</th>
              <th className={TH}>{t("Orders switched", "Số đơn chuyển đổi")}</th>
              <th className={TH}>{t("Single-use packs avoided", "Bao bì dùng một lần được tránh")}</th>
              <th className={TH}>{t("Reusable bags lost", "Túi tái sử dụng bị mất")}</th>
              <th className={TH}>{t("Net packs reduced", "Bao bì giảm (ròng)")}</th>
              <th className={TH}>{t("Cost change (score)", "Thay đổi chi phí (theo điểm)")}</th>
              <th className={TH}>{t("Cost change (random)", "Thay đổi chi phí (ngẫu nhiên)")}</th>
            </tr>
          </thead>
          <tbody>
            {rowsShown.map((r) => (
              <tr key={r.sharePct} className={TR}>
                <td className="px-4 py-3 font-semibold">{r.sharePct}%</td>
                <td className="px-4 py-3">{f.n(r.switched)}</td>
                <td className="px-4 py-3">{f.n(Math.round(r.packsAvoidedPer1000))}</td>
                <td className="px-4 py-3">{f.n(Math.round(r.packsLostPer1000))}</td>
                <td className="px-4 py-3 font-semibold">{f.n(Math.round(r.packsAvoidedPer1000 - r.packsLostPer1000))}</td>
                <td className="px-4 py-3">{cost(r.extraPer1000)}</td>
                <td className="px-4 py-3">{cost(r.extraRandomPer1000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
