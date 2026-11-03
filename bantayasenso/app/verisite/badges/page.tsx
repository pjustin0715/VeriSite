import { Suspense } from "react";
import BadgesView from "./BadgesView";

// Suspense: Back reads where Badges was opened from (`?from=profile`, else Home).
export default function BadgesPage() {
  return (
    <Suspense>
      <BadgesView />
    </Suspense>
  );
}
