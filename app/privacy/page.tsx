import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import LangSwitch from "@/components/LangSwitch";
import { getT } from "@/lib/i18n";

/**
 * Data & Privacy (public page). What the prototype stores, where, and what goes to the AI.
 * TEAM: confirm the two regions below in Supabase (Project Settings) and Vercel (Settings → Functions).
 */
const DB_REGION = "Supabase, Southeast Asia (Singapore)";      // TODO confirm
const APP_REGION = "Vercel, Singapore (sin1)";                  // TODO confirm

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>…</p>}><Content /></Suspense>
    </main>
  );
}

async function Content() {
  await connection();
  const { lang, t } = await getT();
  const fields: [string, string, string][] = [
    ["order_id", t("Order number", "Mã đơn hàng"), t("To show and export the recommendation per order", "Để hiển thị và xuất đề xuất theo từng đơn")],
    ["customer_id", t("Pseudonymous customer code (no name, phone or email)", "Mã khách hàng ẩn danh (không có tên, số điện thoại hay email)"), t("To compute the customer's own return history", "Để tính lịch sử hoàn hàng của chính khách đó")],
    ["address", t("City or province only, not a street address", "Chỉ tỉnh/thành phố, không có địa chỉ cụ thể"), t("Display only", "Chỉ để hiển thị")],
    ["order_date", t("Date", "Ngày"), t("Time-based train/test split, monthly report", "Chia dữ liệu huấn luyện/kiểm tra theo thời gian, báo cáo theo tháng")],
    ["category, quantity, order value, multi_size, voucher, payment method", t("Order details", "Chi tiết đơn hàng"), t("Inputs of the return model", "Đầu vào của mô hình dự đoán hoàn hàng")],
    ["estimated_delivery_distance_km", t("Distance", "Khoảng cách"), t("Courier route and tariff", "Tuyến và cước giao hàng")],
    ["past_delivered_in_data, customer_return_rate_in_data, was_returned", t("Order history and outcome", "Lịch sử và kết quả đơn hàng"), t("Model input and training label", "Đầu vào và nhãn huấn luyện của mô hình")],
  ];
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="font-bold text-lg">ReLoop AI</Link>
        <LangSwitch lang={lang} />
      </div>
      <h1 className="text-2xl font-bold mb-2">{t("Data & Privacy", "Dữ liệu & Quyền riêng tư")}</h1>
      <p className="text-sm mb-4">
        {t("This is a competition prototype. All demo orders are simulated: there is no real customer data in it. Please do not upload real personal data. Below is what the prototype stores, where, and what a real pilot would add.",
           "Đây là bản mẫu dự thi. Toàn bộ đơn hàng demo là dữ liệu mô phỏng, không có dữ liệu khách hàng thật. Vui lòng không tải lên dữ liệu cá nhân thật. Dưới đây là những gì bản mẫu lưu trữ, lưu ở đâu, và những gì một chương trình thí điểm thật sẽ bổ sung.")}
      </p>

      <h2 className="font-semibold mt-6 mb-2">{t("1. What we store, and why", "1. Chúng tôi lưu gì và vì sao")}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th>{t("Field", "Trường")}</th><th>{t("What it is", "Nội dung")}</th><th>{t("Why it is needed", "Lý do cần")}</th></tr></thead>
          <tbody>{fields.map(([k, a, b]) => <tr key={k} className="border-b"><td><code>{k}</code></td><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {t("Not collected at all: customer names, phone numbers, emails, street addresses, payment details. The model does not need them.",
           "Hoàn toàn không thu thập: tên, số điện thoại, email, địa chỉ cụ thể của khách, thông tin thanh toán. Mô hình không cần đến chúng.")}
      </p>

      <h2 className="font-semibold mt-6 mb-2">{t("2. Where it is stored", "2. Lưu ở đâu")}</h2>
      <ul className="text-sm list-disc pl-5 space-y-1">
        <li>{t("Database", "Cơ sở dữ liệu")}: {DB_REGION}. {t("Encrypted in transit (HTTPS) and at rest by the provider.", "Được mã hóa khi truyền (HTTPS) và khi lưu trữ bởi nhà cung cấp.")}</li>
        <li>{t("App server", "Máy chủ ứng dụng")}: {APP_REGION}.</li>
        <li>{t("Each company only sees its own data: row-level security in the database checks membership on every query. The demo data set is read-only.",
               "Mỗi doanh nghiệp chỉ thấy dữ liệu của mình: bảo mật cấp dòng trong cơ sở dữ liệu kiểm tra quyền thành viên ở mọi truy vấn. Bộ dữ liệu demo chỉ để xem.")}</li>
        <li>{t("The scoring API (/api/score) stores nothing; it returns a result and forgets the request.", "API chấm điểm (/api/score) không lưu gì; chỉ trả kết quả rồi bỏ yêu cầu.")}</li>
      </ul>

      <h2 className="font-semibold mt-6 mb-2">{t("3. What goes to the AI assistant", "3. Dữ liệu gửi đến trợ lý AI")}</h2>
      <ul className="text-sm list-disc pl-5 space-y-1">
        <li>{t("Only totals per category, your cost settings, and — if you ask about one order — that order's details and scores.",
               "Chỉ gồm tổng hợp theo danh mục, cài đặt chi phí của bạn, và — nếu bạn hỏi về một đơn — chi tiết và điểm của đơn đó.")}</li>
        <li>{t("Never sent: customer codes, addresses, or the full order list.", "Không bao giờ gửi: mã khách hàng, địa chỉ hoặc toàn bộ danh sách đơn.")}</li>
        <li>{t("The assistant runs on a free external AI service (Groq or Google Gemini), outside Vietnam. Free tiers may use prompts to improve their models, which is acceptable only because the data is simulated. A real pilot would use a paid tier with no training on client data, or switch the assistant off.",
               "Trợ lý chạy trên dịch vụ AI miễn phí bên ngoài (Groq hoặc Google Gemini), đặt ngoài Việt Nam. Gói miễn phí có thể dùng nội dung câu hỏi để cải thiện mô hình, điều này chỉ chấp nhận được vì dữ liệu là mô phỏng. Thí điểm thật sẽ dùng gói trả phí không huấn luyện trên dữ liệu khách hàng, hoặc tắt trợ lý.")}</li>
        <li>{t("Scoring orders does not use any external AI: the return model and RVS run inside ReLoop.", "Việc chấm điểm đơn hàng không dùng AI bên ngoài: mô hình dự đoán và RVS chạy trong ReLoop.")}</li>
      </ul>

      <h2 className="font-semibold mt-6 mb-2">{t("4. Deleting data", "4. Xóa dữ liệu")}</h2>
      <p className="text-sm">
        {t("A company can delete all of its orders at any time on the Upload CSV page, and its saved model on the AI Model page.",
           "Doanh nghiệp có thể xóa toàn bộ đơn hàng của mình bất cứ lúc nào ở trang Tải lên CSV, và xóa mô hình đã lưu ở trang Mô hình AI.")}
      </p>

      <h2 className="font-semibold mt-6 mb-2">{t("5. Before a real pilot (Vietnam Law 91/2025 on personal data protection)", "5. Trước khi thí điểm thật (Luật Bảo vệ dữ liệu cá nhân số 91/2025)")}</h2>
      <ul className="text-sm list-disc pl-5 space-y-1">
        <li>{t("Data processing agreement with the brand: the brand stays the data controller; ReLoop processes only approved fields.", "Thỏa thuận xử lý dữ liệu với thương hiệu: thương hiệu là bên kiểm soát dữ liệu; ReLoop chỉ xử lý các trường đã được duyệt.")}</li>
        <li>{t("Brand exports pseudonymised data only (customer codes hashed, no names or contacts).", "Thương hiệu chỉ xuất dữ liệu đã được ẩn danh hóa (mã khách hàng được băm, không có tên hay thông tin liên lạc).")}</li>
        <li>{t("Cross-border transfer assessment dossier, or hosting the database in Vietnam if required.", "Hồ sơ đánh giá chuyển dữ liệu ra nước ngoài, hoặc đặt cơ sở dữ liệu tại Việt Nam nếu được yêu cầu.")}</li>
        <li>{t("Retention limit (e.g. delete order-level data after the 60-day return window plus the training period) and a security review.", "Giới hạn thời gian lưu (ví dụ xóa dữ liệu cấp đơn sau thời hạn hoàn hàng 60 ngày cộng thời gian huấn luyện) và đánh giá bảo mật.")}</li>
      </ul>
      <p className="text-xs text-gray-500 mt-6">{t("This page describes the prototype's design; it is not legal advice.", "Trang này mô tả thiết kế của bản mẫu; không phải tư vấn pháp lý.")}</p>
    </>
  );
}
