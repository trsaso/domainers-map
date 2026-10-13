"use client";

import { useApp, useWorld } from "@/store/app-store";
import { Seg } from "@/features/common/ui";
import { VIEWS, type View } from "@/features/common/nav";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { supabaseConfigured } from "@/lib/supabase/config";

export function TopBar({ view }: { view: string }) {
  const w = useWorld();
  const layout = useApp((s) => s.layout);
  const drawer = useApp((s) => s.drawer);
  const set = useApp((s) => s.set);
  const n = w.people.length;
  return (
    <header className="top">
      <div className="kicker" style={{ fontSize: 11 }}>
        {VIEWS[view as View] ?? view}
      </div>
      <div className="proto">
        <label>
          <span>Layout</span>
          <Seg value={layout} label="Layout" onChange={(v) => set("layout", v)} options={[["sidebar", "Sidebar"], ["floating", "Floating"], ["split", "Split"]]} />
        </label>
        <label>
          <span>Drawer</span>
          <Seg value={drawer} label="Drawer" onChange={(v) => set("drawer", v)} options={[["side", "Side"], ["card", "Card"], ["sheet", "Sheet"]]} />
        </label>
        <div className="live" title={supabaseConfigured ? "Members on the map" : "Sample counters"}>
          <i />
          <span>
            {3 + Math.floor(n / 8)} online · {n} members
          </span>
        </div>
      </div>
      <AccountMenu />
    </header>
  );
}
