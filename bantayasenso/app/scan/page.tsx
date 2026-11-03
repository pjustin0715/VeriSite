"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, DEMO_CENTER, ensureAnonSession, normContractId } from "@/lib/supabase";
import { normalizePhoto } from "@/lib/image";

function ScanInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = (params.get("mode") || "sign") as "sign" | "hazard" | "update";
  const presetProjectId = params.get("project");

  const [samples, setSamples] = useState<any[]>([]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [coords, setCoords] = useState(DEMO_CENTER);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<any>(null);
  const [note, setNote] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    fetch("/samples/manifest.json").then((r) => r.json()).then(setSamples).catch(() => {});
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    );
  }, []);

  async function checkMatch(rawCid?: string | null) {
    const cid = normContractId(rawCid);
    if (!cid) return false;
    let { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("contract_id", cid)
      .maybeSingle();

    if (!existing && cid.length >= 4) {
      // 1. Check 0 vs O swap at position 2
      const altChar = cid[2] === "0" ? "O" : cid[2] === "O" ? "0" : cid[2];
      const alt = cid.slice(0, 2) + altChar + cid.slice(3);
      if (alt !== cid) {
        const { data: altHit } = await supabase
          .from("projects")
          .select("id")
          .eq("contract_id", alt)
          .maybeSingle();
        existing = altHit;
      }
    }

    // 2. Fuzzy match: handle dropped letter (e.g. 25D0106) or swapped letters (e.g. 25DO0106)
    if (!existing && cid.length >= 6) {
      const year = cid.slice(0, 2);
      const seq = cid.slice(-4);
      if (/^\d{2}$/.test(year) && /^\d{4}$/.test(seq)) {
        const { data: candidates } = await supabase
          .from("projects")
          .select("id, contract_id")
          .ilike("contract_id", `${year}%${seq}`);
        if (candidates && candidates.length > 0) {
          const midLetters = cid.slice(2, -4);
          const best = candidates.find((c) =>
            [...midLetters].some((ch) => c.contract_id?.includes(ch))
          ) || candidates[0];
          existing = best;
        }
      }
    }

    if (existing) {
      router.push(`/?project=${existing.id}`);
      return true;
    }
    return false;
  }

  async function runAnalyze(rawFile: File | Blob, cannedFallback?: any) {
    setBusy(true);
    setStatusMsg("Processing photo...");
    try {
      const jpeg = await normalizePhoto(rawFile);
      setBlob(jpeg);
      if (mode === "update") {
        setFields({});
        return;
      }
      const token = await ensureAnonSession();
      const fd = new FormData();
      fd.append("mode", mode);
      fd.append("image", new File([jpeg], "capture.jpg", { type: "image/jpeg" }));

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("API failed");
      const analyzed = await res.json();
      setFields(analyzed);
      setStatusMsg("");
      if (mode === "sign" && (await checkMatch(analyzed.contract_id))) return;
    } catch {
      if (cannedFallback) {
        setFields(cannedFallback);
        setStatusMsg("Loaded sample preset (offline/timeout fallback).");
        if (mode === "sign" && (await checkMatch(cannedFallback.contract_id))) return;
      } else {
        setFields({ contract_id: "", title: "", contractor: "", budget_php: null, target_date: "", concerns: [], summary: "" });
        setStatusMsg("AI unavailable — please fill in details manually.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function pickSample(s: any) {
    setCoords({ lat: s.lat, lng: s.lng });
    const res = await fetch(s.image);
    const b = await res.blob();
    await runAnalyze(b, s.canned);
  }

  async function handleSave() {
    setBusy(true);
    try {
      await ensureAnonSession();
      let photoPath: string | null = null;
      if (blob) {
        photoPath = `${crypto.randomUUID()}.jpg`;
        await supabase.storage.from("photos").upload(photoPath, blob, { contentType: "image/jpeg" });
      }

      if (mode === "sign") {
        if (await checkMatch(fields.contract_id)) return;
        const cid = normContractId(fields.contract_id);
        const { data: created, error } = await supabase
          .from("projects")
          .insert({
            source: "citizen",
            contract_id: cid,
            title: fields.title || "Unverified road work",
            contractor: fields.contractor || null,
            implementing_office: fields.implementing_office || null,
            budget_php: fields.budget_php ? Number(fields.budget_php) : null,
            start_date: fields.start_date || null,
            target_date: fields.target_date || null,
            lat: coords.lat,
            lng: coords.lng,
          })
          .select("id")
          .single();
        if (error) throw error;
        router.push(`/?project=${created.id}`);
        return;
      }

      // Hazard or Citizen Update
      let targetProjectId = presetProjectId;
      if (!targetProjectId) {
        const { data: near } = await supabase.rpc("nearest_project", {
          p_lat: coords.lat,
          p_lng: coords.lng,
          p_max_m: 100,
        });
        if (near?.[0]?.id) {
          targetProjectId = near[0].id;
        } else {
          const { data: created } = await supabase
            .from("projects")
            .insert({
              source: "citizen",
              title: "Unverified road work / hazard",
              lat: coords.lat,
              lng: coords.lng,
            })
            .select("id")
            .single();
          targetProjectId = created?.id;
        }
      }

      await supabase.from("reports").insert({
        project_id: targetProjectId,
        kind: mode === "hazard" ? "hazard" : "update",
        note: note.slice(0, 500) || null,
        photo_path: photoPath,
        ai_flags: mode === "hazard" ? fields : null,
      });
      router.push(`/?project=${targetProjectId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-950 p-4 text-white text-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold capitalize">{mode} Scanner</h1>
        <button onClick={() => router.push("/")} className="text-slate-400">Cancel</button>
      </div>

      <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-700 p-6 text-center">
        <span className="font-semibold">📷 Take Photo with Rear Camera</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && runAnalyze(e.target.files[0])}
        />
      </label>

      {/* Sample picker for judges without a printed billboard (F7) */}
      <div className="mt-4">
        <div className="text-xs text-slate-400 mb-2">Or try a real sample photo:</div>
        <div className="flex flex-wrap gap-2">
          {samples
            .filter((s) => (mode === "update" ? true : s.mode === mode))
            .map((s) => (
              <button
                key={s.id}
                onClick={() => pickSample(s)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium"
              >
                {s.label}
              </button>
            ))}
        </div>
      </div>

      {statusMsg && <p className="mt-3 text-xs text-amber-400">{statusMsg}</p>}

      {fields && mode === "sign" && (
        <div className="mt-4 space-y-3 rounded-xl bg-slate-900 p-4">
          <div className="text-xs text-slate-400">Confirm or edit extracted details before saving:</div>
          <input
            value={fields.contract_id || ""}
            onChange={(e) => setFields({ ...fields, contract_id: e.target.value })}
            placeholder="Contract ID (e.g. 24DF0012)"
            className="w-full rounded bg-slate-800 p-2"
          />
          <input
            value={fields.title || ""}
            onChange={(e) => setFields({ ...fields, title: e.target.value })}
            placeholder="Project Title"
            className="w-full rounded bg-slate-800 p-2"
          />
          <input
            value={fields.contractor || ""}
            onChange={(e) => setFields({ ...fields, contractor: e.target.value })}
            placeholder="Contractor"
            className="w-full rounded bg-slate-800 p-2"
          />
          <input
            type="number"
            value={fields.budget_php || ""}
            onChange={(e) => setFields({ ...fields, budget_php: e.target.value })}
            placeholder="Budget (PHP)"
            className="w-full rounded bg-slate-800 p-2"
          />
          <input
            type="date"
            value={fields.target_date || ""}
            onChange={(e) => setFields({ ...fields, target_date: e.target.value })}
            className="w-full rounded bg-slate-800 p-2"
          />
          <button
            disabled={busy}
            onClick={handleSave}
            className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-slate-950"
          >
            Find / Save Project
          </button>
        </div>
      )}

      {fields && mode !== "sign" && (
        <div className="mt-4 space-y-3 rounded-xl bg-slate-900 p-4">
          {mode === "hazard" && (
            <div className="rounded bg-amber-950/60 p-3 text-xs text-amber-200">
              <b>AI Check:</b> {fields.summary || "Checked photo."}
              <div className="mt-1 opacity-80">
                Automated check. This might be a problem; please verify. Not an official finding.
              </div>
            </div>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Add a short note (optional, max 500 chars)..."
            className="w-full rounded bg-slate-800 p-2"
            rows={3}
          />
          <button
            disabled={busy}
            onClick={handleSave}
            className="w-full rounded-lg bg-red-500 py-3 font-bold text-white"
          >
            Submit Report
          </button>
        </div>
      )}
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-4 text-white">Loading...</div>}>
      <ScanInner />
    </Suspense>
  );
}

