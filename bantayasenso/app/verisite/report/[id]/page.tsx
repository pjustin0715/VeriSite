import { Suspense } from "react";
import ReportView from "./ReportView";

// One public report. Suspense: the id and Back come from the URL.
export default function ReportPage() {
  return (
    <Suspense>
      <ReportView />
    </Suspense>
  );
}
