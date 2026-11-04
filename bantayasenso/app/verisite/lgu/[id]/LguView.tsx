"use client";

import { useParams } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import NotFound from "@/components/NotFound";
import PageHeader from "@/components/PageHeader";
import { confirmSite, setStatus, today, useData } from "../../data";
import { displayText, projectsOf, reportsFor, type Project, type Report, type ReportStatus } from "../../store";

const choices: [ReportStatus, string][] = [
  ["bago", "Bago"],
  ["tinitingnan", "Tinitingnan"],
  ["naaksyunan", "Tapos"],
];

// shortcut: summary written from the saved reports; replace with a Gemini summary (grouping and removing duplicates) later.
function summary(p: Project, reports: Report[]) {
  if (!reports.length) return "Wala pang report na naipadala sa app para sa lugar na ito.";
  const counts = new Map<string, number>();
  for (const r of reports) for (const i of r.issues) {
    const key = i.startsWith("Mali sa paskil") ? "maling paskil" : i.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [top, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
  const confirmed = reports.length - p.unconfirmed;
  return `${reports.length} na report ang nandito. ${n} ang tungkol sa ${top}. ${confirmed ? `${confirmed} ang kumpirmado na.` : "Wala pang kumpirmado."}`;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-15 font-semibold">
        <span>{label}</span>
        <span className="text-muted">
          {value}/{max}
        </span>
      </div>
      <div className="mt-[5px] h-[9px] rounded-[5px] bg-track" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemax={max}>
        <div className="h-[9px] rounded-[5px] bg-primary" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

// One site's urgency and the LGU's handling of its reports (W-LGUDetail).
// shortcut: anyone can open this screen and change statuses; limit it to LGU accounts once login exists.
export default function LguView() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  if (!data) return null;
  const p = projectsOf(data, today()).find((x) => x.id === id);
  if (!p) return <NotFound back="/verisite/priority" label="Bumalik sa listahan" />;

  const reports = reportsFor(data, p.id);
  const { score } = p;
  const ring = 2 * Math.PI * 34;

  return (
    <PageHeader back="/verisite/priority" title={displayText(p.name)} subtitle={`${displayText(p.address.split(",")[0])} • ${p.reportCount} report`}>
      <section className="flex items-center gap-3.5 rounded-[22px] bg-linear-135 from-primary to-[#4FB2EC] px-4 py-3 text-white shadow-[0_12px_24px_rgba(20,100,160,.28)]">
        <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`Urgency ${score.total} sa 100`} className="flex-none">
          <circle cx="42" cy="42" r="34" fill="none" stroke="#FFFFFF" strokeOpacity=".25" strokeWidth="9" />
          <circle cx="42" cy="42" r="34" fill="none" stroke="#F6C744" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(score.total / 100) * ring} ${ring}`} transform="rotate(-90 42 42)" />
          <text x="42" y="51" textAnchor="middle" fill="#FFFFFF" fontSize="26" fontWeight="700">
            {score.total}
          </text>
        </svg>
        <span className="text-xl leading-[1.2] font-bold">
          {score.level} ang urgency
          <span className="mt-0.5 block text-15 font-medium">Tulong ng AI, tao ang magpapasya</span>
        </span>
      </section>

      <Card className="flex flex-col gap-2.5 px-4 py-3.5">
        <h2 className="text-17 font-bold">Bakit {score.level.toLowerCase()}?</h2>
        <Bar label={`Dami ng report: ${p.reportCount}`} value={score.reports} max={45} />
        <Bar label={`Panganib: ${score.topHazard?.toLowerCase() ?? "walang nakita"}`} value={score.hazard} max={35} />
        <Bar label={p.daysLate > 0 ? `Lampas: ${p.daysLate} araw` : "Hindi pa lampas sa petsa"} value={score.late} max={20} />
      </Card>

      <Card className="px-4 py-3">
        <h2 className="text-17 font-bold">Buod ng AI</h2>
        <p className="mt-[3px] text-base leading-[1.35]">{summary(p, reports)}</p>
      </Card>

      <div role="radiogroup" aria-label="Status ng mga report" className="grid grid-cols-3 gap-1.5 rounded-card bg-white p-2 shadow-card">
        {choices.map(([value, label]) => {
          const on = reports.length > 0 && p.siteStatus === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!reports.length}
              onClick={() => setStatus(p.id, value)}
              className={`h-11 cursor-pointer rounded-[13px] text-15 font-semibold disabled:cursor-not-allowed disabled:text-muted ${on ? "bg-primary text-white" : "text-ink"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {p.unconfirmed > 0 ? (
        <ButtonLink onClick={() => confirmSite(p.id)}>{p.unconfirmed === 1 ? "Kumpirmahin ang report" : `Kumpirmahin ang ${p.unconfirmed} report`}</ButtonLink>
      ) : (
        <p role="status" className="flex h-[60px] items-center justify-center gap-2 rounded-[18px] bg-soft text-lg font-bold">
          {reports.length ? (
            <>
              <Icon name="check" color="#2E9E6B" strokeWidth={2.6} />
              Nakumpirma na ang mga report
            </>
          ) : (
            <span className="text-muted">Wala pang report na kukumpirmahin</span>
          )}
        </p>
      )}
      <ButtonLink href={`/verisite/project/${p.id}?from=lgu`} variant="white">
        Tingnan ang proyekto
      </ButtonLink>
    </PageHeader>
  );
}
