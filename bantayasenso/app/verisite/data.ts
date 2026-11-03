// The one VeriSite data layer: projects, reports, followed projects, the current user and updates.
// shortcut: saved in this browser's localStorage; replace these functions with backend calls (Supabase) later.
// Client-only: import it from "use client" components.
import { useMemo, useSyncExternalStore } from "react";
import type { AiResult } from "./ai";
import { sample } from "./sample-data";
import { addReport, confirmReports, seedState, setSiteStatus, toggleFollowed, upgrade, type Report, type ReportStatus, type State } from "./store";

const KEY = "verisite:v1";
const CHANGED = "verisite:changed";

export const today = () => new Date().toLocaleDateString("sv"); // local YYYY-MM-DD

let cache: { raw: string | null; state: State } | null = null;
let memory: string | null = null; // used when localStorage is blocked (private mode)

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}
function writeRaw(raw: string) {
  try {
    localStorage.setItem(KEY, raw);
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") throw e;
    memory = raw;
  }
}

function load(): State {
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.state;
  let state: State | null = null;
  try {
    const s = raw && JSON.parse(raw);
    // Stored data is untrusted: anything unexpected falls back to a fresh start.
    if ((s?.version === 1 || s?.version === 2) && Array.isArray(s.projects) && Array.isArray(s.reports) && Array.isArray(s.updates) && s.user) state = upgrade(s, sample);
  } catch {}
  if (!state) {
    state = seedState(sample, today());
    const fresh = JSON.stringify(state);
    writeRaw(fresh);
    cache = { raw: readRaw() ?? fresh, state };
    return state;
  }
  cache = { raw, state };
  return state;
}

function save(state: State) {
  const raw = JSON.stringify(state);
  writeRaw(raw);
  cache = { raw: readRaw() ?? raw, state };
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Current data, or null during the server render (screens show a placeholder until the browser loads it).
export const useData = () => useSyncExternalStore(subscribe, load, () => null);
export const getData = load;

// Saves the report and updates the user's streak and count and the project's report count.
// Sending the same scan again (same draftId) returns the first report instead of saving twice.
export async function sendReport(input: Pick<Report, "projectId" | "photo" | "issues" | "note" | "draftId">): Promise<Report> {
  const { state, report } = addReport(load(), { ...input, photo: await shrink(input.photo) }, new Date());
  if (state !== load()) save(state);
  return report;
}

export async function toggleFollow(projectId: string) {
  save(toggleFollowed(load(), projectId));
}

// LGU actions on a site (LGUDetail). Both skip saving when nothing changes, so a double tap is harmless.
export async function setStatus(projectId: string, status: ReportStatus) {
  const next = setSiteStatus(load(), projectId, status);
  if (next !== load()) save(next);
}
export async function confirmSite(projectId: string) {
  const next = confirmReports(load(), projectId);
  if (next !== load()) save(next);
}

// Saved reports keep a small copy of the photo so localStorage (about 5 MB) holds many reports.
async function shrink(src: string, max = 480) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

// The scan in progress (Scan -> Loading -> Result), kept per tab so a refresh mid-scan keeps the photo.
export type Draft = { id: string; photo: string; projectId?: string; ai?: AiResult };
const DRAFT = "verisite:draft";

function draftRaw() {
  try {
    return sessionStorage.getItem(DRAFT);
  } catch {
    return null;
  }
}
function parseDraft(raw: string | null): Draft | null {
  try {
    const d = JSON.parse(raw ?? "null");
    return typeof d?.id === "string" && typeof d.photo === "string" ? d : null;
  } catch {
    return null;
  }
}
export const getDraft = () => parseDraft(draftRaw());
// Live draft for rendering; null during the server render.
export function useDraft() {
  const raw = useSyncExternalStore(subscribe, draftRaw, () => null);
  return useMemo(() => parseDraft(raw), [raw]);
}
export function setDraft(d: Draft) {
  sessionStorage.setItem(DRAFT, JSON.stringify(d));
  window.dispatchEvent(new Event(CHANGED));
}
export function clearDraft() {
  sessionStorage.removeItem(DRAFT);
  window.dispatchEvent(new Event(CHANGED));
}
