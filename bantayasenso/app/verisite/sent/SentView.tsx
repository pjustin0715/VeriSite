"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import BadgeIcon from "@/components/BadgeIcon";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import { today, useData } from "../data";
import { userOf } from "../store";

// Report sent (W-Sent): the report from `?id=` with the user's streak and count after it.
export default function SentView() {
  const id = useSearchParams().get("id");
  const data = useData();
  const user = data && userOf(data, today());
  if (!data || !user) return null;
  // Only the sender's own report: an old or someone else's link shows "not found".
  const report = data.reports.find((r) => r.id === id && r.user === user.username);

  return (
    <main className="flex grow flex-col bg-[#57B5EE]">
      <Image src="/verisite/party.png" alt="Ang mascot na nagdiriwang" width={780} height={840} preload className="h-auto w-full" />
      <section className="relative -mt-12 flex grow flex-col gap-2.5 rounded-t-sheet bg-page px-5 pt-5 pb-[max(34px,env(safe-area-inset-bottom))]">
        {report ? (
          <>
            <h1 className="mt-1 text-center text-[29px] font-bold tracking-[-0.4px]">Salamat, {user.username}!</h1>
            <p className="mb-1.5 text-center text-17 text-muted">Naipadala sa LGU • #{report.id}</p>
            <div className="flex gap-2.5">
              <Card className="flex flex-1 flex-col items-center gap-0.5 px-1.5 py-3">
                <Icon name="flame" size={28} color="#E8681C" strokeWidth={2.1} />
                <strong className="text-xl font-bold text-streak">{user.streak} araw</strong>
                <span className="text-15 text-muted">Streak</span>
              </Card>
              <Card className="flex flex-1 flex-col items-center gap-0.5 px-1.5 py-3">
                {user.badge && <BadgeIcon badge={user.badge} size={30} />}
                <strong className="text-xl font-bold text-link">{user.reportCount}</strong>
                <span className="text-15 text-muted">Report mo</span>
              </Card>
            </div>
          </>
        ) : (
          <h1 className="mt-1 text-center text-[27px] font-bold">Hindi nakita ang report</h1>
        )}
        <span className="min-h-6 grow" />
        <ButtonLink href="/verisite/home">Bumalik sa Simula</ButtonLink>
      </section>
    </main>
  );
}
