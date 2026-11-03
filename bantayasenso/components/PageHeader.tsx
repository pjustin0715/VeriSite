import Image from "next/image";
import type { IconName } from "@/components/Icon";
import IconButton from "@/components/IconButton";

// Sky header with an illustration (head-*.png), back button and title, then a rounded sheet holding the page content.
export default function PageHeader({
  image = "head-plain",
  back,
  backIcon = "back",
  title,
  subtitle,
  right,
  children,
}: {
  image?: "head-plain" | "head-happy" | "head-scan" | "head-walk" | "head-worry";
  back?: string;
  backIcon?: IconName; // "close" for screens that leave a flow, e.g. Result
  title: React.ReactNode;
  subtitle?: string;
  right?: React.ReactNode; // e.g. a bookmark IconButton
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Image src={`/verisite/${image}.png`} alt="" width={780} height={552} preload className="absolute inset-x-0 top-0 h-auto w-full" />
      <div className="relative px-5 pt-[max(52px,env(safe-area-inset-top))]">
        <div className="flex min-h-[46px] justify-between">
          {back && <IconButton href={back} icon={backIcon} label={backIcon === "close" ? "Isara" : "Bumalik"} />}
          {right}
        </div>
        <h1 className="mt-2.5 text-[28px] font-bold leading-[1.12] tracking-[-0.5px] [text-shadow:0px_1px_5px_#00000033]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-base leading-[1.3]">{subtitle}</p>}
      </div>
      <section className="relative mt-5 flex flex-col gap-2.5 rounded-t-sheet bg-page px-5 pt-5 pb-[max(34px,env(safe-area-inset-bottom))]">
        {children}
      </section>
    </div>
  );
}
