import Link from "next/link";
import Icon from "@/components/Icon";

// Fixed 3-item menu (Simula, Scan, Mapa). Put it last in the page; its spacer keeps content from hiding under it.
export default function BottomNav({ active }: { active: "home" | "map" }) {
  const item = (on: boolean) =>
    `flex flex-col items-center justify-center gap-px text-[15px] no-underline ${on ? "font-bold text-link" : "font-semibold text-muted"}`;
  return (
    <>
      <div aria-hidden="true" className="h-[calc(122px+env(safe-area-inset-bottom))] flex-none" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[480px] px-3.5 pb-[max(24px,env(safe-area-inset-bottom))]">
        <nav
          aria-label="Pangunahing menu"
          className="pointer-events-auto grid h-[74px] grid-cols-[1fr_104px_1fr] rounded-[26px] bg-white/95 shadow-[0_2px_4px_rgba(20,80,120,.08),0_18px_34px_rgba(20,80,120,.2)] backdrop-blur-[14px]"
        >
          <Link href="/verisite/home" className={item(active === "home")} aria-current={active === "home" ? "page" : undefined}>
            <Icon name="home" size={25} color={active === "home" ? "#1C86CC" : "#5F6E74"} />
            Simula
          </Link>
          <Link href="/verisite/scan" className="relative flex items-end justify-center pb-2 text-[15px] font-bold text-ink no-underline">
            <span className="absolute -top-7 left-[19px] flex size-[66px] items-center justify-center rounded-3xl border-4 border-white bg-yellow shadow-[0_10px_18px_rgba(226,165,24,.35)]">
              <Icon name="scan" size={30} color="#1E2B30" strokeWidth={2.3} />
            </span>
            Scan
          </Link>
          <Link href="/verisite/map" className={item(active === "map")} aria-current={active === "map" ? "page" : undefined}>
            <Icon name="pin" size={25} color={active === "map" ? "#1C86CC" : "#5F6E74"} />
            Mapa
          </Link>
        </nav>
      </div>
    </>
  );
}
