import { Suspense } from "react";
import HomeView from "./HomeView";

// News feed of all projects (W-Home). Also drawn behind the Filter sheet.
// Suspense: the feed reads the filters from the URL.
export default function HomePage() {
  return (
    <Suspense>
      <HomeView />
    </Suspense>
  );
}
