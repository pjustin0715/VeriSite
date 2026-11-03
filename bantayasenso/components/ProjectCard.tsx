import Image from "next/image";
import Card from "@/components/Card";
import StatusLabel from "@/components/StatusLabel";
import { shortDate, type Project } from "@/app/verisite/store";

// News-feed card: illustration with status and name, then a progress bar and report count.
// `from` tells the project's Back button where to return (see ProjectView).
export default function ProjectCard({ project: p, from }: { project: Project; from?: string }) {
  return (
    <Card href={`/verisite/project/${p.id}${from ? `?from=${from}` : ""}`}>
      <span className="relative block h-[136px] overflow-hidden">
        <Image src={`/verisite/${p.image}.png`} alt="" width={800} height={440} className="-mt-11 h-auto w-full" />
        <span className="absolute inset-x-0 bottom-0 h-[90px] bg-linear-to-b from-[rgba(15,40,60,0)] to-[rgba(15,40,60,.78)]" />
        <span className="absolute top-2.5 left-2.5">
          <StatusLabel status={p.status} variant="soft" />
        </span>
        <span className="absolute inset-x-3.5 bottom-[9px] text-xl leading-[1.1] font-bold tracking-[-0.2px] text-white">
          {p.name}
          <span className="mt-0.5 block text-[15px] font-medium text-[#DCEBE6]">
            {p.place} • {shortDate(p.postedAt)}
          </span>
        </span>
      </span>
      <span className="flex h-11 items-center gap-[9px] px-3.5 text-[15px] font-semibold">
        <span className="h-2 grow rounded bg-track" role="progressbar" aria-valuenow={p.progress} aria-label="Natapos">
          <span className="block h-2 rounded bg-primary" style={{ width: `${p.progress}%` }} />
        </span>
        {p.progress}%<span className="text-muted">•</span>
        {p.reportCount} report
      </span>
    </Card>
  );
}
