import { Suspense } from "react";
import ReportsView from "./ReportsView";

// All public reports on one project. Suspense: the id and paging come from the URL.
export default function ProjectReportsPage() {
  return (
    <Suspense>
      <ReportsView />
    </Suspense>
  );
}
