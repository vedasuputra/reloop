import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Log in" };

/**
 * Login lives in a popup on the landing page; old links and the auth redirect land here and open it.
 * Someone who is already logged in has nothing to log in to, so they go straight to the Dashboard.
 */
export default function LoginPage() {
  return <Suspense fallback={null}><Go /></Suspense>;
}

async function Go() {
  await connection();
  const { data: { user } } = await (await createClient()).auth.getUser();
  redirect(user ? "/dashboard" : "/?login=1");
  return null;
}
