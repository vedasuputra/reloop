import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const APP_SCREENS = [
  "/dashboard", "/orders", "/order", "/simulator", "/recovery", "/report", "/model", "/pilot",
  "/upload", "/settings", "/integration", "/score", "/export", "/prediction", "/recommendation",
];

export async function proxy(request: NextRequest) {
  // The scoring API is public and stateless; everything else needs a login.
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  // The screens of the app need a login. Everything else is left alone: the landing page, login and privacy are public, and an
  // address that does not exist reaches the 404 page, which a visitor who is not logged in must be able to see too.
  const path = request.nextUrl.pathname;
  const isAppScreen = APP_SCREENS.some((s) => path === s || path.startsWith(s + "/"));
  if (!user && isAppScreen) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|template_orders.csv|contoh_latih_ulang.csv|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
