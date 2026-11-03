"use client";

import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import PageHeader from "@/components/PageHeader";
import ProjectCard from "@/components/ProjectCard";
import { today, useData } from "../data";
import { projectsOf, userOf } from "../store";

// Projects the user follows (Profile > Sinusundang proyekto). Not in the mockup; uses the Home feed cards.
export default function FollowingPage() {
  const data = useData();
  const user = data && userOf(data, today());
  if (!data || !user) return null;
  const followed = projectsOf(data, today()).filter((p) => user.followed.includes(p.id));

  return (
    <PageHeader back="/verisite/profile" title="Sinusundang proyekto" subtitle={`${followed.length} proyekto`}>
      {!followed.length && (
        <Card className="flex flex-col items-center gap-3 p-5 text-center">
          <p className="text-lg font-bold">Wala ka pang sinusundan</p>
          <p className="text-base text-muted">Pindutin ang bookmark sa isang proyekto para makita ito dito at makakuha ng update.</p>
          <ButtonLink href="/verisite/home">Tingnan ang mga proyekto</ButtonLink>
        </Card>
      )}
      {followed.map((p) => (
        <ProjectCard key={p.id} project={p} from="following" />
      ))}
    </PageHeader>
  );
}
