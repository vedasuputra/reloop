import { connection } from "next/server";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import Controls from "@/components/Controls";
import SettingsBar from "@/components/SettingsBar";
import PrintButton from "@/components/PrintButton";
import Section from "@/components/Section";
import Stat from "@/components/Stat";
import { ChartCard, PlasticChart, Swatch, TEAL, TEAL_LIGHT } from "@/components/DashboardCharts";
import { CARD, Notice, PageTitle, TABLE_BOX, rise } from "@/components/ui";
import { loadContext } from "@/lib/context";
import { buildReport, eprIsOfficial, MAILER_KG, REUSABLE_KG } from "@/lib/report";
import type { Params } from "@/lib/data";
import { methodLabel } from "@/lib/i18n";
import { settingsItems } from "@/lib/orderView";

export const metadata = { title: "Sustainability report" };

export default function Report({ searchParams }: { searchParams: Promise<Params> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, orgs, orgId, scored, qs, hasCustom, modelLabel, lang, t, f } = await loadContext(sp);
  const rows = buildReport(scored, cfg);
  const showEpr = eprIsOfficial(cfg); // no EPR figure at all until the official numbers are in the configuration
  const total = rows[rows.length - 1];
  const months = rows.slice(0, -1);
  const org = orgs.find((o) => o.id === orgId)?.name;
  const monthLabel = (k: string) => (k === "Total" ? t("Total", "Tổng") : k === "Tanpa tanggal" ? t("No date", "Không có ngày") : k);

  // Packs avoided are reported net of lost bags: a reusable bag that never comes back is waste too
  const reusable = scored.filter((s) => s.r.recommendation === "REUSABLE");
  const lostBags = reusable.reduce((a, s) => a + s.lostProb, 0);
  const grossAvoided = total.mailersAvoided + total.boxesAvoided;
  const netAvoided = grossAvoided - lostBags;
  const netPlastic = total.plasticAvoidedKg - total.plasticUsedKg;
  const dated = months.filter((m) => /^\d{4}-\d{2}$/.test(m.key));
  const today = new Date().toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", { year: "numeric", month: "long", day: "numeric" });

  // Small weights need more decimals, or a month of a few grams reads as 0.0
  const kg = (x: number) => `${f.n(x, Math.abs(x) < 1 ? 2 : 1)} kg`;
  const thBase = "whitespace-nowrap px-4 py-3 text-xs font-semibold text-[#355E3B]";
  const num = "whitespace-nowrap px-4 py-3 text-right";

  return (
    <AppShell qs={qs} email={user?.email}
      footerNote={t("Packs avoided are reported net of lost reusable bags. CO₂ is not estimated until sourced emission factors exist.", "Bao bì được tránh được báo cáo ròng, sau khi trừ túi tái sử dụng bị mất. CO₂ chưa được ước tính cho đến khi có hệ số phát thải có nguồn.")}>
      <div className="print:hidden">
        <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")} items={settingsItems(t, orgs, orgId, presetKey, method)} />
      </div>
      <PageTitle title={t("Sustainability report", "Báo cáo bền vững")}
        actions={<PrintButton label={t("Save as PDF", "Lưu PDF")} />} />
      {/* On screen the dropdowns say which data and settings these are; on paper they are hidden, so the page says it */}
      <p className="mt-3 hidden text-sm text-[#355E3B] print:block">
        {org} · {methodLabel(t, method)} · {modelLabel} · {t("Prepared by ReLoop AI on", "Do ReLoop AI lập ngày")} {today}
      </p>

      <div id="settings-panel" className="rl-rise relative z-20 mt-6 print:hidden" style={rise(1)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/report" />
      </div>

      {/* Impact: the headline is net of lost bags */}
      <Section title={t("Impact", "Tác động")}
        sub={t("What the packing instructions avoid, counted only for orders recommended Reusable.", "Những gì chỉ dẫn đóng gói giúp tránh được, chỉ tính cho các đơn được đề xuất Reusable.")} i={2}>
        <div className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-2 xl:grid-cols-4">
          <Stat layout="cell" variant="green" label={t("Net single-use packs avoided", "Bao bì dùng một lần được tránh (ròng)")} value={f.n(Math.round(netAvoided))}
            note={t(`${f.n(grossAvoided)} avoided, ${f.n(Math.round(lostBags))} reusable bags expected lost`, `tránh ${f.n(grossAvoided)}, dự kiến mất ${f.n(Math.round(lostBags))} túi tái sử dụng`)} />
          <Stat layout="cell" label={t("Single-use packs avoided", "Bao bì dùng một lần được tránh")} value={f.n(grossAvoided)}
            note={t(`${f.n(total.mailersAvoided)} mailers, ${f.n(total.boxesAvoided)} boxes`, `${f.n(total.mailersAvoided)} túi gói hàng, ${f.n(total.boxesAvoided)} hộp`)} />
          <Stat layout="cell" label={t("Mailer plastic avoided", "Nhựa túi gói hàng được tránh")} value={kg(total.plasticAvoidedKg)}
            note={t(`${f.n(MAILER_KG * 1000, 1)} g per mailer; boxes not weighed yet`, `${f.n(MAILER_KG * 1000, 1)} g mỗi túi; chưa cân hộp`)} />
          <Stat layout="cell" label={t("New reusable-pack plastic", "Nhựa từ túi tái sử dụng mới")} value={kg(total.plasticUsedKg)}
            note={t(`${f.n(total.newReusablePacks)} packs · ${REUSABLE_KG * 1000} g each`, `${f.n(total.newReusablePacks)} túi · ${REUSABLE_KG * 1000} g mỗi túi`)} />
        </div>
      </Section>

      <Section title={showEpr ? t("Cost and compliance", "Chi phí và tuân thủ") : t("Plastic and cost", "Nhựa và chi phí")} i={3}>
        <div className={`grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 ${showEpr ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"}`}>
          <Stat layout="cell" label={t("Net plastic change", "Chênh lệch nhựa ròng")} value={`${netPlastic > 0 ? "−" : netPlastic < 0 ? "+" : ""}${kg(Math.abs(netPlastic))}`}
            note={netPlastic >= 0 ? t("plastic reduced", "nhựa giảm") : t("plastic increased", "nhựa tăng")} />
          <Stat layout="cell" label={t("Packaging cost, all single-use", "Chi phí bao bì, toàn bộ dùng một lần")} value={f.vnd(total.costSingle)} />
          <Stat layout="cell" label={t("Packaging cost, following ReLoop", "Chi phí bao bì, theo đề xuất ReLoop")} value={f.vnd(total.costReloop)}
            note={Math.round(total.costSingle - total.costReloop) === 0 ? undefined
              : total.costSingle > total.costReloop ? `${f.vnd(total.costSingle - total.costReloop)} ${t("saved", "tiết kiệm")}` : `${f.vnd(total.costReloop - total.costSingle)} ${t("more", "tăng thêm")}`} />
          {showEpr && (
            <Stat layout="cell" label={t("EPR obligation avoided", "Nghĩa vụ EPR được tránh")}
              value={total.eprSimVnd === null ? "-" : f.vnd(total.eprSimVnd)} />
          )}
        </div>
        <p className="mt-3 text-xs text-[#355E3B]/80">{t("CO₂ impact: not estimated yet (no sourced emission factor).", "Tác động CO₂: chưa ước tính (chưa có hệ số phát thải có nguồn).")}</p>
      </Section>

      {dated.length >= 1 && (
        <Section title={t("Plastic by month", "Nhựa theo tháng")} i={4}>
          <ChartCard title={t("Plastic avoided and new reusable-pack plastic, kg", "Nhựa được tránh và nhựa túi tái sử dụng mới, kg")}
            sub={
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <Swatch color={TEAL} label={t("Mailer plastic avoided", "Nhựa túi gói hàng được tránh")} />
                <Swatch color={TEAL_LIGHT} label={t("New reusable-pack plastic", "Nhựa túi tái sử dụng mới")} />
              </div>
            }>
            <PlasticChart months={dated.map((m) => ({ key: m.key, avoided: m.plasticAvoidedKg, used: m.plasticUsedKg }))} fmt={(v) => f.n(v, v === 0 ? 0 : v < 1 ? 3 : v < 10 ? 1 : 0)}
              tip={(m) => `${m.key}: ${f.n(m.avoided, 2)} kg ${t("avoided", "được tránh")}, ${f.n(m.used, 2)} kg ${t("new reusable plastic", "nhựa túi tái sử dụng mới")}`}
              label={t("Plastic avoided and new reusable-pack plastic by month", "Nhựa được tránh và nhựa túi tái sử dụng mới theo tháng")} />
          </ChartCard>
        </Section>
      )}

      <Section title={t("By month", "Theo tháng")} i={5}>
        <div className={TABLE_BOX}>
          <table className={`w-full text-sm ${showEpr ? "min-w-[1000px]" : "min-w-[900px]"}`}>
            <thead>
              <tr className="border-b border-[#174538]/15">
                <th className={`${thBase} text-left`}>{t("Month", "Tháng")}</th>
                {[t("Orders", "Đơn hàng"), t("Reusable used", "Dùng tái sử dụng"), t("Mailers avoided", "Túi gói hàng được tránh"), t("Boxes avoided", "Hộp được tránh"),
                  t("Plastic avoided (kg)", "Nhựa được tránh (kg)"), t("New reusable plastic (kg)", "Nhựa túi tái sử dụng mới (kg)"),
                  t("Cost, single-use", "Chi phí, dùng một lần"), t("Cost, following ReLoop", "Chi phí, theo ReLoop"), ...(showEpr ? [t("EPR", "EPR")] : [])]
                  .map((h) => <th key={h} className={`${thBase} text-right`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isTotal = r.key === "Total";
                return (
                  <tr key={r.key} className={`border-b border-[#174538]/10 last:border-0 ${isTotal ? "bg-[#FFFEF6] font-semibold" : "hover:bg-[#FFFEF6]"}`}>
                    <td className="whitespace-nowrap px-4 py-3">{monthLabel(r.key)}</td>
                    <td className={num}>{f.n(r.orders)}</td><td className={num}>{f.n(r.reusableUses)}</td>
                    <td className={num}>{f.n(r.mailersAvoided)}</td><td className={num}>{f.n(r.boxesAvoided)}</td>
                    <td className={num}>{f.n(r.plasticAvoidedKg, 2)}</td><td className={num}>{f.n(r.plasticUsedKg, 2)}</td>
                    <td className={num}>{f.vnd(r.costSingle)}</td><td className={num}>{f.vnd(r.costReloop)}</td>
                    {showEpr && <td className={num}>{r.eprSimVnd === null ? "-" : f.vnd(r.eprSimVnd)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t("How this is calculated", "Cách tính")} i={6}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className={CARD}>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#355E3B]">
              <li>{t("Only orders recommended REUSABLE are counted as using a reusable pack; all others stay single-use.",
                "Chỉ các đơn được đề xuất REUSABLE mới được tính là dùng túi tái sử dụng; các đơn còn lại vẫn dùng bao bì dùng một lần.")}</li>
              <li>{t(`Mailer weight ${f.n(MAILER_KG * 1000, 1)} g: K&S listing on Lazada (500 g pack, sizes 25x35 and 28x42). Reusable pack ${REUSABLE_KG * 1000} g: 1 kg / 55 bags (Lazada listing). Box weight has no source yet, so boxes are not weighed.`,
                `Khối lượng túi gói hàng ${f.n(MAILER_KG * 1000, 1)} g: sản phẩm K&S trên Lazada (gói 500 g, cỡ 25x35 và 28x42). Túi tái sử dụng ${REUSABLE_KG * 1000} g: 1 kg / 55 túi (sản phẩm trên Lazada). Khối lượng hộp chưa có nguồn nên chưa được cân.`)}</li>
              <li>{t(`New reusable packs = number of uses / ${cfg.packaging.reuse_cycles.value} cycles + expected packs that do not come back.`,
                `Túi tái sử dụng mới = số lần sử dụng / ${cfg.packaging.reuse_cycles.value} vòng + số túi dự kiến không quay về.`)}</li>
              <li>{t("Net single-use packs avoided = packs avoided minus the reusable bags expected to be lost.", "Bao bì dùng một lần được tránh (ròng) = bao bì được tránh trừ số túi tái sử dụng dự kiến bị mất.")}</li>
              <li>{t("All orders are simulated data except data a company uploads itself.", "Toàn bộ đơn hàng là dữ liệu mô phỏng, trừ dữ liệu do doanh nghiệp tự tải lên.")}</li>
            </ul>
          </div>
          <Notice tone="info" title={t("EPR figures", "Số liệu EPR")}>
            {showEpr
              ? t("EPR (Decree 05/2025): weight avoided × mandatory recycling rate × Fs × (1 + 2% admin cost), using the official figures entered in the configuration.",
                  "EPR (Nghị định 05/2025): khối lượng được tránh × tỷ lệ tái chế bắt buộc × Fs × (1 + 2% chi phí quản lý), dùng các số chính thức đã nhập trong cấu hình.")
              : t("EPR figures appear here once the official Fs rate and mandatory recycling rate (Decree 05/2025) are entered.",
                  "Số liệu EPR sẽ hiển thị tại đây khi đã nhập hệ số Fs chính thức và tỷ lệ tái chế bắt buộc (Nghị định 05/2025).")}
          </Notice>
        </div>
      </Section>
    </AppShell>
  );
}
