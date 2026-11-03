"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import SitePin from "@/components/SitePin";
import { statuses } from "@/components/StatusLabel";
import type { Project } from "@/app/verisite/store";

// lng/lat at the edges of zmap.png (skyline cropped off).
// shortcut: a flat drawing with a linear lng/lat box; swap this component for a MapLibre map with the same props
// (projects, selected, onSelect, inset) when real tiles and coordinates are in.
const box = { west: 120.9, east: 120.99, north: 14.36, south: 14.28 };

// Pannable illustrated map with one status pin per project. `inset` = space covered by the screen's top and bottom overlays.
export default function IllustratedMap({
  projects,
  selected,
  onSelect,
  inset,
}: {
  projects: Project[];
  selected?: string;
  onSelect: (id: string) => void;
  inset: { top: string; bottom: string };
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Bring the selected pin into the clear area between the overlays (scroll-padding).
  useEffect(() => {
    const pin = selected && scroller.current?.querySelector(`[data-id="${CSS.escape(selected)}"]`);
    if (!pin) return; // data not loaded yet
    pin.scrollIntoView({ block: "center", inline: "center", behavior: first.current ? "instant" : "smooth" });
    first.current = false;
  }, [selected]);

  return (
    <div
      ref={scroller}
      className="absolute inset-0 isolate overflow-auto overscroll-none bg-[#9ADBA0] [scrollbar-width:none]"
      style={{ scrollPaddingTop: inset.top, scrollPaddingBottom: inset.bottom }}
    >
      <div className="w-[max(470px,100%)]" style={{ paddingBottom: inset.bottom }}>
        <div className="relative aspect-[780/1352] overflow-hidden">
          <Image src="/verisite/zmap.png" alt="Mapa ng Dasmariñas" width={780} height={1688} preload className="absolute bottom-0 h-auto w-full" />
          {projects.map((p) => {
            const x = ((p.lng - box.west) / (box.east - box.west)) * 100;
            const y = ((box.north - p.lat) / (box.north - box.south)) * 100;
            const on = p.id === selected;
            return (
              <button
                key={p.id}
                type="button"
                data-id={p.id}
                onClick={() => onSelect(p.id)}
                aria-pressed={on}
                aria-label={`${p.place}: ${p.reportCount} report, ${statuses[p.status].label}`}
                className={`absolute flex w-[126px] -translate-x-1/2 -translate-y-[23px] cursor-pointer flex-col items-center gap-1 ${on ? "z-[2]" : "z-[1]"}`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <SitePin project={p} ring={on} />
                <span
                  className={`rounded-[9px] px-[9px] py-[3px] text-[14px] font-semibold whitespace-nowrap shadow-[0_3px_7px_rgba(20,60,90,.22)] ${on ? "bg-ink text-white" : "bg-white text-ink"}`}
                >
                  {p.place}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
