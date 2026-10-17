"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { accountMissing, checkEmail, emailMessage } from "@/lib/subscription";

/** State of the login popup: an error message to show inside it, or nothing. */
export type AuthState = { error?: string } | null;

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { t } = await getT();
  // B2B: only business emails of subscribed organisations get in (only the domain is checked)
  const email = String(formData.get("email") ?? "").trim();
  const check = checkEmail(email);
  if (!check.ok) return { error: emailMessage(t, check.reason, "login") };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password")),
  });
  // Supabase answers the same way for an unknown email and a wrong password (it does not say which), so this is the default warning
  if (error) return { error: accountMissing(t) };
  redirect("/dashboard");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { t } = await getT();
  const email = String(formData.get("email") ?? "").trim();
  const check = checkEmail(email);
  if (!check.ok) return { error: emailMessage(t, check.reason, "signup") };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: String(formData.get("password")),
  });
  if (error) {
    // Supabase messages are English; give a friendly Vietnamese version for the common ones.
    const m = error.message.toLowerCase();
    const msg = m.includes("already") ? t("This email is already registered. Log in instead.", "Email này đã được đăng ký. Hãy đăng nhập.")
      : m.includes("password") ? t("The password must be at least 6 characters.", "Mật khẩu phải có ít nhất 6 ký tự.")
      : t(`Sign-up failed: ${error.message}`, `Đăng ký không thành công: ${error.message}`);
    return { error: msg };
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
