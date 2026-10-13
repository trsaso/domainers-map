"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

let client: SupabaseClient | null = null;

/** Browser client (session kept in cookies so the /auth/callback route can complete sign-in). Null in demo mode. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  return (client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY));
}
