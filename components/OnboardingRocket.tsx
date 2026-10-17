import GetStarted, { type GetStartedProps } from "@/components/GetStarted";
import { closeWelcome, startWithSample, startWithUpload, type Onboarding } from "@/app/onboarding/actions";
import { DEMO_ORG, getCostSettings, getOrgModel, getOrgs, getSessionUser } from "@/lib/context";
import { getT } from "@/lib/i18n";

/**
 * The get-started rocket beside the logo, with the welcome popup for a new person. It looks up what this person has done so far
 * (their organisation's orders, saved costs, saved model; what is remembered in their account), so it is rendered inside its own
 * Suspense boundary: the page around it never waits for these lookups.
 */
export default async function OnboardingRocket({ qs, fontClass }: { qs: string; fontClass: string }) {
  const { t } = await getT();
// Onboarding: what this person has done so far, read from what already exists (their organisation's orders, saved costs, saved model)
// and from what is remembered in their account (the welcome was closed; they chose the sample data).
  const [user, orgs] = await Promise.all([getSessionUser(), getOrgs()]);
  const remembered = (user?.user_metadata?.onboarding ?? {}) as Onboarding;
  const own = orgs.find((o) => o.id !== DEMO_ORG && (o.role === "owner" || o.role === "editor"));
  const hasData = !!own && own.orders > 0;
  const [settings, model] = own ? await Promise.all([getCostSettings(own.id), getOrgModel(own.id)]) : [null, null];
  const hasNumbers = !!settings;
  const hasModel = !!model;
  const dataDone = hasData || remembered.data === "sample";
  // Ready-made data: the organisation's own data set when it has one (the person may read it), otherwise the shared sample
  const company = orgs.find((o) => o.id !== DEMO_ORG && o.role !== "owner" && o.orders > 0);
  const readyName = company ? t(`${company.name}'s data`, `dữ liệu của ${company.name}`) : t("sample data", "dữ liệu mẫu");
  const resultsHref = !hasData && remembered.data === "sample" ? `/dashboard?org=${company?.id ?? DEMO_ORG}` : `/dashboard${qs}`;
  const steps: GetStartedProps["steps"] = [
    { key: "data", done: dataDone, title: t("Choose your data", "Chọn dữ liệu của bạn"),
      text: t("Begin with ready-made data, or upload your own orders.", "Bắt đầu với dữ liệu có sẵn, hoặc tải lên đơn hàng của riêng bạn."),
      options: [{ label: t(`Explore ${readyName}`, `Khám phá ${readyName}`), action: startWithSample }, { label: t("Upload my data", "Tải dữ liệu của tôi lên"), action: startWithUpload }],
      files: [{ label: t("CSV template", "Mẫu CSV"), href: "/template_orders.csv" }, { label: t("Sample orders", "Đơn hàng mẫu"), href: "/contoh_latih_ulang.csv" }] },
    { key: "numbers", done: hasNumbers, title: t("Set your cost numbers", "Thiết lập số liệu chi phí"),
      text: t("Choose a preset or enter your own prices.", "Chọn một mẫu có sẵn hoặc nhập giá của riêng bạn."),
      options: [{ label: t("Open cost settings", "Mở cài đặt chi phí"), href: `/settings${qs}` }] },
    { key: "results", done: dataDone && hasNumbers, title: t("Review your results", "Xem kết quả của bạn"),
      text: t("The Dashboard shows a recommendation for every order.", "Bảng điều khiển hiển thị đề xuất cho từng đơn hàng."),
      options: [{ label: t("Open the Dashboard", "Mở trang Tổng quan"), href: resultsHref }] },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const props: GetStartedProps = {
    showWelcome: !remembered.welcomed && !hasData,
    closeAction: closeWelcome,
    steps,
    optional: [
      { key: "model", done: hasModel, title: t("Retrain the AI on your own orders", "Huấn luyện lại AI bằng đơn hàng của bạn"),
        text: t("Requires a was_returned column in your upload.", "Cần có cột was_returned trong tệp bạn tải lên."), href: `/model${qs}` },
      { key: "api", done: false, title: t("Connect your order system", "Kết nối hệ thống đơn hàng của bạn"),
        text: t("Send orders to ReLoop AI through the API.", "Gửi đơn hàng đến ReLoop AI qua API."), href: `/integration${qs}` },
    ],
    welcome: {
      title: t("Welcome to ReLoop AI", "Chào mừng bạn đến với ReLoop AI"),
      intro: t("ReLoop AI recommends, for each order, whether a reusable or a single-use pack makes sense. Please choose how you would like to begin.",
        "ReLoop AI đề xuất, cho từng đơn hàng, nên dùng bao bì tái sử dụng hay bao bì dùng một lần. Vui lòng chọn cách bạn muốn bắt đầu."),
      sample: company
        ? { title: t(`Explore ${company.name}'s data`, `Khám phá dữ liệu của ${company.name}`), text: t(`Orders and cost settings already prepared for ${company.name}. Nothing needs to be prepared.`, `Đơn hàng và cài đặt chi phí đã được chuẩn bị sẵn cho ${company.name}. Không cần chuẩn bị gì.`), action: startWithSample }
        : { title: t("Explore with sample data", "Khám phá bằng dữ liệu mẫu"), text: t("Simulated orders that are ready to use. Nothing needs to be prepared.", "Đơn hàng mô phỏng có sẵn để sử dụng. Không cần chuẩn bị gì."), action: startWithSample },
      upload: { title: t("Upload your own data", "Tải dữ liệu của bạn lên"), text: t("A CSV export of your orders. A template is provided.", "Tệp CSV xuất từ đơn hàng của bạn. Có sẵn một tệp mẫu."), action: startWithUpload },
      files: t("Files you can use straight away:", "Các tệp có thể dùng ngay:"),
      fileLinks: [{ label: t("CSV template", "Mẫu CSV"), href: "/template_orders.csv" }, { label: t("Sample orders with return outcomes", "Đơn hàng mẫu kèm kết quả hoàn hàng"), href: "/contoh_latih_ulang.csv" }],
      guide: t("Further guidance, such as entering your own cost numbers or choosing a preset, remains available at any time under the rocket icon beside the logo.",
        "Các hướng dẫn tiếp theo, chẳng hạn như nhập số liệu chi phí riêng hoặc chọn một mẫu có sẵn, luôn có tại biểu tượng tên lửa cạnh logo."),
    },
    labels: {
      open: t("Get started", "Bắt đầu"), title: t("Get started", "Bắt đầu"),
      progress: t(`${doneCount} of ${steps.length} steps completed`, `Đã hoàn thành ${doneCount} trên ${steps.length} bước`),
      optional: t("Optional", "Tùy chọn"), done: t("Done", "Đã xong"), close: t("Close", "Đóng"),
    },
    fontClass,
  };
  return <GetStarted {...props} />;
}
