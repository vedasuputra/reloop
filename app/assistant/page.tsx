import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import Controls from "@/components/Controls";
import AssistantChat from "@/components/AssistantChat";
import { getOrgs, getCostSettings, DEMO_ORG } from "@/lib/context";
import { readSettings, type Params } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default function Assistant({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgs = await getOrgs();
  const orgId = orgs.some((o) => o.id === sp.org) ? sp.org! : (orgs[0]?.id ?? DEMO_ORG);
  const custom = await getCostSettings(orgId);
  const { method, presetKey } = readSettings(sp, custom);
  const qs = `?method=${method}&preset=${presetKey}&org=${orgId}`;

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-1">Asisten AI</h1>
      <p className="text-sm text-gray-500 mb-3">
        Tanya dalam bahasa Indonesia, Inggris, atau Vietnam. Semua angka dihitung oleh ReLoop; AI hanya menjelaskannya.
      </p>
      <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={custom !== null} action="/assistant" />
      <div className="mt-4">
        {/* key resets the chat when the data set or settings change */}
        <AssistantChat key={qs} org={orgId} preset={presetKey} method={method} />
      </div>
    </>
  );
}
