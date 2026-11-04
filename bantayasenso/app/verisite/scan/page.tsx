"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import IconButton from "@/components/IconButton";
import { normalizePhoto } from "@/lib/image";
import { setDraft } from "../data";

// Aiming guide over the live camera. Labels stay out because this frame does not detect anything by itself.
function AimFrame() {
  const corner = "absolute size-[34px] border-yellow";
  return (
    <div aria-hidden className="absolute inset-x-6 top-[24%] bottom-[24%]">
      <span className={`${corner} top-0 left-0 rounded-tl-xl border-t-4 border-l-4`} />
      <span className={`${corner} top-0 right-0 rounded-tr-xl border-t-4 border-r-4`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-xl border-b-4 border-l-4`} />
      <span className={`${corner} right-0 bottom-0 rounded-br-xl border-r-4 border-b-4`} />
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

// Live camera view (W-Scan). The shutter takes the current video frame; the gallery button picks a saved photo.
// If the browser can't open the camera, the shutter falls back to the phone's own camera picker.
// `?project=<id>` (from a project page) ties the scan to that project.
export default function ScanPage() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  // Next keeps this page mounted while hidden; coming back (e.g. from Error) must not stay stuck on "Inihahanda...".
  useEffect(
    () => () => {
      setBusy(false);
      setError("");
    },
    [],
  );

  // Runs again when the page is shown after Next hides it, and always releases the camera on leaving.
  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    const stop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = undefined;
      if (video.current) video.current.srcObject = null;
      setLive(false);
    };
    const start = async () => {
      if (stream || document.hidden) return;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera not available");
        const next = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (stopped || document.hidden) return next.getTracks().forEach((track) => track.stop());
        stream = next;
        const element = video.current;
        if (!element) return;
        element.srcObject = next;
        await element.play();
        setCameraFailed(false);
        setLive(true);
      } catch {
        stop();
        setCameraFailed(true);
      }
    };
    const onVisibility = () => (document.hidden ? stop() : void start());
    document.addEventListener("visibilitychange", onVisibility);
    void start();
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, []);

  async function submitPhoto(file: File) {
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

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same photo be picked again after an error
    if (file) void submitPhoto(file);
  }

  async function takePhoto() {
    const element = video.current;
    if (!live || !element?.videoWidth) return camera.current?.click();
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext("2d")?.drawImage(element, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return setError("Hindi nakuha ang litrato. Subukan ulit.");
    await submitPhoto(new File([blob], "scan.jpg", { type: "image/jpeg" }));
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#23404C]">
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        aria-label="Live na camera"
        className={`absolute inset-0 size-full object-cover ${live ? "opacity-100" : "opacity-0"}`}
      />
      <AimFrame />
      <div className="absolute inset-x-0 top-0 h-[230px] bg-linear-to-b from-[rgba(15,40,60,.8)] via-[rgba(15,40,60,.45)] via-55% to-[rgba(15,40,60,0)]" />

      <div className="absolute top-[max(52px,env(safe-area-inset-top))] left-5">
        <IconButton href="/verisite/home" icon="close" label="Isara" />
      </div>
      <p className="absolute inset-x-7 top-[max(112px,calc(env(safe-area-inset-top)+60px))] text-center text-lg leading-[1.25] font-semibold text-white">
        Itapat sa paskil o sa lugar ng proyekto
      </p>
      {cameraFailed && !error && !busy && (
        <p role="status" className="absolute inset-x-5 top-[38%] rounded-2xl bg-white px-4 py-3 text-center text-base font-semibold text-ink shadow-card">
          Hindi mabuksan ang camera. Payagan ito sa browser, o pindutin ang dilaw na button.
        </p>
      )}

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
          onClick={takePhoto}
          disabled={busy}
          aria-label="Kunan ng litrato"
          className="size-[84px] cursor-pointer rounded-full border-4 border-white bg-yellow bg-clip-content p-1.5 shadow-[0_6px_18px_rgba(0,0,0,.35)] disabled:opacity-60"
        />
      </div>
    </main>
  );
}
