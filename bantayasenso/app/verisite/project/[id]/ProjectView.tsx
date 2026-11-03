"use client";

import Image from "next/image";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon, { type IconName } from "@/components/Icon";
import IconButton from "@/components/IconButton";
import NotFound from "@/components/NotFound";
import ReportRow from "@/components/ReportRow";
import StatusLabel from "@/components/StatusLabel";
import { today, toggleFollow, useData, useDraft } from "../../data";
import { longDate, peso, projectsOf, reportsFor, userOf, type Project } from "../../store";

const summaries: Partial<Record<Project["status"], string>> = {
  lampas: "Lampas na ito sa nakapaskil na petsa. Maaaring may aprubadong dagdag na panahon, kaya tinitingnan pa ng LGU.",
  malapit: "Malapit na ang petsa ng pagtatapos, pero marami pang kailangang gawin.",
  ayon: "Ayon sa plano ang takbo ng proyektong ito.",
  tapos: "Tapos na ang proyektong ito.",
};

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const from = params.get("from");
  const self = `${usePathname()}${params.size ? `?${params}` : ""}`; // this page, for Back on the report pages
  const data = useData();
  const draft = useDraft();
  if (!data) return null;
  const p = projectsOf(data, today()).find((x) => x.id === id);
  if (!p) return <NotFound />;
  // Back returns to the screen that opened this project (Map, LGU detail, account screens), else Home.
  const backs: Record<string, string> = {
    map: `/verisite/map?p=${p.id}`,
    lgu: `/verisite/lgu/${p.id}`,
    reports: "/verisite/my-reports",
    updates: "/verisite/updates",
    following: "/verisite/following",
    priority: "/verisite/priority",
  };
  const back = from && Object.hasOwn(backs, from) ? backs[from] : "/verisite/home";

  const followed = !!userOf(data, today())?.followed.includes(p.id);
  const reports = reportsFor(data, p.id);
  const rows: [IconName, string, string][] = [
    ["peso", "Halaga", peso(p.budget)],
    ["person", "Kontratista", p.contractor],
    ["calendar", "Sinimulan", longDate(p.startDate)],
    ["calendar", "Dapat matapos", longDate(p.targetDate)],
    ["office", "Opisina", p.office],
    ["shield", "Rekord", p.record],
  ];

  return (
    <>
      <div className="relative min-h-[336px] overflow-hidden">
        <Image src={`/verisite/${p.image}.png`} alt="" fill preload sizes="480px" className="object-cover object-bottom" />
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(15,40,60,.62)] via-[rgba(15,40,60,0)] via-38% to-[rgba(15,40,60,.88)] to-92%" />
        <div className="absolute inset-x-5 top-[max(52px,env(safe-area-inset-top))] z-10 flex justify-between">
          <IconButton href={back} icon="back" label="Bumalik" />
          <IconButton onClick={() => toggleFollow(p.id)} pressed={followed} label={followed ? "Huwag nang sundan" : "Sundan ang proyekto"}>
            <Icon name="bookmark" size={23} fill={followed ? "#1C86CC" : "none"} color={followed ? "#1C86CC" : "currentColor"} />
          </IconButton>
        </div>
        <div className="relative z-[1] px-5 pt-[170px] pb-10">
          <StatusLabel status={p.status} variant="soft" label={p.status === "lampas" ? `Lampas ${p.daysLate} araw` : undefined} />
          <h1 className="mt-2 text-[24px] leading-[1.2] font-bold tracking-[-0.4px] text-white break-words">{p.name}</h1>
          <p className="mt-[3px] text-base text-[#DCEBE6] break-words">{p.address}</p>
        </div>
      </div>

      <section className="relative -mt-[30px] flex flex-col gap-3 rounded-t-sheet bg-page px-5 pt-5 pb-[calc(118px+env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          {[
            [`${p.progress}%`, "Natapos"],
            [p.reportCount, "Report"],
            [p.urgency, "Urgency"],
          ].map(([value, label]) => (
            <Card key={label} className="flex-1 px-1 py-2.5 text-center">
              <strong className="block text-19 font-bold text-link">{value}</strong>
              <span className="text-14 text-muted">{label}</span>
            </Card>
          ))}
        </div>

        <div className="rounded-card bg-linear-135 from-[#D9EFFB] to-[#F0F9FE] px-4 py-3.5">
          <strong className="text-17 font-bold">Sa madaling sabi</strong>
          <p className="mt-[3px] text-base leading-[1.4]">{summaries[p.status]}</p>
        </div>

        <Card className="px-4 py-[3px]">
          {rows.map(([icon, label, value]) => (
            <div key={label} className="flex items-center gap-[11px] border-b border-line py-2.5 text-base last:border-0">
              <Icon name={icon} size={20} color="#1C86CC" strokeWidth={2} />
              <span className="text-muted">{label}</span>
              <span className="grow text-right font-semibold">{value}</span>
            </div>
          ))}
        </Card>

        <Card className="px-4 pt-[13px] pb-1">
          <h2 className="text-lg font-bold">{p.reportCount} na report</h2>
          {!reports.length && <p className="py-3 text-base text-muted">Wala pang report na maipapakita.</p>}
          {reports.slice(0, 3).map((r) => (
            <ReportRow key={r.id} report={r} back={self} />
          ))}
        </Card>
        {reports.length > 3 && (
          <ButtonLink href={`/verisite/project/${p.id}/reports?back=${encodeURIComponent(self)}`} variant="white">
            Tingnan lahat ng report ({reports.length})
          </ButtonLink>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[480px] rounded-t-3xl bg-white px-5 pt-3 pb-[max(30px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(20,80,120,.12)]">
        {draft?.ai ? (
          <ButtonLink href="/verisite/result">Magsumite ng report</ButtonLink>
        ) : (
          <ButtonLink href={`/verisite/scan?project=${p.id}`}>I-scan ang lugar na ito</ButtonLink>
        )}
      </div>
    </>
  );
}
