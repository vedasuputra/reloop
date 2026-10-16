"use client";
import Link from "next/link";

/** Friendly message instead of a crash page. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-3">
      <h1 className="text-2xl font-bold">Ada yang tidak beres</h1>
      <p>Halaman ini gagal dimuat. Biasanya karena koneksi ke database terputus sebentar atau sesi login sudah habis.</p>
      <ul className="list-disc pl-5 text-sm">
        <li>Coba muat ulang dengan tombol di bawah.</li>
        <li>Kalau masih gagal, keluar lalu login lagi (akun demo: demo@reloop.app / reloop).</li>
      </ul>
      <div className="flex gap-3">
        <button onClick={() => reset()} className="rounded border px-3 py-1">Coba lagi</button>
        <Link href="/" className="rounded border px-3 py-1">Ke Dashboard</Link>
        <Link href="/login" className="rounded border px-3 py-1">Ke halaman login</Link>
      </div>
      {error.digest && <p className="text-xs text-gray-500">Kode error: {error.digest}</p>}
    </main>
  );
}
