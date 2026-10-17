import Link from "next/link";
import type { ReactNode } from "react";
import { Inter, EB_Garamond } from "next/font/google";
import { logout } from "@/app/login/actions";
import LangSwitch from "@/components/LangSwitch";
import AssistantWidget from "@/components/AssistantWidget";
import SideNav from "@/components/SideNav";
import { getT } from "@/lib/i18n";

/**
 * Logged-in app frame: deep green sidebar (same gradient as the landing page) around a white content area.
 * `qs` keeps the chosen data set / brand type / method in every link. Also hosts the Ask AI button.
 */
const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body" });
const display = EB_Garamond({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-display" });

export default async function AppShell({ qs = "", email, footerNote, children }: { qs?: string; email?: string; footerNote?: ReactNode; children: ReactNode }) {
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
    ["/privacy", t("Data & Privacy", "Dữ liệu & Quyền riêng tư")],
  ];
  // The assistant answers about the data set and settings chosen on this page
  const q = new URLSearchParams(qs.replace(/^\?/, ""));
  return (
    <div className={`${body.variable} ${display.variable} flex min-h-screen w-full flex-col font-[family-name:var(--font-body)] text-[#174538] md:flex-row`}>
      <aside className="flex flex-col gap-4 bg-gradient-to-b from-[#2F594F] to-[#264840] pb-0 pt-4 text-[#FFFEF6] md:sticky md:top-0 md:h-screen md:w-fit md:shrink-0 md:gap-8 md:overflow-y-auto md:py-7">
        {/* No side padding on the sidebar itself: the active link's highlight runs edge to edge */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-7">
          <Link href={"/dashboard" + qs} className="text-lg font-semibold uppercase tracking-[0.12em]">ReLoop AI</Link>
          {/* Phones: language switch and Log out side by side in the top bar (on larger screens they sit at the bottom of the sidebar) */}
          <div className="flex items-center gap-2 md:hidden">
            <LangSwitch lang={lang} tone="dark" />
            <form action={logout}>
              <button className="cursor-pointer rounded border px-2 py-0.5 text-sm transition-colors hover:bg-[#FFFEF6]/15">{t("Log out", "Đăng xuất")}</button>
            </form>
          </div>
        </div>
        <SideNav main={MAIN} settings={SETTINGS} settingsLabel={t("Settings", "Cài đặt")} qs={qs} />
        <div className="mt-auto hidden space-y-4 px-7 md:block">
          {/* w-0 + min-w-full: a long email is cut short instead of making the sidebar wider */}
          {email && <p className="w-0 min-w-full truncate text-xs opacity-70">{email}</p>}
          {/* Same size as the language buttons on the landing page, with Log out right beside them */}
          <div className="flex items-center gap-3">
            <LangSwitch lang={lang} size="lg" tone="dark" />
            <form action={logout}>
              <button className="w-28 cursor-pointer whitespace-nowrap rounded-[9px] border px-4 py-2.5 text-center text-sm leading-5 transition-colors hover:bg-[#FFFEF6]/15">
                {t("Log out", "Đăng xuất")}
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[#FFFEF6]">
        <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10 md:py-14">{children}</div>
        {/* Very bottom of every page */}
        <footer className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-6 pb-10 pt-4 text-center text-xs text-[#355E3B] md:px-10">
          {/* One centered paragraph (about two lines on desktop, balanced): the page's own note followed by the simulated-data sentence */}
          <p className="max-w-6xl text-balance leading-relaxed">
            {footerNote && <>{footerNote}{" "}</>}
            {t("All demo data is simulated.", "Toàn bộ dữ liệu demo là dữ liệu mô phỏng.")}
          </p>        </footer>
      </main>

      {email && (
        <AssistantWidget org={q.get("org") ?? ""} preset={q.get("preset") ?? ""} method={q.get("method") ?? ""} lang={lang} variant="brand" fontClass={body.className} />
      )}
    </div>
  );
}
