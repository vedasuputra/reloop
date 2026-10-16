import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Params } from "@/lib/data";

/** Old address: AI Prediction and Recommendation are now one page, /order. */
export default function Old({ searchParams }: { searchParams: Promise<Params> }) {
  return <Suspense fallback={null}><Go searchParams={searchParams} /></Suspense>;
}

async function Go({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]);
  redirect(`/order?${q.toString()}`);
  return null;
}
