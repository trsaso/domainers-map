import { Suspense } from "react";
import { MyDomainsView } from "@/features/views/MyDomainsView";

export default function Page() {
  return (
    <Suspense>
      <MyDomainsView />
    </Suspense>
  );
}
