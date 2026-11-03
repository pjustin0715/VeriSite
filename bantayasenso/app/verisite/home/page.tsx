import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import BadgeIcon from "@/components/BadgeIcon";
import BottomNav from "@/components/BottomNav";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import IconButton from "@/components/IconButton";
import Logo from "@/components/Logo";
import ProjectCard from "@/components/ProjectCard";
import { applyFilters, parseFilters, sorts, statuses, toQuery, types, type Filters } from "../filters";
import { projects, user } from "../sample-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const chip = "flex h-11 flex-none items-center gap-1 rounded-[22px] px-[15px] text-base font-semibold whitespace-nowrap no-underline shadow-card";
const chipColor = (on: boolean) => (on ? "bg-primary text-white" : "bg-white text-ink");

function statusLabel(f: Filters) {
  if (!f.status.length) return "Lahat ng status";
  return f.status.length === 1 ? statuses[f.status[0]] : `${f.status.length} status`;
}

// Chips and cards read the filters from the URL, so they render at request time inside <Suspense>.
async function Feed({ searchParams }: { searchParams: SearchParams }) {
  const f = parseFilters(await searchParams);
  const q = toQuery(f);
  const shown = applyFilters(projects, f);
  const active = f.status.length + f.type.length + (f.near ? 1 : 0);
  const toggleType = (t: Filters["type"][number]) =>
    `/verisite/home?${toQuery({ ...f, type: f.type.includes(t) ? f.type.filter((x) => x !== t) : [...f.type, t] })}`;

  return (
    <>
      <div className="-mt-2 flex gap-2 overflow-x-auto px-5 pt-6 pb-3 [scrollbar-width:none]">
        <Link
          href={`/verisite/filter?${q}`}
          aria-label={active ? `Buksan ang filter, ${active} ang napili` : "Buksan ang filter"}
          className={`${chip} relative w-11 justify-center px-0 ${chipColor(active > 0)}`}
        >
          <Icon name="filter" color={active ? "#FFFFFF" : "#1C86CC"} strokeWidth={2} />
          {active > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-lampas text-[13px] font-bold text-white">
              {active}
            </span>
          )}
        </Link>
        <Link href={`/verisite/filter?${q}&show=sort`} className={`${chip} ${chipColor(f.sort !== "bago")}`}>
          {sorts[f.sort]}
          <Icon name="chevron" size={17} strokeWidth={2.4} />
        </Link>
        <Link href={`/verisite/filter?${q}&show=status`} className={`${chip} ${chipColor(f.status.length > 0)}`}>
          {statusLabel(f)}
          <Icon name="chevron" size={17} strokeWidth={2.4} />
        </Link>
        {/* One tap turns a project type on or off. */}
        {(Object.keys(types) as Filters["type"]).map((t) => (
          <Link key={t} href={toggleType(t)} scroll={false} className={`${chip} ${chipColor(f.type.includes(t))}`}>
            {f.type.includes(t) && <Icon name="check" size={17} strokeWidth={2.6} />}
            {types[t]}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-5">
        {shown.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {!shown.length && (
          <Card className="flex flex-col items-center gap-2 p-5 text-center">
            <p className="text-[17px] font-semibold">Walang proyektong tugma sa napili mo.</p>
            <Link href="/verisite/home" className="text-base font-bold text-link no-underline">
              Alisin ang lahat ng filter
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}

// News feed of all projects (W-Home). Also drawn behind the Filter sheet.
export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="grow bg-linear-to-b from-soft to-[#F7FBFE] to-[240px]">
      <div className="rounded-b-sheet bg-linear-160 from-[#57B5EE] to-[#A8DEF8] px-5 pt-[max(50px,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="grow" />
          <Link
            href="/verisite/badges"
            aria-label={`${user.streak} araw na streak`}
            className="flex h-[46px] items-center gap-[3px] rounded-2xl bg-white px-3 text-lg font-bold text-ink no-underline shadow-[0_6px_14px_rgba(20,80,120,.18)]"
          >
            <Icon name="flame" color="#E8681C" strokeWidth={2.3} />
            {user.streak}
          </Link>
          <IconButton href="/verisite/updates" icon="bell" label="Mga update">
            {user.newUpdates > 0 && <span className="absolute top-[9px] right-2.5 size-[9px] rounded-full bg-lampas" />}
          </IconButton>
          <IconButton href="/verisite/profile" label="Aking account">
            <BadgeIcon badge={user.badge} />
          </IconButton>
        </div>

        <Link
          href="/verisite/scan"
          className="relative mt-2 block h-[130px] overflow-hidden rounded-[22px] no-underline shadow-[0_0_0_2px_#FFFFFF,0_12px_22px_rgba(20,80,120,.25)]"
        >
          <Image src="/verisite/banner.png" alt="" width={700} height={300} preload className="absolute bottom-0 left-0 h-auto w-full" />
          <span className="absolute top-4 left-4 w-[190px] text-xl leading-[1.12] font-bold text-ink">
            <span className="[text-shadow:0px_1px_5px_#00000033]">Isang scan pa, {user.username}!</span>
            <span className="mt-1 block text-[15px] leading-[1.2] font-medium">{user.streak} araw na streak</span>
          </span>
        </Link>
      </div>

      <Suspense>
        <Feed searchParams={searchParams} />
      </Suspense>
      <BottomNav active="home" />
    </div>
  );
}
