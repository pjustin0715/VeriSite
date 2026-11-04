"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import SitePin from "@/components/SitePin";
import { today, useData } from "../data";
import { displayText, priorityOf, projectsOf, type Project } from "../store";

const handled = { bago: "", tinitingnan: " • Tinitingnan", naaksyunan: " • Tapos" };

// Why the site ranks where it does: the worst open hazard, else lateness, else its reports.
function reason(p: Project) {
  const why = p.score.topHazard ?? (p.daysLate > 0 ? "Lampas sa petsa" : p.reportCount ? `${p.reportCount} report` : "Wala pang report");
  return `${p.score.level} • ${why}${handled[p.siteStatus]}`;
}

// Urgency ranking of sites (W-Priority). Only a ranking to get the LGU's attention, not a promise of action.
export default function PriorityPage() {
  const data = useData();
  const ranked = data ? priorityOf(projectsOf(data, today())) : null;

  return (
    <>
      <PageHeader image="head-scan" back="/verisite/map" title={<span className="text-[26px] whitespace-nowrap">Pinaka-apurahan</span>} subtitle="Mga lugar na kailangan ng agarang pansin">
        <ol className="flex flex-col gap-[9px]">
          {ranked?.slice(0, 100).map((p, i) => (
            <li key={p.id}>
              <Card href={`/verisite/lgu/${p.id}`} className="flex items-center gap-2.5 px-[11px] py-2.5">
                <span className="w-5 flex-none text-center text-19 font-bold text-muted" aria-label={`Ika-${i + 1}`}>
                  {i + 1}
                </span>
                <SitePin project={p} />
                <span className="ml-[5px] min-w-0 grow text-lg leading-[1.15] font-bold">
                  {displayText(p.name)}
                  <span className="mt-0.5 block text-15 font-medium text-muted">{reason(p)}</span>
                </span>
                <Icon name="next" size={22} color="#5F6E74" />
              </Card>
            </li>
          ))}
        </ol>
        {ranked && !ranked.length && <Card className="p-5 text-center text-17 font-semibold">Wala pang lugar na maipapakita.</Card>}
        <p className="px-1 text-14 leading-[1.35] text-muted">
          Nakaayos ayon sa urgency score: dami ng report, panganib na nakita, at araw na lampas sa petsa.
        </p>
        <Link
          href="/verisite/map"
          className="mx-auto mt-2 flex h-[54px] w-[230px] items-center justify-center gap-2 rounded-[27px] bg-primary text-17 font-bold text-white no-underline shadow-[0_10px_20px_rgba(20,80,120,.3)]"
        >
          <Icon name="pin" size={22} color="#FFFFFF" />
          Tingnan sa mapa
        </Link>
      </PageHeader>
      <BottomNav active="map" />
    </>
  );
}
