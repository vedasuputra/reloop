import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import ApiTryIt from "@/components/ApiTryIt";
import CodeBlock from "@/components/CodeBlock";
import Section from "@/components/Section";
import Stat from "@/components/Stat";
import { CARD, LINK, Notice, PageTitle, StepNo, TABLE_BOX, TH, TR, Tag, rise } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { scoreOrder, withPreset } from "@/lib/rvs";
import { baseConfig, model, PRESETS } from "@/lib/data";
import { getT } from "@/lib/i18n";

const EXAMPLE = {
  method: "dropoff",
  preset: "acuan_ukuran_baju",
  orders: [{
    order_id: "A1", category: "Dress", payment_method: "COD", multi_size: 1, voucher_used: 0,
    quantity_of_item: 1, past_delivered_in_data: 3, customer_return_rate_in_data: 0.33,
    estimated_delivery_distance_km: 12,
  }],
};

export const metadata = { title: "API integration" };

export default function Integration({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const { t, f } = await getT();
  const { data: { user } } = await (await createClient()).auth.getUser();
  const qs = sp.org || sp.method || sp.preset
    ? `?method=${sp.method ?? "courier_pickup"}&preset=${sp.preset ?? "acuan_ukuran_baju"}&org=${sp.org ?? ""}`
    : "";
  const o = EXAMPLE.orders[0];
  const r = scoreOrder(withPreset(baseConfig, EXAMPLE.preset), model, o, "dropoff");
  const response = {
    method: "dropoff", preset: EXAMPLE.preset, model: "logistic_regression (simulated training data)",
    results: [{
      order_id: "A1", recommendation: r.recommendation, rvs: Math.round(r.rvs * 10) / 10,
      return_probability: Math.round(r.predReturnProb * 1000) / 1000,
      expected_cost_single_use_vnd: Math.round(r.expCostSingleVnd),
      expected_cost_reusable_vnd: Math.round(r.expCostReusableVnd), reason: r.reason,
    }],
  };
  const request = `POST /api/score\nContent-Type: application/json\n\n${JSON.stringify(EXAMPLE, null, 2)}`;
  const curl = `curl -X POST "https://ai-reloop.vercel.app/api/score" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(EXAMPLE)}'`;
  const copy = t("Copy", "Sao chép"), copied = t("Copied", "Đã sao chép");

  // [field, required, type, what it is]
  const top: [string, boolean, string, string][] = [
    ["orders", true, "array", t("The orders to score. At most 1,000 per request.", "Các đơn hàng cần chấm điểm. Tối đa 1.000 đơn mỗi yêu cầu.")],
    ["method", false, "courier_pickup | dropoff", t("How packs come back. Default courier_pickup.", "Cách thu hồi bao bì. Mặc định courier_pickup.")],
    ["preset", false, "string", t(`Brand type. One of: ${PRESETS.map((p) => p.key).join(", ")}.`, `Loại thương hiệu. Một trong: ${PRESETS.map((p) => p.key).join(", ")}.`)],
  ];
  const order: [string, boolean, string, string][] = [
    ["category", true, "string", t("Product category, e.g. Dress, Shirt, Outerwear.", "Danh mục sản phẩm, ví dụ Dress, Shirt, Outerwear.")],
    ["payment_method", true, "string", t("COD for cash on delivery; otherwise Bank transfer, E-wallet, Credit/debit card.", "COD cho thanh toán khi nhận hàng; ngoài ra Bank transfer, E-wallet, Credit/debit card.")],
    ["quantity_of_item", true, "number", t("Number of items.", "Số sản phẩm.")],
    ["estimated_delivery_distance_km", true, "number", t("Distance to the customer, in km.", "Khoảng cách đến khách hàng, tính bằng km.")],
    ["order_id", false, "string", t("Your own reference; returned unchanged.", "Mã tham chiếu của bạn; được trả về nguyên vẹn.")],
    ["multi_size", false, "0 | 1", t("1 if the same item was bought in more than one size. Default 0.", "1 nếu mua cùng một sản phẩm với nhiều cỡ. Mặc định 0.")],
    ["voucher_used", false, "0 | 1", t("1 if a voucher was used. Default 0.", "1 nếu có dùng voucher. Mặc định 0.")],
    ["past_delivered_in_data", false, "number", t("Earlier delivered orders of this customer. Default 0.", "Số đơn đã giao trước đây của khách. Mặc định 0.")],
    ["customer_return_rate_in_data", false, "number | null", t("Share of those earlier orders that were returned, 0 to 1. Leave out for a new customer.", "Tỷ lệ các đơn trước đó bị hoàn, từ 0 đến 1. Bỏ trống nếu là khách mới.")],
  ];
  const out: [string, string][] = [
    ["recommendation", t("REUSABLE, REVIEW or SINGLE-USE. This is the packing instruction.", "REUSABLE, REVIEW hoặc SINGLE-USE. Đây là chỉ dẫn đóng gói.")],
    ["rvs", t("Reuse Viability Score, 0 to 100.", "Điểm khả thi tái sử dụng, từ 0 đến 100.")],
    ["return_probability", t("Chance the order is returned, 0 to 1.", "Xác suất đơn bị hoàn, từ 0 đến 1.")],
    ["expected_cost_single_use_vnd", t("Expected packaging cost in a single-use pack.", "Chi phí bao bì dự kiến khi dùng một lần.")],
    ["expected_cost_reusable_vnd", t("Expected packaging cost in a reusable pack, incl. cleaning and the risk of losing it.", "Chi phí bao bì dự kiến khi tái sử dụng, gồm vệ sinh và rủi ro mất túi.")],
    ["reason", t("One line explaining the recommendation.", "Một dòng giải thích đề xuất.")],
  ];

  const table = (rows: [string, boolean, string, string][], head: string) => (
    <div className={TABLE_BOX}>
      {/* Fixed column widths, the same in every request table, so the columns line up from the top table to the bottom one */}
      <table className="w-full min-w-[760px] table-fixed text-sm">
        <colgroup><col className="w-[30%]" /><col className="w-[13%]" /><col className="w-[22%]" /><col className="w-[35%]" /></colgroup>
        <thead>
          <tr className="border-b border-[#174538]/15">
            <th className={TH}>{head}</th><th className={TH}>{t("Required?", "Bắt buộc?")}</th><th className={TH}>{t("Type", "Kiểu")}</th><th className={TH}>{t("What it is", "Nội dung")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, required, type, what]) => (
            <tr key={name} className={`${TR} align-top`}>
              <td className="whitespace-nowrap px-4 py-3"><span className="text-[13px] font-semibold">{name}</span></td>
              <td className="px-4 py-3"><Tag tone={required ? "ok" : "plain"}>{required ? t("Required", "Bắt buộc") : t("Optional", "Tùy chọn")}</Tag></td>
              <td className="px-4 py-3 text-[13px] text-[#355E3B]">{type}</td>
              <td className="px-4 py-3 text-xs leading-relaxed text-[#355E3B]">{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AppShell qs={qs} email={user?.email}>
      <PageTitle title={t("API integration", "Tích hợp API")}
        sub={t("A brand's order system can send orders to ReLoop and get packaging recommendations back right away, without opening the dashboard. This endpoint does not store any data.",
          "Hệ thống đơn hàng của thương hiệu có thể gửi đơn đến ReLoop và nhận ngay đề xuất bao bì mà không cần mở bảng điều khiển. Endpoint này không lưu dữ liệu.")} />

      <div className="rl-rise mt-6" style={rise(1)}>
        <div className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-3">
          <Stat layout="cell" variant="green" label={t("Endpoint", "Endpoint")} value="POST /api/score" size="sm" note={t("JSON in, JSON out", "Gửi JSON, nhận JSON")} />
          <Stat layout="cell" label={t("Orders per request", "Số đơn mỗi yêu cầu")} value={f.n(1000)} size="sm" note={t("at most", "tối đa")} />
          <Stat layout="cell" label={t("Data stored", "Dữ liệu được lưu")} value={t("None", "Không")} size="sm" note={t("it returns a result and forgets the request", "trả kết quả rồi bỏ yêu cầu")} />
        </div>
      </div>

      <Section title={t("Quick start", "Bắt đầu nhanh")} sub={t("Send one order, get one recommendation. The response below is calculated live.", "Gửi một đơn, nhận một đề xuất. Phản hồi bên dưới được tính trực tiếp.")} i={2}>
        <div className="grid gap-5 xl:grid-cols-2">
          <CodeBlock title={t("Request", "Yêu cầu")} code={request} copy={copy} copied={copied} />
          <CodeBlock title={t("Response (calculated live)", "Phản hồi (tính trực tiếp)")} code={JSON.stringify(response, null, 2)} copy={copy} copied={copied} />
        </div>
        <div className="mt-5">
          <CodeBlock title="curl" code={curl} copy={copy} copied={copied} />
        </div>
      </Section>

      <Section title={t("Try it", "Thử ngay")}
        sub={t("Edit the request and press Send: it calls this app's own /api/score from your browser and shows the real answer.", "Chỉnh sửa yêu cầu rồi bấm Gửi: trình duyệt của bạn gọi /api/score của chính ứng dụng này và hiển thị phản hồi thật.")} i={3}>
        <ApiTryIt initial={JSON.stringify(EXAMPLE, null, 2)}
          labels={{
            request: t("Request", "Yêu cầu"), response: t("Response", "Phản hồi"), send: t("Send", "Gửi"), sending: t("Sending…", "Đang gửi…"), reset: t("Reset example", "Đặt lại ví dụ"),
            empty: t("Press Send to see the response here.", "Bấm Gửi để xem phản hồi ở đây."), network: t("Could not reach the API. Check your connection and try again.", "Không kết nối được tới API. Hãy kiểm tra kết nối rồi thử lại."),
            hint: t("Ctrl + Enter also sends. Try removing a required field to see an error.", "Ctrl + Enter cũng gửi. Hãy thử xóa một trường bắt buộc để thấy thông báo lỗi."),
          }} />
      </Section>

      <Section title={t("Request fields", "Các trường của yêu cầu")} i={3}>
        <div className="space-y-5">
          {table(top, t("Request body", "Nội dung yêu cầu"))}
          {table(order, t("Each order", "Mỗi đơn hàng"))}
        </div>
      </Section>

      <Section title={t("Response fields", "Các trường của phản hồi")} sub={t("One result per order, in the same order you sent them.", "Mỗi đơn một kết quả, theo đúng thứ tự bạn gửi.")} i={4}>
        <div className={TABLE_BOX}>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#174538]/15"><th className={TH}>{t("Field", "Trường")}</th><th className={TH}>{t("What it is", "Nội dung")}</th></tr>
            </thead>
            <tbody>
              {out.map(([name, what]) => (
                <tr key={name} className={`${TR} align-top`}>
                  <td className="whitespace-nowrap px-4 py-3"><span className="text-[13px] font-semibold">{name}</span></td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-[#355E3B]">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Notice tone="info" title={t("What this demo endpoint uses", "Endpoint demo này dùng gì")} className="mt-5">
          {t("It scores with the built-in model and the costs of the brand type you pick in preset. Your own saved cost settings and retrained model apply inside the app. Scoring never calls an external AI: the return model and the score run inside ReLoop.",
            "Endpoint chấm điểm bằng mô hình mặc định và chi phí của loại thương hiệu bạn chọn ở preset. Cài đặt chi phí đã lưu và mô hình huấn luyện lại của bạn áp dụng trong ứng dụng. Việc chấm điểm không bao giờ gọi AI bên ngoài: mô hình dự đoán và điểm số chạy ngay trong ReLoop.")}{" "}
          <Link href="/privacy" className={LINK}>{t("Data & Privacy", "Dữ liệu & Quyền riêng tư")}</Link>
        </Notice>
      </Section>

      <Section title={t("From CSV to live", "Từ CSV đến chạy trực tiếp")} sub={t("CSV files stay available as plan B at every step.", "Tệp CSV luôn là phương án dự phòng ở mọi bước.")} i={5}>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [t("Pilot on history", "Thí điểm trên lịch sử"), t("Upload the brand's past orders as CSV and compare predictions with what really happened (shadow mode).", "Tải đơn hàng cũ của thương hiệu dạng CSV và so dự đoán với thực tế (chế độ chạy song song).")],
            [t("Live integration", "Tích hợp trực tiếp"), t("The order system calls this API and the recommendation goes to the packing team before each order ships.", "Hệ thống đơn hàng gọi API này và đề xuất được gửi đến đội đóng gói trước khi mỗi đơn xuất kho.")],
            [t("Continuous learning", "Học liên tục"), t("Actual returns and pack recovery retrain the model and recalibrate the cost inputs.", "Dữ liệu hoàn hàng và thu hồi bao bì thực tế được dùng để huấn luyện lại mô hình và hiệu chỉnh các đầu vào chi phí.")],
          ].map(([title, text], i) => (
            <div key={title} className={CARD}>
              <StepNo n={i + 1} />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">{text}</p>
            </div>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}
