import Link from "next/link";

/** Static (no cookies here), so both languages are shown. */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-3">
      <h1 className="text-2xl font-bold">Page not found · Không tìm thấy trang</h1>
      <p>This address does not exist in ReLoop AI. · Địa chỉ này không tồn tại trong ReLoop AI.</p>
      <Link href="/" className="underline">Back to the Dashboard · Về trang Tổng quan</Link>
    </main>
  );
}
