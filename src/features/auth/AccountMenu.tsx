"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { profilePath } from "@/lib/profile";
import { supabaseConfigured } from "@/lib/supabase/config";
import { useApp, useWorld } from "@/store/app-store";
import { Av } from "@/features/common/ui";
import { signInWithX } from "./signin";

export function XMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8.1-9.3L1 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.3 3.9H5.3L17.7 20Z" />
    </svg>
  );
}

export function SignInButton({ className = "btn sm primary", label = "Sign in with X" }: { className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        if (!(await signInWithX())) {
          useApp.getState().toast("Sign-in isn't set up on this site yet");
          setBusy(false);
        }
      }}
    >
      <XMark /> {busy ? "Opening X…" : label}
    </button>
  );
}

/** Top-bar account control: Sign in with X, or the member's avatar with a small menu. */
export function AccountMenu() {
  const w = useWorld();
  const session = useApp((s) => s.session);
  const authReady = useApp((s) => s.authReady);
  const signOut = useApp((s) => s.signOut);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Demo mode: the sample profile stands in for "you", as in the prototype.
  if (!supabaseConfigured)
    return w.me ? (
      <span className="avatar account" title="Demo profile (sign-in not configured)">
        <Av i={w.me} className="contents" />
      </span>
    ) : null;
  if (!authReady) return <span className="account" />;
  if (!session)
    return (
      <span className="account">
        <SignInButton />
      </span>
    );

  const p = session.profile;
  const who = { label: p?.name ?? "You", avatar: p?.avatar_url ?? undefined };
  return (
    <div className="account menu-wrap" ref={box}>
      <button className="avatar" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} title={p ? `@${p.handle}` : "Account"}>
        <Av i={who} className="contents" />
      </button>
      {open && (
        <div className="menu" role="menu" onClick={() => setOpen(false)}>
          <div className="menu-head">
            <b>{p?.name}</b>
            <span className="muted">@{p?.handle}</span>
          </div>
          <Link role="menuitem" href="/profile">Edit profile</Link>
          <Link role="menuitem" href="/my-domains">My domains</Link>
          {p && (
            <a role="menuitem" href={profilePath({ id: p.id, xHandle: p.handle })} target="_blank" rel="noopener">
              Public page ↗
            </a>
          )}
          <button role="menuitem" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
