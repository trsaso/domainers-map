/** Public Supabase settings (safe to ship to the browser; Row Level Security protects the data). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** Without these the app runs in demo mode on the sample data, with no sign-in. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** Supabase's X provider: "twitter" (OAuth 1.0a, default) or "x" (OAuth 2.0) — must match what's enabled in Supabase Auth. */
export const X_PROVIDER = (process.env.NEXT_PUBLIC_SUPABASE_X_PROVIDER || "twitter") as "twitter" | "x";
