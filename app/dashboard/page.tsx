import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import Stat from "@/components/Stat";
import { loadContext } from "@/lib/context";
import { categoryReturnRates, type Params } from "@/lib/data";
import { methodLabel } from "@/lib/i18n";
import { TARGETS } from "@/lib/targets";

export default function Dashboard({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<p>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, orgs, orgId, rows, scored, qs, hasCustom, model, modelLabel, t, f } = await loadContext(sp);

  const count = (rec: string) => scored.filter((s) => s.r.recommendation === rec).length;
  const reusable = scored.filter((s) => s.r.recommendation === "REUSABLE");
  const base = scored.reduce((a, s) => a + s.r.expCostSingleVnd, 0);
  const withReloop = scored.reduce(
    (a, s) => a + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);
  const lost = reusable.reduce((a, s) => a + s.lostProb, 0);

  // Progress against the pilot targets (baseline = all single-use)
  const n = Math.max(1, scored.length);
  const packsPer1000 = (reusable.length / n) * 1000;
  const netPacksPer1000 = ((reusable.length - lost) / n) * 1000;
  const saving = base > 0 ? (base - withReloop) / base : 0;
  const auc: number | undefined = (model as any).metrics?.auc_model;
  const selfReturn: number = cfg.generator.dropoff_recovery_target.value;
  const targets = [
    { name: t("Single-use packs avoided per 1,000 orders", "Bao bì dùng một lần được tránh trên 1.000 đơn"),
      now: f.n(packsPer1000), note: t(`net of lost bags: ${f.n(netPacksPer1000)}`, `sau khi trừ túi bị mất: ${f.n(netPacksPer1000)}`),
      target: `≥ ${f.n(TARGETS.packsAvoidedPer1000)}`, ok: packsPer1000 >= TARGETS.packsAvoidedPer1000 },
    { name: t("Packaging cost saving vs all single-use", "Tiết kiệm chi phí bao bì so với toàn bộ dùng một lần"),
      now: f.pct(saving), note: f.vnd(base - withReloop), target: `≥ ${f.pct(TARGETS.costSaving)}`, ok: saving >= TARGETS.costSaving },
    { name: t("Return-prediction accuracy (AUC)", "Độ chính xác dự đoán hoàn hàng (AUC)"),
      now: auc === undefined ? "-" : f.n(auc, 2), note: t("on newer orders not used for training", "trên các đơn mới hơn, không dùng để huấn luyện"),
      target: `≥ ${f.n(TARGETS.auc, 2)}`, ok: auc !== undefined && auc >= TARGETS.auc },
    { name: t("Packs returned without a courier", "Bao bì được gửi trả không cần shipper"),
      now: f.pct(selfReturn), note: t("assumption in settings; measured in the pilot", "giả định trong cài đặt; sẽ đo trong thí điểm"),
      target: `≥ ${f.pct(TARGETS.selfReturn)}`, ok: selfReturn >= TARGETS.selfReturn },
  ];

  const cats = [...new Set(scored.map((s) => s.row.category))].sort();
  const catRates = categoryReturnRates(rows);

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">{t("Dashboard", "Tổng quan")}</h1>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/dashboard" />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        <Stat label={t("Orders scored", "Đơn hàng được chấm điểm")} value={f.n(scored.length)}
          note={t(`${f.n(rows.length)} orders, excluding Cancelled`, `${f.n(rows.length)} đơn, không tính đơn đã hủy`)} />
        <Stat label="REUSABLE" value={f.n(count("REUSABLE"))} />
        <Stat label="REVIEW" value={f.n(count("REVIEW"))} />
        <Stat label="SINGLE-USE" value={f.n(count("SINGLE-USE"))} />
        <Stat label={t("Packaging cost, all single-use", "Chi phí bao bì, toàn bộ dùng một lần")} value={f.vnd(base)} />
        <Stat label={t("Packaging cost, following ReLoop", "Chi phí bao bì, theo đề xuất ReLoop")} value={f.vnd(withReloop)} />
        <Stat label={t("Difference", "Chênh lệch")} value={f.vnd(base - withReloop)}
          note={base - withReloop >= 0 ? t("saved", "tiết kiệm") : t("more expensive", "đắt hơn")} />
        <Stat label={t("Single-use packs avoided", "Bao bì dùng một lần được tránh")} value={f.n(reusable.length)}
          note={t(`about ${Math.round(lost)} reusable packs lost`, `ước tính mất ${Math.round(lost)} túi tái sử dụng`)} />
        <Stat label={t("CO2 impact", "Tác động CO2")} value={t("Not estimated yet", "Chưa ước tính")}
          note={t("no sourced emission factor yet", "chưa có hệ số phát thải có nguồn")} />
      </section>

      <h2 className="font-semibold mb-1">{t("Pilot targets (month 12)", "Mục tiêu thí điểm (tháng 12)")}</h2>
      <p className="text-xs text-gray-500 mb-2">
        {t("Baseline: every order in single-use packaging. Current values use the data and settings selected above.",
           "Mốc gốc: mọi đơn đều dùng bao bì dùng một lần. Giá trị hiện tại dùng dữ liệu và cài đặt đang chọn ở trên.")}
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th>{t("Metric", "Chỉ số")}</th><th>{t("Now", "Hiện tại")}</th><th>{t("Target", "Mục tiêu")}</th><th>{t("Status", "Trạng thái")}</th>
          </tr></thead>
          <tbody>
            {targets.map((x) => (
              <tr key={x.name} className="border-b">
                <td>{x.name}<br /><span className="text-xs text-gray-500">{x.note}</span></td>
                <td className="font-semibold">{x.now}</td><td>{x.target}</td>
                <td>{x.ok ? t("✅ met", "✅ đạt") : t("⏳ not yet", "⏳ chưa đạt")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 mb-2">
        {t("Return prediction uses the", "Dự đoán hoàn hàng dùng")} {modelLabel}. {t("Settings", "Cài đặt")}: {methodLabel(t, method)},{" "}
        {t("single-use packaging", "bao bì dùng một lần")} {f.vnd(cfg.packaging.single_use_mailer_vnd.value)} ({t("mailer", "túi gói hàng")}){" "}
        {t("and", "và")} {f.vnd(cfg.packaging.single_use_box_vnd.value)} ({t("box, outerwear", "hộp, áo khoác")}).
      </p>

      <p className="text-sm flex flex-wrap gap-4">
        <a className="underline" href={`/export${qs}&rec=REUSABLE`}>{t("Download REUSABLE list (CSV)", "Tải danh sách REUSABLE (CSV)")}</a>
        <a className="underline" href={`/export${qs}`}>{t("Download all recommendations (CSV)", "Tải toàn bộ đề xuất (CSV)")}</a>
      </p>

      <h2 className="font-semibold mt-6 mb-2">{t("By category", "Theo danh mục")}</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b">
          <th>{t("Category", "Danh mục")}</th><th>{t("Orders", "Đơn hàng")}</th>
          <th>{t("Actual returns (history)", "Tỷ lệ hoàn thực tế (lịch sử)")}</th>
          <th>{t("Average return probability (predicted)", "Xác suất hoàn trung bình (dự đoán)")}</th><th>REUSABLE</th>
        </tr></thead>
        <tbody>
          {cats.map((c) => {
            const list = scored.filter((s) => s.row.category === c);
            const avg = list.reduce((a, s) => a + s.r.predReturnProb, 0) / list.length;
            const h = catRates.get(c);
            return (
              <tr key={c} className="border-b">
                <td>{c}</td><td>{f.n(list.length)}</td>
                <td>{h ? `${f.pct(h.rate)} (${f.n(h.n)} ${t("delivered", "đã giao")})` : "-"}</td>
                <td>{f.pct(avg)}</td>
                <td>{f.n(list.filter((s) => s.r.recommendation === "REUSABLE").length)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
