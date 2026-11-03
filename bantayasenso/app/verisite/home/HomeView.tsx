"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BadgeIcon from "@/components/BadgeIcon";
import BottomNav from "@/components/BottomNav";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import IconButton from "@/components/IconButton";
import Logo from "@/components/Logo";
import ProjectCard from "@/components/ProjectCard";
import { today, useData } from "../data";
import { applyFilters, noFilters, parseFilters, sorts, toQuery, type Filters } from "../filters";
import { projectsOf, userOf } from "../store";
import SortMenu from "./SortMenu";

const control = "flex h-11 items-center gap-1.5 rounded-[22px] px-[15px] text-base font-semibold whitespace-nowrap no-underline shadow-card";

export default function HomeView() {
  const data = useData();
  const params = useSearchParams();
  const f = parseFilters(Object.fromEntries([...params.keys()].map((k) => [k, params.getAll(k)])));
  const user = data && userOf(data, today());
  const shown = data ? applyFilters(projectsOf(data, today()), f) : null;
  const active = f.status.length + f.type.length + (f.near ? 1 : 0);
  // Sort is not a filter: clearing filters keeps it.
  const cleared = `/verisite/home?${toQuery({ ...noFilters, sort: f.sort })}`;

  return (
    <div className="grow bg-linear-to-b from-soft to-[#F7FBFE] to-[240px]">
      <div className="rounded-b-sheet bg-linear-160 from-[#57B5EE] to-[#A8DEF8] px-5 pt-[max(50px,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="grow" />
          <Link
            href="/verisite/badges"
            aria-label={`${user?.streak ?? 0} araw na streak`}
            className="flex h-[46px] min-w-[60px] items-center gap-[3px] rounded-2xl bg-white px-3 text-lg font-bold text-ink no-underline shadow-[0_6px_14px_rgba(20,80,120,.18)]"
          >
            <Icon name="flame" color="#E8681C" strokeWidth={2.3} />
            {user?.streak}
          </Link>
          <IconButton href="/verisite/updates" icon="bell" label={user?.unread ? `Mga update, ${user.unread} bago` : "Mga update"}>
            {!!user?.unread && (
              <span className="absolute -top-1.5 -right-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-lampas px-1 text-[14px] font-bold text-white">
                {user.unread > 9 ? "9+" : user.unread}
              </span>
            )}
          </IconButton>
          <IconButton href="/verisite/profile" label="Aking account">
            {user?.badge && <BadgeIcon badge={user.badge} />}
          </IconButton>
        </div>

        <Link
          href="/verisite/scan"
          className="relative mt-2 block h-[130px] overflow-hidden rounded-[22px] no-underline shadow-[0_0_0_2px_#FFFFFF,0_12px_22px_rgba(20,80,120,.25)]"
        >
          <Image src="/verisite/banner.png" alt="" width={700} height={300} preload className="absolute bottom-0 left-0 h-auto w-full" />
          {user && (
            <span className="absolute top-4 left-4 w-[190px] text-xl leading-[1.12] font-bold text-ink">
              <span className="[text-shadow:0px_1px_5px_#00000033]">Isang scan pa, {user.username}!</span>
              <span className="mt-1 block text-[15px] leading-[1.2] font-medium">
                {user.streak ? `${user.streak} araw na streak` : "Mag-report para magsimula ng streak"}
              </span>
            </span>
          )}
        </Link>
      </div>

      <div className="-mt-2 flex items-center justify-between gap-2 px-5 pt-6 pb-3">
        <Link
          href={`/verisite/filter?${toQuery(f)}`}
          aria-label={active ? `Filter, ${active} ang napili` : "Filter"}
          className={`${control} relative ${active ? "bg-primary text-white" : "bg-white text-ink"}`}
        >
          <Icon name="filter" color={active ? "#FFFFFF" : "#1C86CC"} strokeWidth={2} />
          Filter
          {active > 0 && (
            <span className="flex size-[22px] items-center justify-center rounded-full bg-white text-[14px] font-bold text-link">{active}</span>
          )}
        </Link>
        <SortMenu
          label={sorts[f.sort]}
          options={(Object.keys(sorts) as Filters["sort"][]).map((s) => ({
            label: sorts[s],
            href: `/verisite/home?${toQuery({ ...f, sort: s })}`,
            on: s === f.sort,
          }))}
        />
      </div>

      <div className="flex flex-col gap-3 px-5">
        {shown?.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {shown && !shown.length && (
          <Card className="flex flex-col items-center gap-3 p-5 text-center">
            <p className="text-[17px] font-semibold">Walang proyektong tugma</p>
            <ButtonLink href={cleared}>Alisin lahat</ButtonLink>
          </Card>
        )}
      </div>
      <BottomNav active="home" />
    </div>
  );
}
