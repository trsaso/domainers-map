"use client";

import { X_PROVIDER } from "@/lib/supabase/config";
import { getSupabase } from "@/lib/supabase/client";

/** Start Sign in with X; returns to `next` (same-site path) afterwards. */
export async function signInWithX(next = window.location.pathname) {
  const sb = getSupabase();
  if (!sb) return false;
  await sb.auth.signInWithOAuth({
    provider: X_PROVIDER,
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  return true;
}
