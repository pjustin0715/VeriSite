"use client";

import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import BadgeIcon from "@/components/BadgeIcon";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import IconButton from "@/components/IconButton";
import NotFound from "@/components/NotFound";
import PageHeader from "@/components/PageHeader";
import StatusLabel from "@/components/StatusLabel";
import { useData } from "../../data";
import { longDate } from "../../store";

// One public report: bigger photo (tap to enlarge), reporter and badge, date, LGU status, issues and the full description.
export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const [zoom, setZoom] = useState(false);
  const data = useData();
  if (!data) return null;
  const r = data.reports.find((x) => x.id === id);
  // `back` is from the URL: only follow it inside VeriSite. Without it, go to the report's project.
  const fallback = r ? `/verisite/project/${r.projectId}` : "/verisite/home";
  const back = params.get("back")?.startsWith("/verisite/") ? params.get("back")! : fallback;
  if (!r)
    return <NotFound back={back} label="Bumalik" title="Hindi nakita ang report" text="Maaaring mali ang link o wala na ang report na ito." />;

  const p = data.projects.find((x) => x.id === r.projectId);
  const photo = { src: r.photo, unoptimized: r.photo.startsWith("data:") };

  return (
    <PageHeader back={back} title="Report" subtitle={p?.name ?? "Wala na ang proyekto"}>
      <button type="button" onClick={() => setZoom(true)} aria-label="Palakihin ang litrato" className="relative block cursor-zoom-in overflow-hidden rounded-card shadow-card">
        <Image {...photo} alt="Litrato ng report" width={900} height={675} className="aspect-[4/3] h-auto w-full object-cover" />
        <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-15 font-semibold text-ink">
          <Icon name="search" size={18} />
          Palakihin
        </span>
      </button>

      <Card className="flex flex-col gap-2 px-4 py-3.5">
        <span className="flex items-center gap-2 text-lg leading-[1.2] font-bold [overflow-wrap:anywhere]">
          {r.user}
          <BadgeIcon badge={r.badge} size={26} />
          <span className="text-base font-semibold text-muted">{r.badge}</span>
        </span>
        <span className="text-base text-muted">{longDate(r.createdAt)}</span>
        <span className="flex flex-wrap items-center gap-2">
          <StatusLabel status={r.status ?? "bago"} />
          {r.confirmed && (
            <span className="inline-flex items-center gap-1 text-15 font-semibold text-[#1E7A50]">
              <Icon name="check" size={17} color="#2E9E6B" strokeWidth={2.8} />
              Kumpirmado
            </span>
          )}
        </span>
      </Card>

      <Card className="px-4 py-3.5">
        <h2 className="text-17 font-bold">Mga nakitang problema</h2>
        <ul className="mt-1.5 flex flex-col gap-2">
          {r.issues.map((issue) => (
            <li key={issue} className="flex items-start gap-2.5 text-base leading-[1.3] font-semibold">
              <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-lg bg-lampas">
                <Icon name="warning" size={15} color="#FFFFFF" strokeWidth={2.4} />
              </span>
              {issue}
            </li>
          ))}
        </ul>
      </Card>

      {r.note.trim() && (
        <Card className="px-4 py-3.5">
          <h2 className="text-17 font-bold">Paglalarawan</h2>
          <p className="mt-1 text-base leading-[1.45] whitespace-pre-line [overflow-wrap:anywhere]">{r.note}</p>
        </Card>
      )}

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Malaking litrato"
          onClick={() => setZoom(false)}
          onKeyDown={(e) => e.key === "Escape" && setZoom(false)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#08141C]"
        >
          <Image {...photo} alt="Litrato ng report, malaki" fill sizes="100vw" className="object-contain" />
          <div className="absolute top-[max(52px,env(safe-area-inset-top))] left-5" onClick={(e) => e.stopPropagation()}>
            <IconButton onClick={() => setZoom(false)} icon="close" label="Isara ang litrato" autoFocus />
          </div>
        </div>
      )}
    </PageHeader>
  );
}
