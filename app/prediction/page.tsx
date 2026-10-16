import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import OrderPicker from "@/components/OrderPicker";
import { loadContext } from "@/lib/context";
import type { Params } from "@/lib/data";

export const metadata = { title: "AI Prediction" };

export default function Prediction({ searchParams }: { searchParams: Promise<Params> }) {
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
  const { user, method, presetKey, orgId, scored, qs, model, modelLabel, t, f } = await loadContext(sp);

  const wanted = (sp.order ?? "").trim().toUpperCase();
  const s = scored.find((x) => x.row.order_id.toUpperCase() === wanted)
    ?? scored.find((x) => x.row.order_status === "Delivered") ?? scored[0];
  if (!s) return <><Nav qs={qs} email={user?.email} /><p>{t("No orders yet.", "Chưa có đơn hàng.")}</p></>;

  // Baseline: actual return rate of this category (delivered orders only)
  const delivered = scored.filter((x) => x.row.order_status === "Delivered" && x.row.was_returned !== null);
  const sameCat = delivered.filter((x) => x.row.category === s.row.category);
  const baseline = sameCat.reduce((a, x) => a + Number(x.row.was_returned), 0) / Math.max(1, sameCat.length);

  // Why: contribution of each factor to the model's log-odds
  const c = model.coefficients;
  const o = s.order;
  const factors: [string, number][] = [
    [t("Bought more than one size", "Mua nhiều hơn một cỡ"), c.multi_size * o.multi_size],
    [t("Cash on delivery (COD)", "Thanh toán khi nhận hàng (COD)"), c.cod * (o.payment_method === "COD" ? 1 : 0)],
    [t("Used a voucher", "Dùng voucher"), c.voucher_used * o.voucher_used],
    [t("2 or more items", "Từ 2 sản phẩm trở lên"), c.qty_2plus * (o.quantity_of_item >= 2 ? 1 : 0)],
    [t("Has ordered before", "Đã từng đặt hàng"), c.has_history * (o.past_delivered_in_data > 0 ? 1 : 0)],
    [t("Customer's past return rate", "Tỷ lệ hoàn trước đây của khách"), c.cust_rr * (o.customer_return_rate_in_data ?? 0)],
    [t(`Category ${o.category}`, `Danh mục ${o.category}`), c["cat_" + o.category] ?? 0],
  ];
  const auc = (model as any).metrics?.auc_model;
  const aucBase = (model as any).metrics?.auc_baseline_category_mean;

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold">{t("AI Prediction", "Dự đoán AI")}</h1>
      <OrderPicker action="/prediction" orderId={s.row.order_id} method={method} presetKey={presetKey} orgId={orgId} />

      <section className="rounded border p-4 space-y-1">
        <p className="text-sm text-gray-500">
          {t("Order", "Đơn")} {s.row.order_id}, {s.row.category}, {f.vnd(Number(s.row.order_value_vnd))}, {s.row.payment_method}, {t("customer", "khách hàng")} {s.row.customer_id}
        </p>
        <p className="text-3xl font-bold">{t("Return probability", "Xác suất hoàn hàng")}: {f.pct(s.r.predReturnProb)}</p>
        <p className="text-sm">{t(`Baseline (average returns in ${s.row.category})`, `Mốc so sánh (tỷ lệ hoàn trung bình của ${s.row.category})`)}: {f.pct(baseline)}</p>
        {s.row.order_status === "Delivered" && s.row.was_returned !== null && (
          <p className="text-sm text-gray-500">
            {t("Outcome in the data", "Kết quả trong dữ liệu")}: {Number(s.row.was_returned) === 1 ? t("returned", "đã hoàn") : t("not returned", "không hoàn")}
          </p>
        )}
      </section>

      <h2 className="font-semibold mt-6 mb-2">{t("Factors that raise or lower the return probability", "Các yếu tố làm tăng hoặc giảm xác suất hoàn hàng")}</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th>{t("Factor", "Yếu tố")}</th><th>{t("Effect (log-odds)", "Ảnh hưởng (log-odds)")}</th></tr></thead>
        <tbody>
          {factors.map(([name, val]) => (
            <tr key={name} className="border-b">
              <td>{name}</td><td>{val === 0 ? t("not applicable", "không áp dụng") : (val > 0 ? "+" : "") + f.n(val, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mt-4">
        {t("Model used", "Mô hình đang dùng")}: {modelLabel}. AUC {auc ?? "-"} {t("vs category baseline", "so với mốc theo danh mục")} {aucBase ?? "-"}.
        {(model as any).trained_at
          ? t(" Measured on the newest 25% of this data set's orders, which were not used for training.",
              " Được đo trên 25% đơn hàng mới nhất của bộ dữ liệu này, không dùng khi huấn luyện.")
          : t(" This shows the pipeline works, not real-world accuracy. Brands can retrain it on their own data on the AI Model page.",
              " Điều này cho thấy quy trình hoạt động, chưa phải độ chính xác thực tế. Thương hiệu có thể huấn luyện lại bằng dữ liệu riêng tại trang Mô hình AI.")}
      </p>
      <p className="mt-4 text-sm">
        <Link className="underline" href={`/recommendation${qs}&order=${s.row.order_id}`}>
          {t("See the packaging recommendation for this order", "Xem đề xuất bao bì cho đơn này")}
        </Link>
      </p>
    </>
  );
}
