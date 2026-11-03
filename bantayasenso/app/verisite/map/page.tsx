import { Suspense } from "react";
import MapView from "./MapView";

// Map of projects (W-Map). Suspense: the selected pin comes from the URL.
export default function MapPage() {
  return (
    <Suspense>
      <MapView />
    </Suspense>
  );
}
