import { Suspense } from "react";
import { login, signup } from "./actions";
import DemoNote from "@/components/DemoNote";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto max-w-sm p-8 space-y-6">
      <h1 className="text-2xl font-bold">ReLoop AI</h1>
      <DemoNote />
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
    </main>
  );
}

async function ErrorMessage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return error ? <p className="text-sm text-red-500">{error}</p> : null;
}