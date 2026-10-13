"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import { getSupabase } from "@/lib/supabase/client";
import { Explore } from "@/features/explore/Explore";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const path = usePathname();
  const view = path.split("/")[1] || "explore";
  const toastMsg = useApp((s) => s.toastMsg);
  const toastOn = useApp((s) => s.toastOn);

  // Local state (leads, offers, plan, layout) lives in localStorage — hydrate on the client before first paint.
  useEffect(() => {
    Promise.resolve(useApp.persist.rehydrate()).then(() => {
      setReady(true);
      const { refreshRemote, toast } = useApp.getState();
      refreshRemote().catch(() => toast("Couldn't reach the database — showing sample data"));
      // Deep link from public pages: /explore?open=<id>
      const url = new URL(window.location.href);
      const open = url.searchParams.get("open");
      if (open) {
        useApp.getState().select(open, true);
        url.searchParams.delete("open");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
      const authError = url.searchParams.get("auth_error");
      if (authError) {
        useApp.getState().toast(authError);
        url.searchParams.delete("auth_error");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
    });
    // Sign-in / sign-out in this or another tab reloads members, listings and offers.
    const sub = getSupabase()?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") useApp.getState().refreshRemote().catch(() => {});
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="h-screen bg-bg" />;
  return (
    <div className="app">
      <Rail view={view} />
      <TopBar view={view} />
      <main className="views">
        <Explore active={view === "explore"} />
        {view !== "explore" && children}
      </main>
      <div className={`toast ${toastOn ? "on" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </div>
  );
}
