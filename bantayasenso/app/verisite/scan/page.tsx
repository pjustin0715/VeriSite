import Image from "next/image";
import Link from "next/link";
import IconButton from "@/components/IconButton";

// Yellow corner brackets with a label, placed in % of the 390x844 camera scene so they stay on the paskil and the hole.
function Frame({ label, left, top, width, height }: { label: string; left: number; top: number; width: number; height: number }) {
  const corner = "absolute size-[30px] border-yellow";
  return (
    <div
      className="absolute"
      style={{ left: `${(left / 390) * 100}%`, top: `${(top / 844) * 100}%`, width: `${(width / 390) * 100}%`, height: `${(height / 844) * 100}%` }}
    >
      <span className={`${corner} top-0 left-0 rounded-tl-xl border-t-4 border-l-4`} />
      <span className={`${corner} top-0 right-0 rounded-tr-xl border-t-4 border-r-4`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-xl border-b-4 border-l-4`} />
      <span className={`${corner} right-0 bottom-0 rounded-br-xl border-r-4 border-b-4`} />
      <span className="absolute -top-[34px] left-0 flex h-7 items-center rounded-[9px] bg-yellow px-2.5 text-[15px] font-bold whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

// Camera view (W-Scan). shortcut: shows the illustrated scene instead of a live camera; swap in getUserMedia when wiring the real scan.
export default function ScanPage() {
  return (
    <main className="relative h-dvh overflow-hidden bg-[#23404C]">
      <div className="absolute inset-x-0 top-0 aspect-[390/844]">
        <Image src="/verisite/site.png" alt="Tanawin sa camera: paskil at bukas na hukay sa kalsada" fill preload sizes="480px" />
        <Frame label="Paskil" left={12} top={358} width={158} height={118} />
        <Frame label="Posibleng panganib" left={174} top={562} width={200} height={92} />
      </div>
      <div className="absolute inset-x-0 top-0 h-[230px] bg-linear-to-b from-[rgba(15,40,60,.8)] via-[rgba(15,40,60,.45)] via-55% to-[rgba(15,40,60,0)]" />

      <div className="absolute inset-x-5 top-[max(52px,env(safe-area-inset-top))] flex justify-between">
        <IconButton href="/verisite/home" icon="close" label="Isara" />
        <IconButton href="/verisite/scan" icon="flash" label="Ilaw ng camera" />
      </div>
      <p className="absolute inset-x-7 top-[max(112px,calc(env(safe-area-inset-top)+60px))] text-center text-lg leading-[1.25] font-semibold text-white">
        Itapat sa paskil o sa lugar ng proyekto
      </p>

      <Link
        href="/verisite/loading"
        aria-label="Kunan ng litrato"
        className="absolute bottom-[max(34px,env(safe-area-inset-bottom))] left-1/2 size-[84px] -translate-x-1/2 rounded-full border-4 border-white bg-yellow bg-clip-content p-1.5 shadow-[0_6px_18px_rgba(0,0,0,.35)]"
      />
    </main>
  );
}
