import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import Section from "@/components/Section";
import Stat from "@/components/Stat";
import { CheckRow } from "@/components/FormControls";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, DownloadIcon, LINK, Notice, PageTitle, TABLE_BOX, TH, TR, Tag, rise } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getOrgs } from "@/lib/context";
import { getT } from "@/lib/i18n";
import { uploadCsv, clearOrders } from "./actions";

type SP = { org?: string; ok?: string; error?: string };

export const metadata = { title: "Upload data" };

const CATEGORIES = ["Accessories", "Activewear", "Dress", "Jeans", "Outerwear", "Shirt", "T-shirt", "Trousers"];

export default function Upload({ searchParams }: { searchParams: Promise<SP> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
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
  const qs = org ? `?org=${org.id}` : "";

  // [column, required, what it is, example]
  const columns: [string, boolean, string, string][] = [
    ["order_id", true, t("Order number", "Mã đơn hàng"), "O000123"],
    ["customer_id", true, t("Pseudonymous customer code: no name, phone or email", "Mã khách hàng ẩn danh: không có tên, số điện thoại hay email"), "C01235"],
    ["category", true, t("Product category (see the list below)", "Danh mục sản phẩm (xem danh sách bên dưới)"), "Dress"],
    ["quantity_of_item", true, t("Number of items in the order", "Số sản phẩm trong đơn hàng"), "2"],
    ["order_value_vnd", true, t("Order value in VND", "Giá trị đơn hàng (VND)"), "595000"],
    ["payment_method", true, t("COD for cash on delivery; otherwise Bank transfer, E-wallet or Credit/debit card", "COD cho thanh toán khi nhận hàng; ngoài ra Bank transfer, E-wallet hoặc Credit/debit card"), "COD"],
    ["estimated_delivery_distance_km", true, t("Distance from the warehouse to the customer, in km", "Khoảng cách từ kho đến khách hàng, tính bằng km"), "12"],
    ["address", false, t("City or province only, not a street address", "Chỉ tỉnh/thành phố, không có địa chỉ cụ thể"), "Hanoi"],
    ["order_date", false, t("YYYY-MM-DD. Used for the monthly report and the time-based train/test split", "YYYY-MM-DD. Dùng cho báo cáo theo tháng và chia dữ liệu huấn luyện/kiểm tra theo thời gian"), "2024-03-18"],
    ["multi_size", false, t("1 if the same item was bought in more than one size, otherwise 0", "1 nếu mua cùng một sản phẩm với nhiều cỡ, ngược lại 0"), "1"],
    ["voucher_used", false, t("1 if a voucher was used, otherwise 0", "1 nếu có dùng voucher, ngược lại 0"), "0"],
    ["order_status", false, t("Delivered by default; Cancelled orders are not scored", "Mặc định là Delivered; đơn Cancelled không được chấm điểm"), "Delivered"],
    ["past_delivered_in_data", false, t("Earlier delivered orders of this customer", "Số đơn đã giao trước đây của khách"), "3"],
    ["customer_return_rate_in_data", false, t("Share of those earlier orders that were returned, 0 to 1. Empty for a new customer", "Tỷ lệ các đơn trước đó bị hoàn, từ 0 đến 1. Để trống nếu là khách mới"), "0.33"],
    ["was_returned", false, t("1 if this order was returned, 0 if kept. Needed to retrain the AI model", "1 nếu đơn này bị hoàn, 0 nếu giữ lại. Cần để huấn luyện lại mô hình AI"), "0"],
  ];

  const checklist = [
    t("Permissioned data only: agree with the brand what ReLoop may use, how long it is kept and who can see it.", "Chỉ dùng dữ liệu được cho phép: thống nhất với thương hiệu ReLoop được dùng gì, lưu bao lâu và ai được xem."),
    t("Map your system's order, return, packaging and warehouse fields to the columns above.", "Ánh xạ các trường đơn hàng, hoàn hàng, bao bì và kho trong hệ thống của bạn sang các cột ở trên."),
    t("Export pseudonymised data: customer codes hashed, no names, phone numbers, emails or street addresses.", "Xuất dữ liệu đã ẩn danh hóa: mã khách hàng được băm, không có tên, số điện thoại, email hay địa chỉ cụ thể."),
  ];

  return (
    <AppShell qs={qs} email={user?.email}>
      <PageTitle title={t("Upload data (CSV)", "Tải dữ liệu lên (CSV)")}
        sub={t("Add your own orders to a data set. Every screen then scores them with the same engine; no integration is needed to start.",
          "Thêm đơn hàng của bạn vào một bộ dữ liệu. Mọi màn hình sẽ chấm điểm chúng bằng cùng một công cụ; không cần tích hợp để bắt đầu.")}
        actions={<a href="/template_orders.csv" download className={BTN_OUTLINE}><DownloadIcon />{t("CSV template", "Mẫu CSV")}</a>} />

      {sp.ok && <Notice tone="ok" role="status" className="rl-rise mt-6">{sp.ok}</Notice>}
      {sp.error && <Notice tone="warn" role="alert" title={t("Upload failed", "Tải lên không thành công")} className="rl-rise mt-6">{sp.error}</Notice>}

      {!org ? (
        <Notice tone="info" className="rl-rise mt-6">{t("This account has no data set of its own to upload to yet.", "Tài khoản này chưa có bộ dữ liệu riêng để tải lên.")}</Notice>
      ) : (
        <>
          <div className="rl-rise mt-6" style={rise(1)}>
            <div className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-3">
              <Stat layout="cell" variant="green" label={t("Target data set", "Bộ dữ liệu đích")} value={org.name} size="sm"
                note={t("Demo data will not change.", "Dữ liệu demo sẽ không thay đổi.")} />
              <Stat layout="cell" label={t("Orders in it now", "Số đơn hiện có")} value={f.n(count ?? 0)} />
              <Stat layout="cell" label={t("Per upload", "Mỗi lần tải lên")} value={t("up to 5,000", "tối đa 5.000")} size="sm" note={t("orders", "đơn")} />
            </div>
          </div>

          <Notice tone="warn" title={t("Prototype: no personal data", "Bản mẫu: không dữ liệu cá nhân")} className="rl-rise mt-5">
            {t("Upload simulated or anonymised data only: no customer names, phone numbers, emails or street addresses.",
              "Chỉ tải lên dữ liệu mô phỏng hoặc đã ẩn danh: không có tên, số điện thoại, email hay địa chỉ cụ thể của khách hàng.")}{" "}
            <Link className={LINK} href="/privacy">{t("Data & Privacy", "Dữ liệu & Quyền riêng tư")}</Link>
          </Notice>

          <Section title={t("Choose a file", "Chọn tệp")} i={2}>
            <form action={uploadCsv} className={`${CARD} space-y-4`}>
              <input type="hidden" name="org" value={org.id} />
              <input type="file" name="file" accept=".csv,text/csv" required
                className="block w-full cursor-pointer rounded-[9px] border border-dashed border-[#174538]/40 bg-[#FFFEF6] p-4 text-sm text-[#355E3B] transition-colors hover:border-[#174538] file:mr-4 file:cursor-pointer file:rounded-[9px] file:border-0 file:bg-[#174538] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#FFFEF6]" />
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[16rem]">
                  <CheckRow name="replace" value="on" defaultChecked>{t("Replace existing orders", "Thay thế các đơn hiện có")}</CheckRow>
                </div>
                <button className={BTN_PRIMARY}>{t("Upload", "Tải lên")}</button>
                <Link href={`/dashboard?org=${org.id}`} className={`${BTN_OUTLINE} sm:ml-auto`}>{t("See Results", "Xem kết quả")}</Link>
              </div>
            </form>
          </Section>

          <Section title={t("File format", "Định dạng tệp")}
            sub={t("One row per order. At most 5,000 orders per upload.", "Mỗi dòng một đơn hàng. Tối đa 5.000 đơn mỗi lần tải lên.")} i={3}>
            <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
              <div className={TABLE_BOX}>
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-[#174538]/15">
                      <th className={TH}>{t("Column", "Cột")}</th><th className={TH}>{t("Required?", "Bắt buộc?")}</th><th className={TH}>{t("What it is", "Nội dung")}</th><th className={TH}>{t("Example", "Ví dụ")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map(([name, required, what, example]) => (
                      <tr key={name} className={`${TR} align-top`}>
                        <td className="whitespace-nowrap px-4 py-3"><span className="text-[13px] font-semibold">{name}</span></td>
                        <td className="px-4 py-3"><Tag tone={required ? "ok" : "plain"}>{required ? t("Required", "Bắt buộc") : t("Optional", "Tùy chọn")}</Tag></td>
                        <td className="px-4 py-3 text-xs leading-relaxed text-[#355E3B]">{what}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px]">{example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-5">
                <div className={CARD}>
                  <h3 className="font-semibold">{t("Categories the model knows", "Các danh mục mô hình nhận biết")}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => <Tag key={c}>{c}</Tag>)}
                  </div>
                </div>
                <div className={CARD}>
                  <h3 className="font-semibold">{t("Try the AI model page", "Thử trang Mô hình AI")}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">
                    {t("To retrain the model, upload orders that have a was_returned column. A ready example has 1,000 simulated orders.",
                      "Để huấn luyện lại mô hình, hãy tải lên đơn hàng có cột was_returned. Có sẵn một tệp mẫu gồm 1.000 đơn mô phỏng.")}
                  </p>
                  <a href="/contoh_latih_ulang.csv" download className={`${BTN_OUTLINE} mt-4`}><DownloadIcon />contoh_latih_ulang.csv</a>
                </div>
              </div>
            </div>
          </Section>

          <Section title={t("Before your first real upload", "Trước lần tải lên thật đầu tiên")}
            sub={t("From the pilot plan, months 1 to 2: discover and govern.", "Theo kế hoạch thí điểm, tháng 1 đến 2: khảo sát và quản trị.")} i={4}>
            <div className={CARD}>
              <ul className="space-y-3 text-sm leading-relaxed">
                {checklist.map((c) => (
                  <li key={c} className="flex gap-3">
                    <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2a7e67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M3.5 9.5 7 13l7.5-8" /></svg>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section title={t("Delete data", "Xóa dữ liệu")} i={5}>
            <details className={`${CARD} group`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {t(`Delete all orders in ${org.name}`, `Xóa toàn bộ đơn trong ${org.name}`)}
                <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform group-open:rotate-180"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
              </summary>
              <div className="mt-4 border-t border-[#174538]/10 pt-4">
                <p className="text-sm leading-relaxed text-[#355E3B]">
                  {t(`This removes all ${f.n(count ?? 0)} orders from this data set at once. The demo data and your cost settings are not touched. This cannot be undone.`,
                    `Thao tác này xóa cùng lúc toàn bộ ${f.n(count ?? 0)} đơn khỏi bộ dữ liệu này. Dữ liệu demo và cài đặt chi phí của bạn không bị ảnh hưởng. Không thể hoàn tác.`)}
                </p>
                <form action={clearOrders} className="mt-4">
                  <input type="hidden" name="org" value={org.id} />
                  <button className="inline-flex h-10 cursor-pointer items-center rounded-[9px] border border-[#174538]/40 bg-[#FFFDD0] px-5 text-sm font-semibold transition-opacity hover:opacity-85">
                    {t("Yes, delete all orders", "Đúng, xóa toàn bộ đơn")}
                  </button>
                </form>
              </div>
            </details>
          </Section>
        </>
      )}
    </AppShell>
  );
}
