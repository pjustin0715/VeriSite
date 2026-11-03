"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import BadgeIcon from "@/components/BadgeIcon";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import IconButton from "@/components/IconButton";
import { today, useData } from "../data";
import { badges, userOf } from "../store";

// Streak, current badge and progress to the next one (W-Badges).
export default function BadgesView() {
  const from = useSearchParams().get("from");
  const data = useData();
  const user = data && userOf(data, today());
  if (!user) return null;
  const count = user.reportCount;
  const next = badges.find((b) => count < b.min);

  return (
    <main className="relative">
      <Image src="/verisite/podium.png" alt="Masayang mascot sa ibabaw ng podium" width={780} height={700} preload className="h-auto w-full" />
      <div className="absolute top-[max(52px,env(safe-area-inset-top))] left-5">
        <IconButton href={from === "profile" ? "/verisite/profile" : "/verisite/home"} icon="back" label="Bumalik" />
      </div>

      <section className="relative -mt-10 flex flex-col gap-2.5 rounded-t-sheet bg-page px-5 pt-5 pb-[max(34px,env(safe-area-inset-bottom))]">
        <h1 className="sr-only">Streak at mga badge</h1>
        <div className="flex gap-2.5">
          <Card className="flex flex-1 flex-col items-center px-2 py-3.5">
            <Icon name="flame" size={30} color="#E8681C" strokeWidth={2.2} />
            <strong className="mt-1 text-2xl font-bold text-streak">{user.streak} araw</strong>
            <span className="text-lg font-semibold text-muted">Streak</span>
          </Card>
          <Card className="flex flex-1 flex-col items-center px-2 py-3.5">
            {user.badge ? <BadgeIcon badge={user.badge} size={30} /> : <Icon name="lock" size={30} color="#5F6E74" />}
            <strong className="mt-1 text-2xl font-bold text-link">{user.badge ?? "Wala pa"}</strong>
            <span className="text-lg font-semibold text-muted">Badge mo</span>
          </Card>
        </div>

        <Card className="px-4 py-3.5">
          {next ? (
            <>
              <p className="flex items-baseline justify-between gap-2 text-lg font-bold">
                <span>
                  {next.min - count} report para sa {next.name}
                </span>
                <span className="text-xl text-link">
                  {count} / {next.min}
                </span>
              </p>
              <div className="mt-2 h-3 rounded-md bg-track" role="progressbar" aria-label={`Papunta sa ${next.name}`} aria-valuenow={count} aria-valuemax={next.min}>
                <div className="h-3 rounded-md bg-yellow" style={{ width: `${(count / next.min) * 100}%` }} />
              </div>
            </>
          ) : (
            <p className="text-lg font-bold">Nasa pinakamataas na badge ka na! {count} report</p>
          )}
        </Card>

        <p className="text-lg leading-[1.35] font-semibold text-muted">Mas mataas na badge, mas nauuna ang report mo sa listahan.</p>

        {badges.map((b) => {
          const mine = b.name === user.badge;
          const got = count >= b.min;
          return (
            <div
              key={b.name}
              className={`flex items-center gap-4 rounded-card px-4 py-2.5 ${
                mine ? "border-2 border-primary bg-soft" : got ? "bg-white shadow-card" : "bg-white/60 opacity-70"
              }`}
            >
              <BadgeIcon badge={b.name} size={40} />
              <span className="grow">
                <strong className={`block text-xl font-bold ${got ? "" : "text-muted"}`}>{b.name}</strong>
                <span className="text-lg font-semibold text-muted">{b.min}+ report</span>
              </span>
              {mine ? (
                <span className="text-lg font-bold text-link">Ikaw ito</span>
              ) : got ? (
                <Icon name="check" size={26} color="#2E9E6B" strokeWidth={2.6} />
              ) : (
                <span role="img" aria-label="Hindi pa nakukuha">
                  <Icon name="lock" size={24} color="#5F6E74" />
                </span>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
