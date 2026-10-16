import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import { loadContext } from "@/lib/context";
import type { Params } from "@/lib/data";
import { simulate } from "@/lib/simulate";
import { methodLabel } from "@/lib/i18n";

export const metadata = { title: "Scenario Simulator" };

export default function Simulator({ searchParams }: { searchParams: Promise<Params> }) {
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
  const { user, method, presetKey, orgs, orgId, scored, qs, hasCustom, t, f } = await loadContext(sp);
  const sim = simulate(scored);
  const basePer1000 = (scored.reduce((a, s) => a + s.r.expCostSingleVnd, 0) / Math.max(1, scored.length)) * 1000;
  const label = (x: number) => (x <= 0 ? `${t("save", "tiết kiệm")} ${f.vnd(-x)}` : `${t("extra", "thêm")} ${f.vnd(x)}`);

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">{t("Scenario Simulator", "Mô phỏng kịch bản")}</h1>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/simulator" />
      <p className="text-sm text-gray-500 my-3">
        {t("Orders are ranked by RVS, then the top X% switch to reusable packaging. Comparison: picking orders at random.",
           "Đơn hàng được xếp theo điểm RVS, sau đó X% đơn cao nhất chuyển sang bao bì tái sử dụng. So sánh: chọn đơn ngẫu nhiên.")}{" "}
        {methodLabel(t, method)}. {t("Baseline cost, all single-use", "Chi phí gốc, toàn bộ dùng một lần")}: {f.vnd(basePer1000)} {t("per 1,000 orders", "trên 1.000 đơn")}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th>{t("Reusable", "Tái sử dụng")}</th><th>{t("Orders switched", "Số đơn chuyển đổi")}</th>
            <th>{t("Cost difference per 1,000 orders (RVS)", "Chênh lệch chi phí trên 1.000 đơn (RVS)")}</th>
            <th>{t("Cost difference per 1,000 orders (random)", "Chênh lệch chi phí trên 1.000 đơn (ngẫu nhiên)")}</th>
            <th>{t("Single-use packs avoided per 1,000", "Bao bì dùng một lần được tránh trên 1.000 đơn")}</th>
            <th>{t("Reusable packs lost per 1,000", "Túi tái sử dụng bị mất trên 1.000 đơn")}</th>
          </tr></thead>
          <tbody>
            {sim.filter((r) => r.sharePct > 0).map((r) => (
              <tr key={r.sharePct} className="border-b">
                <td>{r.sharePct}%</td>
                <td>{f.n(r.switched)}</td>
                <td>{label(r.extraPer1000)}</td>
                <td>{label(r.extraRandomPer1000)}</td>
                <td>{f.n(r.packsAvoidedPer1000)}</td>
                <td>{f.n(r.packsLostPer1000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        {t("CO2 impact is not estimated because there is no sourced emission factor yet. Lost reusable packs also become waste.",
           "Tác động CO2 chưa được ước tính vì chưa có hệ số phát thải có nguồn. Túi tái sử dụng bị mất cũng trở thành rác thải.")}
      </p>
    </>
  );
}
