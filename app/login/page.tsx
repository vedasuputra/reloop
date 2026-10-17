import { redirect } from "next/navigation";

export const metadata = { title: "Log in" };

/** Login lives in a popup on the landing page; old links and the auth redirect land here and open it. */
export default function LoginPage() {
  redirect("/?login=1");
}
