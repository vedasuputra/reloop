import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import { loadContext } from "@/lib/context";
import { categoryReturnRates, type Params } from "@/lib/data";

const PAGE_SIZE = 50;

export default function Orders({ searchParams }: { searchParams: Promise<Params> }) {
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
  const { user, method, presetKey, orgs, orgId, rows, scored, qs, hasCustom, t, f } = await loadContext(sp);

  const category = sp.category ?? "";
  const rec = sp.rec ?? "";
  const q = (sp.q ?? "").trim().toUpperCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const filtered = scored.filter((s) =>
    (!category || s.row.category === category) &&
    (!rec || s.r.recommendation === rec) &&
    (!q || s.row.order_id.toUpperCase().includes(q) || s.row.customer_id.toUpperCase().includes(q)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const cats = [...new Set(scored.map((s) => s.row.category))].sort();
  const base = qs;
  const catRates = categoryReturnRates(rows);
  const filterQs = `${base}&category=${category}&rec=${rec}&q=${encodeURIComponent(q)}`;

  return (
    <>
      <Nav qs={base} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">{t("Order Analysis", "Phân tích đơn hàng")}</h1>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/orders" hidden={{ category, rec, q }} />

      <form action="/orders" className="flex flex-wrap items-end gap-3 my-4 text-sm">
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="preset" value={presetKey} />
        <input type="hidden" name="org" value={orgId} />
        <label className="flex flex-col">{t("Search order / customer", "Tìm đơn hàng / khách hàng")}
          <input name="q" defaultValue={q} placeholder={t("O000123 or C01235", "O000123 hoặc C01235")} className="rounded border bg-transparent p-1" />
        </label>
        <label className="flex flex-col">{t("Category", "Danh mục")}
          <select name="category" defaultValue={category} className="rounded border bg-transparent p-1">
            <option value="">{t("All", "Tất cả")}</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col">{t("Recommendation", "Đề xuất")}
          <select name="rec" defaultValue={rec} className="rounded border bg-transparent p-1">
            <option value="">{t("All", "Tất cả")}</option>
            <option>REUSABLE</option><option>REVIEW</option><option>SINGLE-USE</option>
          </select>
        </label>
        <button className="rounded border px-3 py-1">{t("Filter", "Lọc")}</button>
      </form>

      <p className="text-sm mb-2">
        <a className="underline" href={`/export${base}&category=${category}&rec=${rec}`}>
          {t(`Download CSV for the packing team (${f.n(filtered.length)} orders matching the filter)`,
             `Tải CSV cho đội đóng gói (${f.n(filtered.length)} đơn theo bộ lọc)`)}
        </a>
      </p>
      <p className="text-sm text-gray-500 mb-2">
        {t(`${f.n(filtered.length)} orders, page ${page} of ${pages}`, `${f.n(filtered.length)} đơn, trang ${page}/${pages}`)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th>{t("Order", "Đơn")}</th><th>{t("Date", "Ngày")}</th><th>{t("Category", "Danh mục")}</th><th>{t("Value", "Giá trị")}</th>
            <th>{t("Payment", "Thanh toán")}</th><th>{t("Customer history", "Lịch sử khách hàng")}</th>
            <th>{t("Category returns (history)", "Tỷ lệ hoàn của danh mục (lịch sử)")}</th><th>{t("Destination", "Nơi nhận")}</th>
            <th>{t("Return probability", "Xác suất hoàn")}</th><th>RVS</th><th>{t("Recommendation", "Đề xuất")}</th>
          </tr></thead>
          <tbody>
            {shown.map((s) => {
              const h = catRates.get(s.row.category);
              return (
                <tr key={s.row.id} className="border-b">
                  <td><Link className="underline" href={`/recommendation${base}&order=${s.row.order_id}`}>{s.row.order_id}</Link></td>
                  <td>{s.row.order_date}</td>
                  <td>{s.row.category}{s.order.multi_size ? t(" (multi-size)", " (nhiều cỡ)") : ""}</td>
                  <td>{f.vnd(Number(s.row.order_value_vnd))}</td>
                  <td>{s.row.payment_method}</td>
                  <td>{t(`${s.order.past_delivered_in_data} orders, returns`, `${s.order.past_delivered_in_data} đơn, hoàn`)}{" "}
                    {s.order.customer_return_rate_in_data === null ? "-" : f.pct(s.order.customer_return_rate_in_data)}</td>
                  <td>{h ? `${f.pct(h.rate)} ${t("of", "trên")} ${f.n(h.n)}` : "-"}</td>
                  <td>{s.row.address}, {s.order.estimated_delivery_distance_km} km</td>
                  <td><Link className="underline" href={`/prediction${base}&order=${s.row.order_id}`}>{f.pct(s.r.predReturnProb)}</Link></td>
                  <td>{f.n(s.r.rvs, 1)}</td>
                  <td>{s.r.recommendation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 mt-3 text-sm">
        {page > 1 && <Link className="underline" href={`/orders${filterQs}&page=${page - 1}`}>{t("Previous", "Trước")}</Link>}
        {page < pages && <Link className="underline" href={`/orders${filterQs}&page=${page + 1}`}>{t("Next", "Sau")}</Link>}
      </div>
    </>
  );
}
