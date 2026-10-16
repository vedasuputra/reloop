import { Suspense } from "react";
import { login, signup } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto max-w-sm p-8 space-y-6">
      <h1 className="text-2xl font-bold">ReLoop AI</h1>
      <div className="rounded border p-3 text-sm">
        <p className="font-semibold">Akun demo untuk juri</p>
        <p>Email: demo@reloop.app</p>
        <p>Password: reloop</p>
      </div>
      <Suspense fallback={null}>
        <ErrorMessage searchParams={searchParams} />
      </Suspense>
      <form className="space-y-3">
        <input name="email" type="email" required placeholder="Email" defaultValue="demo@reloop.app"
          className="w-full rounded border p-2 bg-transparent" />
        <input name="password" type="password" required placeholder="Password (min. 6 karakter)"
          className="w-full rounded border p-2 bg-transparent" />
        <div className="flex gap-2">
          <button formAction={login} className="flex-1 rounded bg-white text-black p-2 font-semibold">Masuk</button>
          <button formAction={signup} className="flex-1 rounded border p-2">Daftar</button>
        </div>
      </form>
      <p className="text-xs text-gray-500">Semua data di aplikasi ini adalah data simulasi.</p>
    </main>
  );
}

async function ErrorMessage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return error ? <p className="text-sm text-red-500">{error}</p> : null;
}