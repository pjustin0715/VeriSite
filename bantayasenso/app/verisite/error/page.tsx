import Image from "next/image";
import ButtonLink from "@/components/ButtonLink";
import IconButton from "@/components/IconButton";

// Photo could not be read (W-Error).
export default function ErrorPage() {
  return (
    <main className="flex grow flex-col bg-[#57B5EE]">
      <div className="relative">
        <Image src="/verisite/oops.png" alt="Ang mascot na nag-aalala" width={780} height={700} preload className="h-auto w-full" />
        <div className="absolute top-[max(52px,env(safe-area-inset-top))] left-5">
          <IconButton href="/verisite/scan" icon="back" label="Bumalik" />
        </div>
      </div>
      <section className="relative -mt-[30px] flex grow flex-col gap-3 rounded-t-sheet bg-page px-5 pt-5 pb-[max(34px,env(safe-area-inset-bottom))]">
        <h1 className="mt-2 text-center text-[27px] font-bold tracking-[-0.4px]">Hindi malinaw ang litrato</h1>
        <p className="mx-2.5 mb-2 text-center text-[17px] leading-[1.4] text-muted">Lumapit nang kaunti at siguraduhing maliwanag.</p>
        <span className="grow" />
        <ButtonLink href="/verisite/scan">Subukan ulit</ButtonLink>
        <ButtonLink href="/verisite/home" variant="white">
          Bumalik sa Simula
        </ButtonLink>
      </section>
    </main>
  );
}
