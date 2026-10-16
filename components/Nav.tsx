import Link from "next/link";
import { logout } from "@/app/login/actions";
import LangSwitch from "@/components/LangSwitch";
import { getT } from "@/lib/i18n";

/** Top navigation. `qs` keeps the chosen method/preset/data set when switching screens. */
export default async function Nav({ qs = "", email }: { qs?: string; email?: string }) {
  const { lang, t } = await getT();
  const LINKS: [string, string][] = [
    ["/", t("Dashboard", "Tổng quan")],
    ["/orders", t("Order Analysis", "Phân tích đơn hàng")],
    ["/prediction", t("AI Prediction", "Dự đoán AI")],
    ["/recommendation", t("Recommendation", "Đề xuất bao bì")],
    ["/score", t("Check One Order", "Kiểm tra một đơn")],
    ["/simulator", t("Scenario Simulator", "Mô phỏng kịch bản")],
    ["/report", t("Sustainability Report", "Báo cáo bền vững")],
    ["/model", t("AI Model", "Mô hình AI")],
    ["/assistant", t("AI Assistant", "Trợ lý AI")],
    ["/upload", t("Upload CSV", "Tải lên CSV")],
    ["/settings", t("Cost Settings", "Cài đặt chi phí")],
    ["/integration", t("API Integration", "Tích hợp API")],
  ];
  return (
    <header className="border-b pb-3 mb-6 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-lg">ReLoop AI</span>
        <div className="flex items-center gap-3 text-sm">
          <LangSwitch lang={lang} />
          {email && <span className="text-gray-500">{email}</span>}
          <form action={logout}><button className="underline">{t("Log out", "Đăng xuất")}</button></form>
        </div>
      </div>
      <nav className="flex flex-wrap gap-3 text-sm">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href + qs} className="underline">{label}</Link>
        ))}
      </nav>
      <p className="text-xs text-gray-500">{t("All demo data is simulated.", "Toàn bộ dữ liệu demo là dữ liệu mô phỏng.")}</p>
    </header>
  );
}
