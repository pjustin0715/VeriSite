"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { analyzePhoto } from "../ai";
import { getData, getDraft, setDraft, today } from "../data";
import { projectsOf } from "../store";

const steps = ["Binabasa ang paskil", "Hinahanap ang panganib", "Kinukumpara sa rekord"];

// AI is checking the photo (W-Loading). Moves on by itself: Result when done, Error when the photo can't be read.
export default function LoadingPage() {
  const router = useRouter();
  const [done, setDone] = useState(0); // steps finished; only animates, the AI call decides when to leave

  useEffect(() => {
    const draft = getDraft();
    if (!draft) return router.replace("/verisite/scan");
    let cancelled = false;
    // From elapsed time, so a second scan (Next reuses this page) starts from the first step again.
    const start = Date.now();
    const tick = setInterval(() => setDone(Math.min(Math.floor((Date.now() - start) / 800), steps.length - 1)), 100);
    const projects = projectsOf(getData(), today());
    // Mock only: the canned reading needs a site; use the chosen project, else the most overdue one.
    const site = projects.find((p) => p.id === draft.projectId) ?? projects.find((p) => p.status === "lampas") ?? projects[0];
    analyzePhoto(draft.photo, site)
      .then((ai) => {
        if (cancelled) return;
        setDraft({ ...draft, ai });
        setDone(steps.length);
        router.replace("/verisite/result");
      })
      .catch(() => !cancelled && router.replace("/verisite/error"));
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [router]);

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
      <ul aria-live="polite" className="relative flex flex-col gap-3.5 rounded-[22px] bg-white/96 px-5 py-[18px] shadow-card">
        {steps.map((label, i) => (
          <li key={label} className={`flex items-center gap-3 text-lg ${i > done ? "text-muted" : ""} ${i === done ? "font-bold" : ""}`}>
            {i < done ? (
              <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-ayon">
                <Icon name="check" size={18} color="#FFFFFF" strokeWidth={3} />
              </span>
            ) : (
              <span className={`size-[30px] flex-none rounded-full border-2 ${i === done ? "animate-pulse border-ayon" : "border-[#D5DEDE]"}`} />
            )}
            {label}
          </li>
        ))}
      </ul>
      <span className="h-[156px] flex-none" />
    </main>
  );
}
