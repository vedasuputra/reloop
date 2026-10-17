import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Inter, EB_Garamond } from "next/font/google";
import AppShell from "@/components/AppShell";
import LangSwitch from "@/components/LangSwitch";
import Section from "@/components/Section";
import { BTN_PRIMARY, CARD, GREEN, H, LINK, Notice, PageTitle, TABLE_BOX, TH, TR, Tag } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { isDemoAccount } from "@/lib/account";
import { getT, type T } from "@/lib/i18n";
import { deleteAccount } from "./actions";

/**
 * Data & Privacy. What the prototype stores, where, and what goes to the AI.
 * Public page: signed-out visitors see it in the landing page's frame; signed-in users see it inside the app (sidebar kept).
 */
const DB_REGION = "Supabase, Northeast Asia (Seoul, ap-northeast-2)";
const APP_REGION = "Vercel, Singapore (sin1, ap-southeast-1)";

const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body" });
const display = EB_Garamond({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-display" });

export const metadata = { title: "Data & Privacy" };

export default function Privacy({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={<p className="p-6">…</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const { lang, t } = await getT();
  const { data: { user } } = await (await createClient()).auth.getUser();
  const account: Account = { signedIn: !!user, isDemo: isDemoAccount(user?.email), error: sp.error };
  const title = t("Data & Privacy", "Dữ liệu & Quyền riêng tư");
  const intro = t("This is a competition prototype. All demo orders are simulated: there is no real customer data in it. Please do not upload real personal data. Below is what the prototype stores, where, and what a real pilot would add.",
    "Đây là bản mẫu dự thi. Toàn bộ đơn hàng demo là dữ liệu mô phỏng, không có dữ liệu khách hàng thật. Vui lòng không tải lên dữ liệu cá nhân thật. Dưới đây là những gì bản mẫu lưu trữ, lưu ở đâu, và những gì một chương trình thí điểm thật sẽ bổ sung.");

  // Signed in: inside the app, with the sidebar. The sidebar links keep the chosen data set, brand type and method.
  if (user) {
    const qs = sp.org || sp.method || sp.preset ? `?method=${sp.method ?? "courier_pickup"}&preset=${sp.preset ?? "acuan_ukuran_baju"}&org=${sp.org ?? ""}` : "";
    return (
      <AppShell qs={qs} email={user.email}>
        <PageTitle title={title} sub={intro} />
        <Sections t={t} account={account} />
      </AppShell>
    );
  }

  // Signed out: the landing page's frame
  return (
    <div className={`${body.variable} ${display.variable} min-h-screen w-full bg-[#FFFEF6] font-[family-name:var(--font-body)] text-[#174538]`}>
      <div className="border-b border-[#174538]/15 bg-white">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-lg font-semibold uppercase tracking-[0.12em]">ReLoop AI</Link>
          <div className="flex items-center gap-3">
            <LangSwitch lang={lang} size="lg" />
            <Link href="/?login=1" className={BTN_PRIMARY}>{t("Log in", "Đăng nhập")}</Link>
          </div>
        </header>
      </div>
      <section className={GREEN}>
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          <h1 className={`${H} rl-rise text-5xl leading-[1.05] md:text-6xl`}>{title}</h1>
          <p className="rl-rise mt-5 max-w-3xl text-base leading-relaxed opacity-90 md:text-lg">{intro}</p>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-6 pb-16 pt-2">
        <Sections t={t} account={account} />
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 pb-8 text-xs text-[#355E3B]">
        <p>ReLoop AI · UEH Business Challenge 2026 · {t("All demo data is simulated.", "Toàn bộ dữ liệu demo là dữ liệu mô phỏng.")}</p>
        <Link href="/" className="underline">{t("Back to the home page", "Về trang chủ")}</Link>
      </footer>
    </div>
  );
}

type Account = { signedIn: boolean; isDemo: boolean; error?: string };

function Sections({ t, account }: { t: T; account: Account }) {
  const fields: [string, string, string][] = [
    ["order_id", t("Order number", "Mã đơn hàng"), t("To show and export the recommendation per order", "Để hiển thị và xuất đề xuất theo từng đơn")],
    ["customer_id", t("Pseudonymous customer code (no name, phone or email)", "Mã khách hàng ẩn danh (không có tên, số điện thoại hay email)"), t("To compute the customer's own return history", "Để tính lịch sử hoàn hàng của chính khách đó")],
    ["address", t("City or province only, not a street address", "Chỉ tỉnh/thành phố, không có địa chỉ cụ thể"), t("Display only", "Chỉ để hiển thị")],
    ["order_date", t("Date", "Ngày"), t("Time-based train/test split, monthly report", "Chia dữ liệu huấn luyện/kiểm tra theo thời gian, báo cáo theo tháng")],
    ["category, quantity, order value, multi_size, voucher, payment method", t("Order details", "Chi tiết đơn hàng"), t("Inputs of the return model", "Đầu vào của mô hình dự đoán hoàn hàng")],
    ["estimated_delivery_distance_km", t("Distance", "Khoảng cách"), t("Courier route and tariff", "Tuyến và cước giao hàng")],
    ["past_delivered_in_data, customer_return_rate_in_data, was_returned", t("Order history and outcome", "Lịch sử và kết quả đơn hàng"), t("Model input and training label", "Đầu vào và nhãn huấn luyện của mô hình")],
  ];
  const notCollected = [t("Customer names", "Tên khách hàng"), t("Phone numbers", "Số điện thoại"), t("Emails", "Email"), t("Street addresses", "Địa chỉ cụ thể"), t("Payment details", "Thông tin thanh toán")];
  const pilot = [
    t("Data processing agreement with the brand: the brand stays the data controller; ReLoop processes only approved fields.", "Thỏa thuận xử lý dữ liệu với thương hiệu: thương hiệu là bên kiểm soát dữ liệu; ReLoop chỉ xử lý các trường đã được duyệt."),
    t("Brand exports pseudonymised data only (customer codes hashed, no names or contacts). If that is not possible, anonymised exports only.", "Thương hiệu chỉ xuất dữ liệu đã được ẩn danh hóa (mã khách hàng được băm, không có tên hay thông tin liên lạc). Nếu không thể, chỉ dùng dữ liệu xuất đã ẩn danh hoàn toàn."),
    t("Cross-border transfer assessment dossier, or hosting the database in Vietnam if required.", "Hồ sơ đánh giá chuyển dữ liệu ra nước ngoài, hoặc đặt cơ sở dữ liệu tại Việt Nam nếu được yêu cầu."),
    t("Retention limit (e.g. delete order-level data after the 60-day return window plus the training period) and a security review.", "Giới hạn thời gian lưu (ví dụ xóa dữ liệu cấp đơn sau thời hạn hoàn hàng 60 ngày cộng thời gian huấn luyện) và đánh giá bảo mật."),
    t("Security and operational approval before any rollout, and no savings or CO₂ claim that has not been measured.", "Phê duyệt về bảo mật và vận hành trước mọi đợt triển khai, và không đưa ra tuyên bố tiết kiệm hay CO₂ chưa được đo lường."),
  ];

  return (
    <>
      <Section title={t("What we store, and why", "Chúng tôi lưu gì và vì sao")} i={1}>
        <div className={TABLE_BOX}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#174538]/15">
                <th className={TH}>{t("Field", "Trường")}</th><th className={TH}>{t("What it is", "Nội dung")}</th><th className={TH}>{t("Why it is needed", "Lý do cần")}</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(([k, a, b]) => (
                <tr key={k} className={`${TR} align-top`}>
                  <td className="px-4 py-3"><span className="text-[13px] font-semibold">{k}</span></td>
                  <td className="px-4 py-3">{a}</td>
                  <td className="px-4 py-3 text-[#355E3B]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#355E3B]">{t("Not collected at all:", "Hoàn toàn không thu thập:")}</span>
          {notCollected.map((c) => <Tag key={c} tone="warn">{c}</Tag>)}
        </div>
      </Section>

      <Section title={t("Where it is stored", "Lưu ở đâu")} i={2}>
        <div className="grid gap-5 md:grid-cols-3">
          <div className={CARD}>
            <p className="text-xs text-[#355E3B]">{t("Database", "Cơ sở dữ liệu")}</p>
            <p className="mt-2 font-semibold">{DB_REGION}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">{t("Encrypted in transit (HTTPS) and at rest by the provider.", "Được mã hóa khi truyền (HTTPS) và khi lưu trữ bởi nhà cung cấp.")}</p>
          </div>
          <div className={CARD}>
            <p className="text-xs text-[#355E3B]">{t("App server", "Máy chủ ứng dụng")}</p>
            <p className="mt-2 font-semibold">{APP_REGION}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">{t("The scoring API (/api/score) stores nothing; it returns a result and forgets the request.", "API chấm điểm (/api/score) không lưu gì; chỉ trả kết quả rồi bỏ yêu cầu.")}</p>
          </div>
          <div className={CARD}>
            <p className="text-xs text-[#355E3B]">{t("Who can see it", "Ai được xem")}</p>
            <p className="mt-2 font-semibold">{t("Each company sees only its own data", "Mỗi doanh nghiệp chỉ thấy dữ liệu của mình")}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">{t("Row-level security in the database checks membership on every query. The demo data set is read-only.", "Bảo mật cấp dòng trong cơ sở dữ liệu kiểm tra quyền thành viên ở mọi truy vấn. Bộ dữ liệu demo chỉ để xem.")}</p>
          </div>
        </div>
      </Section>

      <Section title={t("What goes to the AI assistant", "Dữ liệu gửi đến trợ lý AI")} i={3}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[9px] border border-[#b7dccf] bg-[#DEF4EE] p-5">
            <p className="font-semibold">{t("Sent", "Được gửi")}</p>
            <p className="mt-2 text-sm leading-relaxed">{t("Only totals per category, your cost settings, and, if you ask about one order, that order's details and scores.",
              "Chỉ gồm tổng hợp theo danh mục, cài đặt chi phí của bạn, và, nếu bạn hỏi về một đơn, chi tiết và điểm của đơn đó.")}</p>
          </div>
          <div className="rounded-[9px] border border-[#174538]/25 bg-[#FFFDD0] p-5">
            <p className="font-semibold">{t("Never sent", "Không bao giờ gửi")}</p>
            <p className="mt-2 text-sm leading-relaxed">{t("Customer codes, addresses, or the full order list.", "Mã khách hàng, địa chỉ hoặc toàn bộ danh sách đơn.")}</p>
          </div>
        </div>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>{t("The assistant runs on a free external AI service (Google Gemini), outside Vietnam. Free tiers may use prompts to improve their models, which is acceptable only because the data is simulated. A real pilot would use a paid tier with no training on client data, or switch the assistant off.",
            "Trợ lý chạy trên dịch vụ AI miễn phí bên ngoài (Google Gemini), đặt ngoài Việt Nam. Gói miễn phí có thể dùng nội dung câu hỏi để cải thiện mô hình, điều này chỉ chấp nhận được vì dữ liệu là mô phỏng. Thí điểm thật sẽ dùng gói trả phí không huấn luyện trên dữ liệu khách hàng, hoặc tắt trợ lý.")}</li>
          <li>{t("Scoring orders does not use any external AI: the return model and RVS run inside ReLoop.", "Việc chấm điểm đơn hàng không dùng AI bên ngoài: mô hình dự đoán và RVS chạy trong ReLoop.")}</li>
        </ul>
      </Section>

      <Section title={t("Who owns what", "Ai sở hữu gì")} i={4}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className={`rounded-[9px] p-5 ${GREEN}`}>
            <p className="font-semibold">ReLoop</p>
            <p className="mt-2 text-sm leading-relaxed opacity-90">{t("Owns the return model and the score weights. Trains, evaluates and retrains the custom model for a brand.", "Sở hữu mô hình dự đoán hoàn hàng và trọng số điểm. Huấn luyện, đánh giá và huấn luyện lại mô hình riêng cho thương hiệu.")}</p>
          </div>
          <div className={CARD}>
            <p className="font-semibold">{t("The brand", "Thương hiệu")}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">{t("Owns its data. Supplies approved data and sets pack prices, the way packs come back and courier tariffs.", "Sở hữu dữ liệu của mình. Cung cấp dữ liệu đã được duyệt và đặt giá bao bì, cách thu hồi bao bì và cước vận chuyển.")}</p>
          </div>
        </div>
      </Section>

      <Section title={t("Deleting data", "Xóa dữ liệu")} i={5}>
        <div className={CARD}>
          <p className="text-sm leading-relaxed">
            {t("A company can delete all of its orders at any time on the ", "Doanh nghiệp có thể xóa toàn bộ đơn hàng của mình bất cứ lúc nào ở trang ")}
            <Link href="/upload" className={LINK}>{t("Upload data (CSV)", "Tải dữ liệu lên (CSV)")}</Link>
            {t(" page and its saved model on the ", " và xóa mô hình đã lưu ở trang ")}
            <Link href="/model" className={LINK}>{t("AI Model", "Mô hình AI")}</Link>
            {t(" page. An account you created yourself can also be deleted for good, together with its data, once you are signed in; the shared demo account cannot be deleted.",
              ". Tài khoản do chính bạn tạo cũng có thể được xóa vĩnh viễn cùng dữ liệu của nó sau khi đăng nhập; tài khoản demo dùng chung không thể bị xóa.")}
          </p>

          {account.error && <Notice tone="warn" role="alert" className="mt-4">{account.error}</Notice>}

          {account.signedIn && (
            <div className="mt-4 border-t border-[#174538]/10 pt-4">
              {account.isDemo ? (
                <>
                  <button type="button" disabled className="inline-flex h-10 cursor-not-allowed items-center rounded-[9px] border border-[#174538]/25 bg-white px-5 text-sm font-semibold opacity-50">
                    {t("Delete my account", "Xóa tài khoản của tôi")}
                  </button>
                  <p className="mt-2 text-xs text-[#355E3B]">{t("This is the shared demo account, so it cannot be deleted.", "Đây là tài khoản demo dùng chung nên không thể xóa.")}</p>
                </>
              ) : (
                <details className="group">
                  <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-[9px] border border-[#174538]/40 bg-white px-5 text-sm font-semibold transition-opacity hover:opacity-85 [&::-webkit-details-marker]:hidden">
                    {t("Delete my account", "Xóa tài khoản của tôi")}
                  </summary>
                  <div className="mt-4">
                    <p className="text-sm leading-relaxed text-[#355E3B]">
                      {t("This permanently deletes your login and everything in your own data sets: orders, cost settings and saved model. The demo data is not touched. This cannot be undone.",
                        "Thao tác này xóa vĩnh viễn tài khoản đăng nhập và mọi thứ trong các bộ dữ liệu của riêng bạn: đơn hàng, cài đặt chi phí và mô hình đã lưu. Dữ liệu demo không bị ảnh hưởng. Không thể hoàn tác.")}
                    </p>
                    <form action={deleteAccount} className="mt-4">
                      <button className="inline-flex h-10 cursor-pointer items-center rounded-[9px] border border-[#174538]/40 bg-[#FFFDD0] px-5 text-sm font-semibold transition-opacity hover:opacity-85">
                        {t("Yes, delete my account", "Đúng, xóa tài khoản của tôi")}
                      </button>
                    </form>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title={t("Before a real pilot", "Trước khi thí điểm thật")}
        sub={t("Vietnam Law 91/2025 on personal data protection", "Luật Bảo vệ dữ liệu cá nhân số 91/2025")} i={6}>
        <ul className="grid gap-3">
          {pilot.map((p) => (
            <li key={p} className="flex gap-4 rounded-[9px] border border-[#174538]/15 bg-white px-5 py-4">
              <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2a7e67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M3.5 9.5 7 13l7.5-8" /></svg>
              <span className="text-sm leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-[#355E3B]">{t("This page describes the prototype's design; it is not legal advice.", "Trang này mô tả thiết kế của bản mẫu; không phải tư vấn pháp lý.")}</p>
      </Section>
    </>
  );
}
