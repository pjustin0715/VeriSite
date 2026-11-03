"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import IconButton from "@/components/IconButton";
import { normalizePhoto } from "@/lib/image";
import { setDraft } from "../data";

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
      <span className="absolute -top-[34px] left-0 flex h-7 items-center rounded-[9px] bg-yellow px-2.5 text-15 font-bold whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

// Camera view (W-Scan). The shutter opens the phone camera (a file picker on computers); the gallery button picks a saved photo.
// The illustration stays as the aiming guide. `?project=<id>` (from a project page) ties the scan to that project.
export default function ScanPage() {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Next keeps this page mounted while hidden; coming back (e.g. from Error) must not stay stuck on "Inihahanda...".
  useEffect(
    () => () => {
      setBusy(false);
      setError("");
    },
    [],
  );

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same photo be picked again after an error
    if (!file) return; // cancelled
    if (file.type && !file.type.startsWith("image/")) return setError("Litrato lang ang puwede. Pumili ng ibang file.");
    setError("");
    setBusy(true);
    try {
      // normalizePhoto: max 1600px JPEG, converts HEIC and drops location data.
      const photo = await readAsDataUrl(await normalizePhoto(file));
      const projectId = new URLSearchParams(location.search).get("project") ?? undefined;
      setDraft({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, photo, projectId });
      router.push("/verisite/loading");
    } catch {
      setError("Hindi mabuksan ang litrato. Subukan ulit o pumili ng ibang litrato.");
      setBusy(false);
    }
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#23404C]">
      <div className="absolute inset-x-0 top-0 aspect-[390/844]">
        <Image src="/verisite/site.png" alt="Gabay sa pag-scan: paskil at bukas na hukay sa kalsada" fill preload sizes="480px" />
        <Frame label="Paskil" left={12} top={358} width={158} height={118} />
        <Frame label="Posibleng panganib" left={174} top={562} width={200} height={92} />
      </div>
      <div className="absolute inset-x-0 top-0 h-[230px] bg-linear-to-b from-[rgba(15,40,60,.8)] via-[rgba(15,40,60,.45)] via-55% to-[rgba(15,40,60,0)]" />

      <div className="absolute top-[max(52px,env(safe-area-inset-top))] left-5">
        <IconButton href="/verisite/home" icon="close" label="Isara" />
      </div>
      <p className="absolute inset-x-7 top-[max(112px,calc(env(safe-area-inset-top)+60px))] text-center text-lg leading-[1.25] font-semibold text-white">
        Itapat sa paskil o sa lugar ng proyekto
      </p>

      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={onPick} hidden />
      <input ref={gallery} type="file" accept="image/*" onChange={onPick} hidden />

      {(error || busy) && (
        <p
          role={error ? "alert" : "status"}
          className={`absolute inset-x-5 bottom-[calc(max(34px,env(safe-area-inset-bottom))+100px)] rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold shadow-card ${error ? "text-lampas" : "text-ink"}`}
        >
          {error || "Inihahanda ang litrato..."}
        </p>
      )}
      <div className="absolute inset-x-0 bottom-[max(34px,env(safe-area-inset-bottom))] grid grid-cols-[1fr_84px_1fr] items-center">
        <button
          type="button"
          onClick={() => gallery.current?.click()}
          disabled={busy}
          className="mx-auto flex cursor-pointer flex-col items-center gap-1 text-15 font-semibold text-white"
        >
          <span className="flex size-[52px] items-center justify-center rounded-2xl bg-white shadow-[0_6px_14px_rgba(0,0,0,.25)]">
            <Icon name="image" size={25} color="#1E2B30" />
          </span>
          Gallery
        </button>
        <button
          type="button"
          onClick={() => camera.current?.click()}
          disabled={busy}
          aria-label="Kunan ng litrato"
          className="size-[84px] cursor-pointer rounded-full border-4 border-white bg-yellow bg-clip-content p-1.5 shadow-[0_6px_18px_rgba(0,0,0,.35)] disabled:opacity-60"
        />
      </div>
    </main>
  );
}
