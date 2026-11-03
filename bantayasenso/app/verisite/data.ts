// The one VeriSite data layer: projects, reports, followed projects, the current user and updates.
// shortcut: saved in this browser's localStorage; replace these functions with backend calls (Supabase) later.
// Client-only: import it from "use client" components.
import { useMemo, useSyncExternalStore } from "react";
import type { AiResult } from "./ai";
import { sample } from "./sample-data";
import {
  addAccount, addReport, checkSignup, confirmReports, findAccount, normMobile, readUpdate, seedState, setPassword, setSiteStatus, toggleFollowed, upgrade,
  type Report, type ReportStatus, type SignupErrors, type SignupInput, type State,
} from "./store";

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
    if ([1, 2, 3].includes(s?.version) && Array.isArray(s.projects) && Array.isArray(s.reports) && Array.isArray(s.updates) && (s.user || Array.isArray(s.accounts)))
      state = upgrade(s, sample);
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

export async function markRead(updateId: string) {
  const next = readUpdate(load(), updateId);
  if (next !== load()) save(next);
}

// Accounts. shortcut: local mock accounts and a code shown on screen instead of an SMS; swap for Supabase Auth (phone OTP) later.
// The password is never stored as typed: SHA-256 of "username:password" (crypto.subtle needs https or localhost).
async function hash(username: string, password: string) {
  if (!crypto.subtle) throw new Error("Insecure context");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${username.toLowerCase()}:${password}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function logIn(id: string, password: string) {
  const a = findAccount(load(), id);
  if (!a || a.password !== (await hash(a.username, password))) return false;
  save({ ...load(), me: a.username });
  return true;
}
export function logOut() {
  clearDraft();
  save({ ...load(), me: null });
}

// A signup or password reset waiting for its code (Verify screen), kept per tab like the scan draft.
export type Pending = { kind: "signup" | "reset"; username: string; mobile: string; password: string; code: string; sentAt: number };
const PENDING = "verisite:pending";
const newCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
const parsePending = (raw: string | null): Pending | null => {
  try {
    const p = JSON.parse(raw ?? "null");
    return typeof p?.code === "string" && typeof p.username === "string" ? p : null;
  } catch {
    return null;
  }
};
const pendingRaw = () => session(PENDING);
// undefined during the server render, null when there is nothing waiting for a code.
export function usePending() {
  const raw = useSyncExternalStore(subscribe, pendingRaw, () => undefined);
  return useMemo(() => (raw === undefined ? undefined : parsePending(raw)), [raw]);
}
function setPending(p: Pending | null) {
  if (p) sessionStorage.setItem(PENDING, JSON.stringify(p));
  else sessionStorage.removeItem(PENDING);
  window.dispatchEvent(new Event(CHANGED));
}

// Checks the signup form; when it is valid, "sends" a code and returns no errors.
export async function startSignup(input: SignupInput): Promise<SignupErrors> {
  const errors = checkSignup(load(), input);
  if (Object.keys(errors).length) return errors;
  const username = input.username.trim();
  setPending({ kind: "signup", username, mobile: normMobile(input.mobile)!, password: await hash(username, input.password), code: newCode(), sentAt: Date.now() });
  return {};
}
// Forgot password: the account's mobile number and a new password, confirmed with a code.
export async function startReset(mobile: string, password: string): Promise<{ mobile?: string; password?: string }> {
  const m = normMobile(mobile);
  const a = m && load().accounts.find((x) => x.mobile === m);
  const e = {
    mobile: !m ? "Ilagay ang 11 digit na mobile number na nagsisimula sa 09." : !a ? "Walang account sa numerong ito." : undefined,
    password: password.length < 8 ? "Dapat 8 o higit pa ang letra o numero ng password." : undefined,
  };
  if (e.mobile || e.password || !a) return e;
  setPending({ kind: "reset", username: a.username, mobile: a.mobile, password: await hash(a.username, password), code: newCode(), sentAt: Date.now() });
  return {};
}
export function resendCode() {
  const p = parsePending(pendingRaw());
  if (p) setPending({ ...p, code: newCode(), sentAt: Date.now() });
}
// Returns an error message, or null once the account is made (or the password changed) and logged in.
export function verifyCode(code: string): string | null {
  const p = parsePending(pendingRaw());
  if (!p) return "Nag-expire na ang code. Magsimula ulit.";
  if (!/^\d{6}$/.test(code)) return "Ilagay ang 6 na numero ng code.";
  if (code !== p.code) return "Mali ang code. Tingnan ulit o pindutin ang Ipadala ulit.";
  const s = load();
  try {
    save(p.kind === "signup" ? addAccount(s, { username: p.username, mobile: p.mobile, password: p.password }) :{ ...setPassword(s, p.username, p.password), me: p.username });
  } catch {
    setPending(null);
    return "May gumawa na ng account na ito. Mag-sign up ulit gamit ang ibang username o numero.";
  }
  setPending(null);
  return null;
}

// Laki ng letra: a device setting (not per account), applied by the script in layout.tsx so it holds after a refresh.
const TEXT = "verisite:text";
export const useLargeText = () => useSyncExternalStore(subscribe, () => document.documentElement.dataset.text === "malaki", () => false);
export function setLargeText(on: boolean) {
  try {
    localStorage.setItem(TEXT, on ? "malaki" : "");
  } catch {}
  document.documentElement.dataset.text = on ? "malaki" : "";
  window.dispatchEvent(new Event(CHANGED));
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

function session(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
const draftRaw = () => session(DRAFT);
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
  try {
    sessionStorage.removeItem(DRAFT);
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}
