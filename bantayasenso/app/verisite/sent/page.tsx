import Image from "next/image";
import BadgeIcon from "@/components/BadgeIcon";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import { scanResult, user } from "../sample-data";

// Report sent (W-Sent). Streak and count include the report just sent.
export default function SentPage() {
  return (
    <main className="flex grow flex-col bg-[#57B5EE]">
      <Image src="/verisite/party.png" alt="Ang mascot na nagdiriwang" width={780} height={840} preload className="h-auto w-full" />
      <section className="relative -mt-12 flex grow flex-col gap-2.5 rounded-t-sheet bg-page px-5 pt-5 pb-[max(34px,env(safe-area-inset-bottom))]">
        <h1 className="mt-1 text-center text-[29px] font-bold tracking-[-0.4px]">Salamat, {user.username}!</h1>
        <p className="mb-1.5 text-center text-[17px] text-muted">Naipadala sa LGU • #{scanResult.reportId}</p>
        <div className="flex gap-2.5">
          <Card className="flex flex-1 flex-col items-center gap-0.5 px-1.5 py-3">
            <Icon name="flame" size={28} color="#E8681C" strokeWidth={2.1} />
            <strong className="text-xl font-bold text-streak">{user.streak + 1} araw</strong>
            <span className="text-[15px] text-muted">Streak</span>
          </Card>
          <Card className="flex flex-1 flex-col items-center gap-0.5 px-1.5 py-3">
            <BadgeIcon badge={user.badge} size={30} />
            <strong className="text-xl font-bold text-link">{user.reportCount + 1}</strong>
            <span className="text-[15px] text-muted">Report mo</span>
          </Card>
        </div>
        <span className="min-h-6 grow" />
        <ButtonLink href="/verisite/home">Bumalik sa Simula</ButtonLink>
      </section>
    </main>
  );
}
