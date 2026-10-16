import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { getOrgs } from "@/lib/context";
import { getT } from "@/lib/i18n";
import { uploadCsv, clearOrders } from "./actions";

type SP = { org?: string; ok?: string; error?: string };

export default function Upload({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const { t, f } = await getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const own = (await getOrgs()).filter((o) => o.role === "owner" || o.role === "editor");
  const org = own.find((o) => o.id === sp.org) ?? own[0];
  const { count } = org
    ? await supabase.from("orders").select("*", { count: "exact", head: true }).eq("org_id", org.id)
    : { count: 0 };

  return (
    <>
      <Nav qs={org ? `?org=${org.id}` : ""} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">{t("Upload CSV", "Tải lên CSV")}</h1>
      {sp.ok && <p className="text-green-500 text-sm mb-3">{sp.ok}</p>}
      {sp.error && <p className="text-red-500 text-sm mb-3">{sp.error}</p>}

      {!org ? (
        <p>{t("This account has no data set of its own to upload to yet.", "Tài khoản này chưa có bộ dữ liệu riêng để tải lên.")}</p>
      ) : (
        <>
          <p className="text-sm mb-4">
            {t("Target data set", "Bộ dữ liệu đích")}: <b>{org.name}</b>, {t(`currently ${f.n(count ?? 0)} orders. Demo data will not change.`, `hiện có ${f.n(count ?? 0)} đơn. Dữ liệu demo sẽ không thay đổi.`)}
          </p>
          <form action={uploadCsv} className="space-y-3 rounded border p-4 text-sm">
            <input type="hidden" name="org" value={org.id} />
            <input type="file" name="file" accept=".csv,text/csv" required />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="replace" defaultChecked /> {t("Replace existing orders", "Thay thế các đơn hiện có")}
            </label>
            <button className="rounded border px-3 py-1">{t("Upload", "Tải lên")}</button>
          </form>

          <h2 className="font-semibold mt-6 mb-2">{t("File format", "Định dạng tệp")}</h2>
          <p className="text-sm">
            {t("Download the", "Tải")} <a className="underline" href="/template_orders.csv">{t("CSV template", "mẫu CSV")}</a>
            {t(", fill it with order data, then upload it. To try the AI Model page, use", ", điền dữ liệu đơn hàng rồi tải lên. Để thử trang Mô hình AI, hãy dùng")}{" "}
            <a className="underline" href="/contoh_latih_ulang.csv" download>contoh_latih_ulang.csv</a>{" "}
            {t("(1,000 orders with a was_returned column). At most 5,000 orders per upload.", "(1.000 đơn có cột was_returned). Tối đa 5.000 đơn mỗi lần tải lên.")}
          </p>
          <ul className="text-sm list-disc pl-5 mt-2">
            <li>{t("Required", "Bắt buộc")}: order_id, customer_id, category, quantity_of_item, order_value_vnd, payment_method, estimated_delivery_distance_km</li>
            <li>{t("Optional", "Tùy chọn")}: address, order_date (YYYY-MM-DD), multi_size (1/0), voucher_used (1/0), order_status ({t("default", "mặc định")} Delivered),
              past_delivered_in_data, customer_return_rate_in_data (0-1), was_returned (1/0)</li>
            <li>{t("payment_method: write COD for cash on delivery. Categories the model knows: Accessories, Activewear, Dress, Jeans, Outerwear, Shirt, T-shirt, Trousers.",
                   "payment_method: ghi COD cho thanh toán khi nhận hàng. Các danh mục mô hình nhận biết: Accessories, Activewear, Dress, Jeans, Outerwear, Shirt, T-shirt, Trousers.")}</li>
          </ul>

          <form action={clearOrders} className="mt-6">
            <input type="hidden" name="org" value={org.id} />
            <button className="text-sm underline text-red-500">{t(`Delete all orders in ${org.name}`, `Xóa toàn bộ đơn trong ${org.name}`)}</button>
          </form>
          <p className="mt-6 text-sm"><Link className="underline" href={`/?org=${org.id}`}>{t("See the results on the Dashboard", "Xem kết quả ở trang Tổng quan")}</Link></p>
        </>
      )}
    </>
  );
}
