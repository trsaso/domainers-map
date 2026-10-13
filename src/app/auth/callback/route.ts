import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

/**
 * X → Supabase → here. Exchanges the one-time code for a session cookie, then sends new members to
 * finish their profile and everyone else back to where they started.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safePath(url.searchParams.get("next"));
  if (!supabaseConfigured || !code) {
    const why = url.searchParams.get("error_description") || "Sign-in was cancelled.";
    return NextResponse.redirect(new URL(`/explore?auth_error=${encodeURIComponent(why)}`, url.origin));
  }
  const jar = await cookies();
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => jar.set(name, value, options)),
    },
  });
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL(`/explore?auth_error=${encodeURIComponent(error?.message ?? "Sign-in failed.")}`, url.origin));
  }
  const { data: profile } = await sb.from("profiles").select("onboarded").eq("id", data.user.id).single();
  return NextResponse.redirect(new URL(profile?.onboarded ? next : "/profile?welcome=1", url.origin));
}

/** Only same-site paths, so the callback can't be used as an open redirect. */
function safePath(p: string | null) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/explore";
}
