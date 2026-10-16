"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";

export async function login(formData: FormData) {
  const { t } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect("/login?error=" + encodeURIComponent(t("Wrong email or password.", "Email hoặc mật khẩu không đúng.")));
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const { t } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) {
    // Supabase messages are English; give a friendly Vietnamese version for the common ones.
    const m = error.message.toLowerCase();
    const msg = m.includes("already") ? t("This email is already registered. Log in instead.", "Email này đã được đăng ký. Hãy đăng nhập.")
      : m.includes("password") ? t("The password must be at least 6 characters.", "Mật khẩu phải có ít nhất 6 ký tự.")
      : t(`Sign-up failed: ${error.message}`, `Đăng ký không thành công: ${error.message}`);
    redirect("/login?error=" + encodeURIComponent(msg));
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
