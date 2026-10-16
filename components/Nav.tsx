import Link from "next/link";
import { logout } from "@/app/login/actions";
import LangSwitch from "@/components/LangSwitch";
import AssistantWidget from "@/components/AssistantWidget";
import { getT } from "@/lib/i18n";

/** Top navigation: 5 main screens + a Settings menu. `qs` keeps the chosen data set/brand type/method. */
export default async function Nav({ qs = "", email }: { qs?: string; email?: string }) {
  const { lang, t } = await getT();
  const MAIN: [string, string][] = [
    ["/dashboard", t("Dashboard", "Tổng quan")],
    ["/orders", t("Orders", "Đơn hàng")],
    ["/simulator", t("Simulator", "Mô phỏng")],
    ["/report", t("Report", "Báo cáo")],
    ["/model", t("AI Model", "Mô hình AI")],
  ];
  const SETTINGS: [string, string][] = [
    ["/upload", t("Upload data (CSV)", "Tải dữ liệu lên (CSV)")],
    ["/settings", t("Cost settings", "Cài đặt chi phí")],
    ["/integration", t("API integration", "Tích hợp API")],
  ];
  // The assistant answers about the data set and settings chosen on this page
  const q = new URLSearchParams(qs.replace(/^\?/, ""));
  return (
    <header className="border-b pb-3 mb-6 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={email ? "/dashboard" + qs : "/"} className="font-bold text-lg">ReLoop AI</Link>
        <div className="flex items-center gap-3 text-sm">
          <LangSwitch lang={lang} />
          {email && <span className="text-gray-500">{email}</span>}
          <form action={logout}><button className="underline">{t("Log out", "Đăng xuất")}</button></form>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-4 text-sm">
        {MAIN.map(([href, label]) => (
          <Link key={href} href={href + qs} className="underline">{label}</Link>
        ))}
        <details className="relative">
          <summary className="cursor-pointer underline">{t("Settings", "Cài đặt")}</summary>
          <div className="absolute z-40 mt-1 flex min-w-48 flex-col gap-2 rounded border bg-white p-3 text-black dark:bg-black dark:text-white">
            {SETTINGS.map(([href, label]) => (
              <Link key={href} href={href + qs} className="underline">{label}</Link>
            ))}
          </div>
        </details>
      </nav>
      <p className="text-xs text-gray-500">
        {t("All demo data is simulated.", "Toàn bộ dữ liệu demo là dữ liệu mô phỏng.")}{" "}
        <Link href="/privacy" className="underline">{t("Data & Privacy", "Dữ liệu & Quyền riêng tư")}</Link>
      </p>
      {email && (
        <AssistantWidget org={q.get("org") ?? ""} preset={q.get("preset") ?? ""} method={q.get("method") ?? ""} lang={lang} />
      )}
    </header>
  );
}
