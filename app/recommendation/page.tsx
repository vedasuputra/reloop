import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import OrderPicker from "@/components/OrderPicker";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import { loadContext } from "@/lib/context";
import { settingsFromConfig, type Params } from "@/lib/data";
import { scoreOrder, type CollectionMethod } from "@/lib/rvs";
import { methodLabel, reasonText } from "@/lib/i18n";

export default function Recommendation({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, orgs, orgId, scored, qs, hasCustom, model, modelLabel, t, f } = await loadContext(sp);

  const wanted = (sp.order ?? "").trim().toUpperCase();
  const s = scored.find((x) => x.row.order_id.toUpperCase() === wanted)
    ?? scored.find((x) => x.row.order_status === "Delivered") ?? scored[0];
  if (!s) return <><Nav qs={qs} email={user?.email} /><p>{t("No orders yet.", "Chưa có đơn hàng.")}</p></>;

  const w = settingsFromConfig(cfg).weights;
  const r = s.r;
  const other: CollectionMethod = method === "dropoff" ? "courier_pickup" : "dropoff";
  const r2 = scoreOrder(cfg, model, s.order, other);

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">{t("Packaging Recommendation", "Đề xuất bao bì")}</h1>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/recommendation" hidden={{ order: s.row.order_id }} />
      <OrderPicker action="/recommendation" orderId={s.row.order_id} method={method} presetKey={presetKey} orgId={orgId} />

      <section className="rounded border p-4 space-y-1">
        <p className="text-sm text-gray-500">{t("Order", "Đơn")} {s.row.order_id}, {s.row.category}, {methodLabel(t, method)}</p>
        <p className="text-3xl font-bold">{r.recommendation}</p>
        <p>RVS: {f.n(r.rvs, 1)} / 100 (REUSABLE ≥ 70, REVIEW 40-69, SINGLE-USE &lt; 40)</p>
        <p className="text-sm">{t("Why", "Lý do")}: {reasonText(t, f, r, method)}</p>
        <p className="text-xs text-gray-500">{t("Return prediction uses the", "Dự đoán hoàn hàng dùng")} {modelLabel}.</p>
      </section>

      <ScoreBreakdown r={r} w={w} cycles={cfg.packaging.reuse_cycles.value} method={method} />

      <p className="text-sm mt-6">
        {other === "dropoff"
          ? t("For comparison, if customers return the pack without a courier", "Để so sánh, nếu khách tự gửi trả bao bì không cần shipper")
          : t("For comparison, if a courier picks up the pack", "Để so sánh, nếu shipper đến lấy bao bì")}: RVS {f.n(r2.rvs, 1)}, <b>{r2.recommendation}</b>.
      </p>
      <p className="mt-4 text-sm">
        <Link className="underline" href={`/prediction${qs}&order=${s.row.order_id}`}>{t("See the AI prediction for this order", "Xem dự đoán AI cho đơn này")}</Link>
      </p>
    </>
  );
}
