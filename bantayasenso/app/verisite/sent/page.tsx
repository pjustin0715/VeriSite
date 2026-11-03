import { Suspense } from "react";
import SentView from "./SentView";

// Suspense: the report id comes from the URL.
export default function SentPage() {
  return (
    <Suspense>
      <SentView />
    </Suspense>
  );
}
