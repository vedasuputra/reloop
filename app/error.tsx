"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const TXT = {
  en: {
    title: "Something went wrong",
    body: "This page failed to load. Usually the database connection dropped for a moment or the login session expired.",
    tips: ["Try reloading with the button below.", "If it still fails, log out and log in again (demo account: demo@reloop.app / reloop)."],
    retry: "Try again", home: "To the Dashboard", login: "To the login page", code: "Error code",
  },
  vi: {
    title: "Đã xảy ra lỗi",
    body: "Không tải được trang này. Thường là do kết nối cơ sở dữ liệu bị gián đoạn trong chốc lát hoặc phiên đăng nhập đã hết hạn.",
    tips: ["Hãy thử tải lại bằng nút bên dưới.", "Nếu vẫn lỗi, hãy đăng xuất rồi đăng nhập lại (tài khoản demo: demo@reloop.app / reloop)."],
    retry: "Thử lại", home: "Về trang Tổng quan", login: "Về trang đăng nhập", code: "Mã lỗi",
  },
};

/** Friendly message instead of a crash page. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [lang, setLang] = useState<"en" | "vi">("en");
  useEffect(() => { if (document.cookie.includes("lang=vi")) setLang("vi"); }, []);
  const L = TXT[lang];
  return (
    <main className="mx-auto max-w-xl p-6 space-y-3">
      <h1 className="text-2xl font-bold">{L.title}</h1>
      <p>{L.body}</p>
      <ul className="list-disc pl-5 text-sm">{L.tips.map((x) => <li key={x}>{x}</li>)}</ul>
      <div className="flex gap-3">
        <button onClick={() => reset()} className="rounded border px-3 py-1">{L.retry}</button>
        <Link href="/dashboard" className="rounded border px-3 py-1">{L.home}</Link>
        <Link href="/login" className="rounded border px-3 py-1">{L.login}</Link>
      </div>
      {error.digest && <p className="text-xs text-gray-500">{L.code}: {error.digest}</p>}
    </main>
  );
}
