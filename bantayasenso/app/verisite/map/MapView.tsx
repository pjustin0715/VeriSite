"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import IllustratedMap from "@/components/IllustratedMap";
import StatusLabel, { statuses } from "@/components/StatusLabel";
import { today, useData } from "../data";
import { priorityOf, projectsOf, type Project } from "../store";

// Case- and accent-insensitive, so "dasmarinas" finds "Dasmariñas".
const fold = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const matches = (p: Project, q: string) => [p.name, p.place, p.address].some((t) => fold(t).includes(fold(q)));

const legend: [keyof typeof statuses, string][] = [
  ["lampas", "Lampas"],
  ["malapit", "Malapit na"],
  ["ayon", "Ayon sa plano"],
  ["tapos", "Tapos na"],
];

// Space taken by the search bar and legend on top, and the list button, project card and menu at the bottom.
const inset = { top: "190px", bottom: "calc(max(24px, env(safe-area-inset-bottom)) + 300px)" };

// Map of all projects (W-Map). `?p=<id>` is the selected pin, so coming back from a project keeps it.
export default function MapView() {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");

  const shown = data ? projectsOf(data, today()).filter((p) => matches(p, q)) : [];
  // No pick yet (or the pick is hidden by the search): show the most urgent place.
  const selected = shown.find((p) => p.id === params.get("p")) ?? priorityOf(shown)[0];

  return (
    <main className="relative h-dvh overflow-hidden">
      <IllustratedMap projects={shown} selected={selected?.id} onSelect={(id) => router.replace(`/verisite/map?p=${id}`, { scroll: false })} inset={inset} />

      <div className="pointer-events-none absolute inset-x-3.5 top-[max(50px,env(safe-area-inset-top))] flex flex-col gap-2">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur(); // closes the phone keyboard
          }}
          className="pointer-events-auto flex h-14 items-center gap-2.5 rounded-[18px] bg-white/95 pr-1.5 pl-4 shadow-card"
        >
          <Icon name="search" size={24} color="#1E2B30" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hanapin ang lugar"
            aria-label="Hanapin ang lugar"
            maxLength={60}
            className="h-full min-w-0 grow bg-transparent text-17 font-semibold outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Alisin ang hinahanap" className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-2xl">
              <Icon name="close" size={22} color="#5F6E74" />
            </button>
          )}
        </form>
        <ul aria-label="Kahulugan ng kulay" className="grid grid-cols-2 gap-x-2.5 gap-y-[5px] rounded-2xl bg-white/95 px-[13px] py-[9px] text-14 font-semibold shadow-card">
          {legend.map(([s, label]) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="flex size-[18px] items-center justify-center rounded-full" style={{ background: statuses[s].solid }}>
                <Icon name={statuses[s].icon} size={11} color="#FFFFFF" strokeWidth={3} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute inset-x-3.5 bottom-[calc(max(24px,env(safe-area-inset-bottom))+120px)] flex flex-col items-center gap-3">
        <Link
          href="/verisite/priority"
          className="flex h-[54px] w-[250px] max-w-full items-center justify-center gap-2 rounded-[27px] bg-primary text-17 font-bold text-white no-underline shadow-[0_10px_20px_rgba(20,80,120,.3)]"
        >
          <Icon name="list" size={22} color="#FFFFFF" />
          Tingnan ang listahan
        </Link>
        {selected ? (
          <Card href={`/verisite/project/${selected.id}?from=map`} className="flex min-h-[104px] w-full items-center gap-3 p-2.5">
            <Image src={`/verisite/${selected.image}.png`} alt="" width={192} height={168} loading="eager" className="h-[84px] w-24 flex-none rounded-[14px] object-cover" />
            <span className="min-w-0 grow">
              <span className="block text-19 leading-[1.15] font-bold">{selected.name}</span>
              <span className="mt-1.5 block">
                <StatusLabel status={selected.status} variant="tint" label={selected.status === "lampas" ? `Lampas ${selected.daysLate} araw` : undefined} />
              </span>
            </span>
            <Icon name="next" size={24} color="#5F6E74" />
          </Card>
        ) : (
          data && (
            <Card className="flex min-h-[104px] w-full flex-col items-center justify-center gap-1 p-3 text-center">
              <p role="status" className="text-17 font-bold">
                {q ? `Walang lugar na tugma sa “${q.trim()}”` : "Wala pang proyekto sa mapa"}
              </p>
              {q && (
                <button type="button" onClick={() => setQ("")} className="cursor-pointer text-base font-semibold text-link underline">
                  Alisin ang hinahanap
                </button>
              )}
            </Card>
          )
        )}
      </div>
      <BottomNav active="map" />
    </main>
  );
}
