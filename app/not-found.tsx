import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-3">
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p>Alamat ini tidak ada di ReLoop AI.</p>
      <Link href="/" className="underline">Kembali ke Dashboard</Link>
    </main>
  );
}
