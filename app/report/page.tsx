import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import PrintButton from "@/components/PrintButton";
import Stat from "@/components/Stat";
import { loadContext } from "@/lib/context";
import { buildReport, MAILER_KG, REUSABLE_KG } from "@/lib/report";
import type { Params } from "@/lib/data";
import { methodLabel } from "@/lib/i18n";

export const metadata = { title: "Sustainability Report" };

export default function Report({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <Suspense fallback={<p>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, orgs, orgId, scored, qs, hasCustom, modelLabel, t, f } = await loadContext(sp);
  const rows = buildReport(scored, cfg);
  const total = rows[rows.length - 1];
  const org = orgs.find((o) => o.id === orgId)?.name;
  const monthLabel = (k: string) => (k === "Total" ? t("Total", "Tổng") : k === "Tanpa tanggal" ? t("No date", "Không có ngày") : k);

  return (
    <>
      <div className="print:hidden"><Nav qs={qs} email={user?.email} /></div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("Sustainability & EPR Report", "Báo cáo Bền vững & EPR")}</h1>
        <PrintButton label={t("Print / save as PDF", "In / lưu PDF")} />
      </div>
      <p className="text-sm text-gray-500 mb-3">{org} · {methodLabel(t, method)} · {modelLabel}</p>
      <div className="print:hidden">
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/report" />
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        <Stat label={t("Single-use packs avoided", "Bao bì dùng một lần được tránh")} value={f.n(total.mailersAvoided + total.boxesAvoided)}
          note={t(`${f.n(total.mailersAvoided)} mailers, ${f.n(total.boxesAvoided)} boxes`, `${f.n(total.mailersAvoided)} túi gói hàng, ${f.n(total.boxesAvoided)} hộp`)} />
        <Stat label={t("Mailer plastic avoided", "Nhựa túi gói hàng được tránh")} value={`${f.n(total.plasticAvoidedKg, 1)} kg`}
          note={t(`${f.n(MAILER_KG * 1000, 1)} g per mailer; boxes not weighed yet`, `${f.n(MAILER_KG * 1000, 1)} g mỗi túi; chưa cân hộp`)} />
        <Stat label={t("New reusable-pack plastic", "Nhựa từ túi tái sử dụng mới")} value={`${f.n(total.plasticUsedKg, 1)} kg`}
          note={t(`${f.n(total.newReusablePacks)} packs (worn out + expected lost), ${REUSABLE_KG * 1000} g each`,
                  `${f.n(total.newReusablePacks)} túi (hết vòng đời + dự kiến bị mất), ${REUSABLE_KG * 1000} g mỗi túi`)} />
        <Stat label={t("Net plastic change", "Chênh lệch nhựa ròng")} value={`${f.n(total.plasticAvoidedKg - total.plasticUsedKg, 1)} kg`}
          note={total.plasticAvoidedKg >= total.plasticUsedKg ? t("reduced", "giảm") : t("increased", "tăng")} />
        <Stat label={t("Packaging cost, all single-use", "Chi phí bao bì, toàn bộ dùng một lần")} value={f.vnd(total.costSingle)} />
        <Stat label={t("Packaging cost, following ReLoop", "Chi phí bao bì, theo đề xuất ReLoop")} value={f.vnd(total.costReloop)} />
        <Stat label={t("EPR obligation avoided (illustrative)", "Nghĩa vụ EPR được tránh (minh họa)")}
          value={total.eprSimVnd === null ? t("Not estimated yet", "Chưa ước tính") : f.vnd(total.eprSimVnd)}
          note={t("Fs rate and recycling rate are still simulated", "đơn giá Fs và tỷ lệ tái chế vẫn là số mô phỏng")} />
        <Stat label={t("CO2 impact", "Tác động CO2")} value={t("Not estimated yet", "Chưa ước tính")}
          note={t("no sourced emission factor yet", "chưa có hệ số phát thải có nguồn")} />
      </section>

      <h2 className="font-semibold mb-2">{t("By month", "Theo tháng")}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th>{t("Month", "Tháng")}</th><th>{t("Orders", "Đơn hàng")}</th><th>{t("Reusable used", "Dùng tái sử dụng")}</th>
            <th>{t("Mailers avoided", "Túi gói hàng được tránh")}</th><th>{t("Boxes avoided", "Hộp được tránh")}</th>
            <th>{t("Plastic avoided (kg)", "Nhựa được tránh (kg)")}</th><th>{t("New reusable plastic (kg)", "Nhựa túi tái sử dụng mới (kg)")}</th>
            <th>{t("Cost, single-use", "Chi phí, dùng một lần")}</th><th>{t("Cost, following ReLoop", "Chi phí, theo ReLoop")}</th>
            <th>{t("EPR (illustrative)", "EPR (minh họa)")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={`border-b ${r.key === "Total" ? "font-semibold" : ""}`}>
                <td>{monthLabel(r.key)}</td><td>{f.n(r.orders)}</td><td>{f.n(r.reusableUses)}</td><td>{f.n(r.mailersAvoided)}</td><td>{f.n(r.boxesAvoided)}</td>
                <td>{f.n(r.plasticAvoidedKg, 2)}</td><td>{f.n(r.plasticUsedKg, 2)}</td>
                <td>{f.vnd(r.costSingle)}</td><td>{f.vnd(r.costReloop)}</td><td>{r.eprSimVnd === null ? "-" : f.vnd(r.eprSimVnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold mt-6 mb-1">{t("How this is calculated", "Cách tính")}</h2>
      <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1">
        <li>{t("Only orders recommended REUSABLE are counted as using a reusable pack; all others stay single-use.",
               "Chỉ các đơn được đề xuất REUSABLE mới được tính là dùng túi tái sử dụng; các đơn còn lại vẫn dùng bao bì dùng một lần.")}</li>
        <li>{t(`Mailer weight ${f.n(MAILER_KG * 1000, 1)} g: K&S listing on Lazada (500 g pack, sizes 25x35 and 28x42). Reusable pack ${REUSABLE_KG * 1000} g: 1 kg / 55 bags (Lazada listing). Box weight has no source yet, so boxes are not weighed.`,
               `Khối lượng túi gói hàng ${f.n(MAILER_KG * 1000, 1)} g: sản phẩm K&S trên Lazada (gói 500 g, cỡ 25x35 và 28x42). Túi tái sử dụng ${REUSABLE_KG * 1000} g: 1 kg / 55 túi (sản phẩm trên Lazada). Khối lượng hộp chưa có nguồn nên chưa được cân.`)}</li>
        <li>{t(`New reusable packs = number of uses / ${cfg.packaging.reuse_cycles.value} cycles + expected packs that do not come back.`,
               `Túi tái sử dụng mới = số lần sử dụng / ${cfg.packaging.reuse_cycles.value} vòng + số túi dự kiến không quay về.`)}</li>
        <li>{t("EPR (Decree 05/2025): weight avoided × mandatory recycling rate × Fs × (1 + 2% admin cost). The rate and Fs here are SIMULATED placeholders, not official figures; replace them with official figures before any filing.",
               "EPR (Nghị định 05/2025): khối lượng được tránh × tỷ lệ tái chế bắt buộc × Fs × (1 + 2% chi phí quản lý). Tỷ lệ và Fs ở đây là số MÔ PHỎNG, không phải số chính thức; cần thay bằng số chính thức trước khi dùng để báo cáo.")}</li>
        <li>{t("All orders are simulated data except data a company uploads itself.", "Toàn bộ đơn hàng là dữ liệu mô phỏng, trừ dữ liệu do doanh nghiệp tự tải lên.")}</li>
      </ul>
    </>
  );
}
