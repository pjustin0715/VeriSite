import Image from "next/image";
import ButtonLink from "@/components/ButtonLink";
import Icon from "@/components/Icon";

// done = green check; the last done step is the one in progress (bold).
const steps = [
  { label: "Binabasa ang paskil", done: true },
  { label: "Hinahanap ang panganib", done: true },
  { label: "Kinukumpara sa rekord", done: false },
];

// AI is checking the photo (W-Loading).
export default function LoadingPage() {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-[#57B5EE] px-5 pt-[max(62px,env(safe-area-inset-top))] pb-[max(34px,env(safe-area-inset-bottom))]">
      <Image
        src="/verisite/loading.png"
        alt="Ang mascot habang sinusuri ang litrato"
        fill
        preload
        sizes="480px"
        className="object-cover object-top"
      />
      <h1 className="relative text-center text-[30px] font-bold tracking-[-0.4px] [text-shadow:0px_1px_5px_#00000033]">Sandali lang...</h1>
      <span className="grow" />
      <ul
        aria-live="polite"
        className="relative flex flex-col gap-3.5 rounded-[22px] bg-white/96 px-5 py-[18px] shadow-card"
      >
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center gap-3 text-lg ${s.done ? "" : "text-muted"} ${s.done && !steps[i + 1]?.done ? "font-bold" : ""}`}
          >
            {s.done ? (
              <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-ayon">
                <Icon name="check" size={18} color="#FFFFFF" strokeWidth={3} />
              </span>
            ) : (
              <span className="size-[30px] flex-none rounded-full border-2 border-[#D5DEDE]" />
            )}
            {s.label}
          </li>
        ))}
      </ul>
      <span className="h-24 flex-none" />
      <div className="relative">
        <ButtonLink href="/verisite/result">Tingnan ang resulta</ButtonLink>
      </div>
    </main>
  );
}
