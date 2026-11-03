import Image from "next/image";
import Link from "next/link";
import BadgeIcon from "@/components/BadgeIcon";
import BottomNav from "@/components/BottomNav";
import Icon from "@/components/Icon";
import IconButton from "@/components/IconButton";
import Logo from "@/components/Logo";
import ProjectCard from "@/components/ProjectCard";
import { projects, user } from "../sample-data";

const chip = "flex h-11 flex-none items-center gap-1 rounded-[22px] px-[15px] text-base font-semibold whitespace-nowrap no-underline shadow-card";

// News feed of all projects (W-Home). Also drawn behind the Filter sheet.
export default function HomePage() {
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

      <div className="-mt-2 flex gap-2 overflow-x-auto px-5 pt-6 pb-3 [scrollbar-width:none]">
        <Link href="/verisite/filter" aria-label="Buksan ang filter" className={`${chip} w-11 justify-center bg-white px-0`}>
          <Icon name="filter" color="#1C86CC" strokeWidth={2} />
        </Link>
        <Link href="/verisite/filter" className={`${chip} bg-primary text-white`}>
          Pinakabago
          <Icon name="chevron" size={17} strokeWidth={2.4} />
        </Link>
        <Link href="/verisite/filter" className={`${chip} bg-white text-ink`}>
          Lahat ng status
          <Icon name="chevron" size={17} strokeWidth={2.4} />
        </Link>
        <Link href="/verisite/filter" className={`${chip} bg-white text-ink`}>
          Kalsada
        </Link>
      </div>

      <div className="flex flex-col gap-3 px-5">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
      <BottomNav active="home" />
    </div>
  );
}
