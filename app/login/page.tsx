import { Suspense } from "react";
import { connection } from "next/server";
import { login, signup } from "./actions";
import DemoNote from "@/components/DemoNote";
import LangSwitch from "@/components/LangSwitch";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto max-w-sm p-8 space-y-6">
      <Suspense fallback={<p>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const { lang, t } = await getT();
  const { error } = await searchParams;
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ReLoop AI</h1>
        <LangSwitch lang={lang} />
      </div>
      <DemoNote />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <form className="space-y-3">
        <input name="email" type="email" required placeholder="Email" defaultValue="demo@reloop.app"
          className="w-full rounded border p-2 bg-transparent" />
        <input name="password" type="password" required placeholder={t("Password (min. 6 characters)", "Mật khẩu (tối thiểu 6 ký tự)")}
          className="w-full rounded border p-2 bg-transparent" />
        <div className="flex gap-2">
          <button formAction={login} className="flex-1 rounded bg-white text-black p-2 font-semibold">{t("Log in", "Đăng nhập")}</button>
          <button formAction={signup} className="flex-1 rounded border p-2">{t("Sign up", "Đăng ký")}</button>
        </div>
      </form>
    </>
  );
}
