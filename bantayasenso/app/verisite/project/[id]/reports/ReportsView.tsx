"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import NotFound from "@/components/NotFound";
import PageHeader from "@/components/PageHeader";
import ReportRow from "@/components/ReportRow";
import { today, useData } from "../../../data";
import { displayText, projectsOf, reportsFor } from "../../../store";

const PAGE = 10;

// Every public report on a project, in the Project page's order (higher badge first, then newest), 10 at a time.
// `?n=` is how many are shown, so coming back from a report keeps the list as long as it was.
export default function ReportsView() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const self = `${usePathname()}?${params}`;
  const data = useData();
  const project = `/verisite/project/${id}`;
  // `back` is from the URL: only follow it inside VeriSite.
  const back = params.get("back")?.startsWith("/verisite/") ? params.get("back")! : project;
  if (!data) return null;
  const p = projectsOf(data, today()).find((x) => x.id === id);
  if (!p) return <NotFound />;

  const reports = reportsFor(data, p.id);
  const n = Math.max(PAGE, Math.floor(Number(params.get("n"))) || PAGE);
  const more = new URLSearchParams(params);
  more.set("n", String(n + PAGE));

  return (
    <PageHeader back={back} title="Lahat ng report" subtitle={`${displayText(p.name)} • ${reports.length} report`}>
      {reports.length ? (
        <Card className="px-4 py-1">
          {reports.slice(0, n).map((r) => (
            <ReportRow key={r.id} report={r} back={self} />
          ))}
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-5 text-center">
          <p className="text-lg font-bold">Wala pang report dito</p>
          <p className="text-base text-muted">Ikaw ang unang mag-report. I-scan ang paskil o ang lugar ng proyekto.</p>
          <ButtonLink href={`/verisite/scan?project=${p.id}`}>I-scan ang lugar na ito</ButtonLink>
        </Card>
      )}
      {n < reports.length && (
        <Link
          href={`?${more}`}
          replace
          scroll={false}
          className="flex h-[60px] items-center justify-center rounded-[18px] bg-white text-lg font-bold text-ink no-underline shadow-card"
        >
          Ipakita pa
        </Link>
      )}
      {reports.length > PAGE && n >= reports.length && <p className="text-center text-base text-muted">Nakita mo na ang lahat ng report.</p>}
    </PageHeader>
  );
}
