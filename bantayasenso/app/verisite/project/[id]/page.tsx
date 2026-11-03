import { Suspense } from "react";
import ProjectView from "./ProjectView";

// Project details (W-Project). Suspense: the id comes from the URL.
export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectView />
    </Suspense>
  );
}
