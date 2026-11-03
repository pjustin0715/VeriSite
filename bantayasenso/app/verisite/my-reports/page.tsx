"use client";

import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import StatusLabel from "@/components/StatusLabel";
import { today, useData } from "../data";
import { shortDate, statusOrder, userOf, type Report } from "../store";

const steps = [
  ["bago", "Natanggap"],
  ["tinitingnan", "Tinitingnan ng LGU"],
  ["naaksyunan", "Naaksyunan"],
] as const;

function Timeline({ report: r }: { report: Report }) {
  const at = statusOrder.indexOf(r.status ?? "bago");
  return (
    <ol className="mt-2.5 flex flex-col" aria-label="Takbo ng report">
      {steps.map(([status, label], i) => {
        const done = i <= at;
        const when = status === "bago" ? r.createdAt : r.statusAt?.[status];
        return (
          <li key={status} className="relative flex items-center gap-3 pb-3 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-line" />}
            <span className={`flex size-7 flex-none items-center justify-center rounded-full ${done ? "bg-ayon" : "bg-soft"}`}>
              {done && <Icon name="check" size={16} color="#FFFFFF" strokeWidth={3} />}
            </span>
            <span className="text-base font-bold">
              {label}
              <span className="font-semibold text-muted"> • {done ? (when ? shortDate(when) : "Tapos") : "Hinihintay"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// The logged-in user's own reports, newest first, with the LGU's handling of each (W-MyReports).
export default function MyReportsPage() {
  const data = useData();
  const user = data && userOf(data, today());
  if (!data || !user) return null;
  const mine = data.reports.filter((r) => r.user === user.username).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <PageHeader back="/verisite/profile" title="Aking mga report" subtitle={`${mine.length} report`}>
      {!mine.length && (
        <Card className="flex flex-col items-center gap-3 p-5 text-center">
          <p className="text-lg font-bold">Wala ka pang report</p>
          <p className="text-base text-muted">I-scan ang paskil o ang lugar ng proyekto para makapag-report.</p>
          <ButtonLink href="/verisite/scan">Mag-scan</ButtonLink>
        </Card>
      )}
      {mine.map((r) => {
        const p = data.projects.find((x) => x.id === r.projectId);
        const issue = r.issues[0]?.replace(/^Mali sa paskil: .*/, "Mali sa paskil") ?? "Report";
        const more = r.issues.length > 1 ? ` +${r.issues.length - 1}` : "";
        return (
          <Card key={r.id} href={p && `/verisite/project/${p.id}?from=reports`} className="px-4 py-3.5">
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <strong className="block text-xl leading-[1.2] font-bold">{p?.place ?? "Wala na ang proyekto"}</strong>
                <span className="block text-base font-semibold text-muted">
                  {issue}
                  {more} • {shortDate(r.createdAt)}
                </span>
              </span>
              <StatusLabel status={r.status ?? "bago"} />
            </span>
            <Timeline report={r} />
          </Card>
        );
      })}
    </PageHeader>
  );
}
