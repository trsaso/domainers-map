import { Suspense } from "react";
import { ProfileView } from "@/features/views/ProfileView";

export default function Page() {
  return (
    <Suspense>
      <ProfileView />
    </Suspense>
  );
}
