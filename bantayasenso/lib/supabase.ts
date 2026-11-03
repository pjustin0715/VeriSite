import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const DEMO_CENTER = {
    lat: Number(process.env.NEXT_PUBLIC_DEMO_LAT || 14.4296),
    lng: Number(process.env.NEXT_PUBLIC_DEMO_LNG || 120.9367),
};

export async function ensureAnonSession(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) throw new Error(error?.message || "Anonymous sign-in failed");
    return data.session.access_token;
}

export function normContractId(raw?: string | null): string | null {
    const cleaned = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned || null;
}

export type ProjectStatusRow = {
    id: string;
    source: "dpwh" | "citizen";
    source_as_of: string | null;
    contract_id: string | null;
    title: string;
    contractor: string | null;
    implementing_office: string | null;
    budget_php: number | null;
    start_date: string | null;
    target_date: string | null;
    progress_pct: number;
    dpwh_status: string | null;
    lat: number;
    lng: number;
    completed: boolean;
    days_to_target: number | null;
    open_hazards: number;
    total_reports: number;
    confirmations: number;
    status: "red" | "yellow" | "green" | "gray";
};

export function statusCopy(p: ProjectStatusRow): string {
    if (p.open_hazards > 0) return `${p.open_hazards} open hazard report(s) from citizens`;
    if (p.source === "citizen") return "Unverified citizen record (not matched to DPWH data)";
    if (p.completed) return "Completed per DPWH";
    if (p.days_to_target === null) return "No target date in DPWH data";
    if (p.days_to_target < 0)
        return `Past DPWH target date by ${Math.abs(p.days_to_target)} days · DPWH data as of ${p.source_as_of ?? "snapshot"} (may not reflect approved extensions)`;
    return `DPWH target date in ${p.days_to_target} days`;
}

export function buildComplaintMailto(p: ProjectStatusRow, origin: string): string {
    // Never address citizen/unverified records to DPWH
    const to = p.source === "dpwh" ? "citizens_feedback@dpwh.gov.ph" : "";
    const prefix = p.source === "dpwh" ? "" : "[UNVERIFIED CITIZEN RECORD] ";
    const subject = `${prefix}Inquiry / Citizen Report: ${p.contract_id ?? p.title}`;
    const body = [
        `Project: ${p.title}`,
        `Contract ID: ${p.contract_id ?? "Unverified / Not on sign"}`,
        `Contractor (per record): ${p.contractor ?? "N/A"}`,
        `Status on BantayAsenso: ${statusCopy(p)}`,
        `Citizen confirmations (+1): ${p.confirmations} | Open hazard reports: ${p.open_hazards}`,
        `Location: https://www.google.com/maps?q=${p.lat},${p.lng}`,
        p.source === "dpwh" && p.contract_id
            ? `DPWH Portal: https://transparency.dpwh.gov.ph/?contractId=${p.contract_id}`
            : "",
        `App link: ${origin}/?project=${p.id}`,
        "",
        "My observation:",
    ].filter(Boolean).join("\n");
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}