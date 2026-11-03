import Image from "next/image";
import ButtonLink from "@/components/ButtonLink";
import Logo from "@/components/Logo";
import { outfit } from "@/components/font";

// Rendered height of the cover-fitted 390x844 illustration (100cqw = screen width).
const imageHeight = "max(100cqw * 844 / 390, 100dvh)";
// Centre the scene (crane top ~35% to cone feet ~72% of the image) between the text (ends at --text-end)
// and the buttons (start 164px from bottom), so short screens crop evenly instead of only from the top.
const scenePosition = `50% clamp(100dvh - ${imageHeight}, (100dvh + var(--text-end) - 164px) / 2 - 0.532 * ${imageHeight}, 0px)`;

export default function WelcomePage() {
  return (
    <main
      className={`${outfit.className} @container relative mx-auto h-dvh w-full max-w-[480px] overflow-hidden bg-[#57B5EE] font-medium text-[#1E2B30] [--text-end:220px] short:[--text-end:186px]`}
    >
      <Image
        src="/verisite/welcome.png"
        alt="Traffic cone na mascot na naglalakad sa kalsadang may proyekto"
        fill
        preload
        sizes="480px"
        className="object-cover"
        style={{ objectPosition: scenePosition }}
      />

      <div
        className="absolute inset-x-5 top-[max(58px,env(safe-area-inset-top))] text-center short:top-[max(40px,env(safe-area-inset-top))]"
      >
        <Logo />
        <h1
          className="mt-2.5 text-[40px] font-bold leading-[1.08] tracking-[-0.8px] [text-shadow:0px_1px_5px_#00000033] short:mt-2 short:text-[34px]"
        >
          I-scan. Alamin.
          <br />
          I-report.
        </h1>
        <p className="mt-2.5 text-lg leading-[1.35] short:mt-2">Bantayan ang proyekto sa inyong lugar.</p>
      </div>

      <div className="absolute inset-x-5 bottom-[max(34px,env(safe-area-inset-bottom))] flex flex-col gap-2.5">
        <ButtonLink href="/verisite/signup">Gumawa ng account</ButtonLink>
        <ButtonLink href="/verisite/login" variant="white">
          Mag-login
        </ButtonLink>
      </div>
    </main>
  );
}
