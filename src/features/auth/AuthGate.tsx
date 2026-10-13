"use client";

import { supabaseConfigured } from "@/lib/supabase/config";
import type { ProfileRow } from "@/lib/remote";
import { useApp } from "@/store/app-store";
import { PageHead } from "@/features/common/ui";
import { SignInButton } from "./AccountMenu";

/** Renders `children(profile)` for a signed-in member; otherwise explains what's needed. */
export function AuthGate({ kicker, title, sub, children }: { kicker: string; title: string; sub: string; children: (p: ProfileRow) => React.ReactNode }) {
  const session = useApp((s) => s.session);
  const authReady = useApp((s) => s.authReady);
  if (session?.profile) return <>{children(session.profile)}</>;
  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead kicker={kicker} title={title} sub={sub} />
        {!supabaseConfigured ? (
          <div className="empty text-left">Sign-in isn&apos;t set up on this site yet. See SETUP.md in the repository.</div>
        ) : !authReady ? (
          <div className="muted">Checking your sign-in…</div>
        ) : session ? (
          <div className="muted">Your profile is being created — refresh in a moment.</div>
        ) : (
          <SignInButton className="btn primary" />
        )}
      </div>
    </section>
  );
}
