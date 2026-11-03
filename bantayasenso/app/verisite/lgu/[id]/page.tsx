import { Suspense } from "react";
import LguView from "./LguView";

// One site on the priority list (W-LGUDetail). Suspense: the id comes from the URL.
export default function LguPage() {
  return (
    <Suspense>
      <LguView />
    </Suspense>
  );
}
