/** Shown on the login page so judges know what they can do with the demo account. */
export default function DemoNote() {
  return (
    <div className="rounded border p-3 text-sm space-y-1">
      <p className="font-semibold">Untuk juri / pengunjung</p>
      <p>Login dengan akun demo: <b>demo@reloop.app</b> / <b>reloop</b>.</p>
      <p>
        Akun demo dipakai bersama. Data di &quot;Data saya&quot; milik akun demo bisa diubah oleh pengunjung lain,
        jadi hasilnya bisa berbeda dari yang kamu tinggalkan. Untuk mencoba upload CSV, pengaturan biaya, atau
        melatih ulang model tanpa diganggu orang lain, buat akun sendiri lewat tombol daftar di halaman ini.
      </p>
      <p className="text-gray-500">Semua order demo adalah data simulasi.</p>
    </div>
  );
}
