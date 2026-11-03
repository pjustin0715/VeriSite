import Image from "next/image";
import type { IconName } from "@/components/Icon";
import IconButton from "@/components/IconButton";

// Where the sheet starts, as a % of screen width: the mascot's feet in each 780x552 picture (the sheet top in the mockup for head-plain).
const feet = { "head-plain": 47.7, "head-happy": 52.6, "head-scan": 54.9, "head-walk": 54.9, "head-worry": 54.1 };
const imageHeight = (552 / 780) * 100; // % of screen width

// Sky header with an illustration (head-*.png), back button and title, then a rounded sheet holding the page content.
// The picture is pinned to the sheet's top edge, so the mascot always stands on the sheet: a taller header (long title,
// large text, narrow phone) moves the picture down instead of letting the sheet cover the mascot's legs.
export default function PageHeader({
  image = "head-plain",
  back,
  backIcon = "back",
  title,
  subtitle,
  right,
  children,
}: {
  image?: keyof typeof feet;
  back?: string;
  backIcon?: IconName; // "close" for screens that leave a flow, e.g. Result
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode; // e.g. a bookmark IconButton
  children: React.ReactNode;
}) {
  const mascot = image !== "head-plain";
  return (
    <div className="@container relative">
      {/* bg = the picture's top row, filling any space above it when the header is taller than the picture's sky. */}
      <div
        className="relative bg-[#57B5EE] px-5 pt-[max(52px,env(safe-area-inset-top))] pb-5"
        style={{ minHeight: `${feet[image]}cqw` }}
      >
        <Image
          src={`/verisite/${image}.png`}
          alt=""
          width={780}
          height={552}
          preload
          className="pointer-events-none absolute inset-x-0 h-auto w-full max-w-none"
          style={{ bottom: `${feet[image] - imageHeight}cqw` }}
        />
        <div className="relative z-10 flex min-h-[46px] justify-between">
          {back && <IconButton href={back} icon={backIcon} label={backIcon === "close" ? "Isara" : "Bumalik"} />}
          {right}
        </div>
        {/* Text stays left of the mascot (it starts at 66% of the width). */}
        <div className={`relative ${mascot ? "max-w-[62%]" : ""}`}>
          <h1 className="mt-2.5 text-[28px] font-bold leading-[1.12] tracking-[-0.5px] [overflow-wrap:anywhere] [text-shadow:0px_1px_5px_#00000033]">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-base leading-[1.3]">{subtitle}</p>}
        </div>
      </div>
      <section className="relative flex flex-col gap-2.5 rounded-t-sheet bg-page px-5 pt-5 pb-[max(34px,env(safe-area-inset-bottom))]">
        {children}
      </section>
    </div>
  );
}
