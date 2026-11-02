# BantayAsenso: Technical Implementation Guide

Companion to [PRD.md](PRD.md) (v0.3). Every file below is complete and copy-pasteable.

```
bantayasenso/
  app/
    api/analyze/route.ts     # Gemini vision proxy (JWT-checked)
    admin/page.tsx           # Admin login + moderation queue (F9)
    scan/page.tsx            # Sign scan, hazard check, citizen update (F3–F5, F7)
    manifest.ts              # PWA manifest
    page.tsx                 # Tilted MapLibre map + project sheet + nearby (F1, F2, F6, F10)
  lib/
    supabase.ts              # Client, anon auth, status copy, mailto builder
    image.ts                 # Canvas resize + JPEG re-encode (strips EXIF, converts HEIC)
  public/samples/
    manifest.json            # Sample photos + preset coords + canned AI responses
  scripts/
    import_dpwh.py           # One-time Parquet -> Supabase loader (F0)
    test_import_dpwh.py      # Self-check for row normalization
  supabase/
    migrations/0001_init.sql # Schema, status view, RLS, column grants, storage rules
    check.sql                # Asserts all 6 status color rules
    reset.sql                # Judge reset (clears citizen data, keeps DPWH snapshot)
    find_demo_area.sql       # Finds the best street cluster for the demo
```

---

## 1. Project Setup & Environment (H0–1)

### 1.1 Scaffold & install
```bash
npx create-next-app@latest bantayasenso --ts --tailwind --app --no-src-dir --import-alias "@/*"
cd bantayasenso
npm i @supabase/supabase-js @google/genai maplibre-gl
```

Add MapLibre's stylesheet in `app/layout.tsx`:
```tsx
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
```

### 1.2 Supabase project setup (Dashboard, 5 min)
1. **Authentication → Providers → Anonymous Sign-Ins**: toggle **ON**. (Leave CAPTCHA off for the hackathon; noted as a P2 gap.)
2. **Authentication → Users → Add User**: create one admin account with email + password. Copy its `User UID` and insert it into `public.admins` after running `0001_init.sql`.
3. **Storage → New bucket**: name `photos`, toggle **Public bucket ON**, file size limit `4MB`, allowed MIME types `image/jpeg`.

### 1.3 Environment variables (`.env.local` and Vercel Project Settings)
```ini
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_DEMO_LAT=14.4296
NEXT_PUBLIC_DEMO_LNG=120.9367
GEMINI_API_KEY=AIza...

# Local only (for scripts/import_dpwh.py — NEVER add to Vercel):
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 2. Database, RLS, Views & SQL (`supabase/`)

### 2.1 `supabase/migrations/0001_init.sql`
Run this in the Supabase SQL Editor.

```sql
-- 1. Tables
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'citizen' check (source in ('dpwh', 'citizen')),
  source_as_of date,
  contract_id text unique,
  title text not null check (char_length(title) between 3 and 300),
  contractor text,
  implementing_office text,
  budget_php numeric check (budget_php is null or budget_php >= 0),
  start_date date,
  target_date date,
  progress_pct numeric not null default 0 check (progress_pct between 0 and 100),
  dpwh_status text,
  lat double precision not null check (lat between 4.0 and 22.0),
  lng double precision not null check (lng between 116.0 and 128.0),
  created_by uuid default auth.uid() references auth.users,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  kind text not null check (kind in ('update', 'hazard')),
  note text check (note is null or char_length(note) <= 500),
  photo_path text,
  ai_flags jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  admin_response text check (admin_response is null or char_length(admin_response) <= 500),
  created_by uuid not null default auth.uid() references auth.users,
  created_at timestamptz not null default now()
);

create table public.confirmations (
  project_id uuid not null references public.projects on delete cascade,
  user_id uuid not null default auth.uid() references auth.users,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.admins (
  user_id uuid primary key references auth.users on delete cascade
);

create index reports_project_idx on public.reports (project_id, status);
create index projects_coords_idx on public.projects (lat, lng);

-- 2. Single-source-of-truth status function (PRD §6)
create or replace function public.project_color(
  p_source text,
  p_progress numeric,
  p_dpwh_status text,
  p_target_date date,
  p_open_hazards bigint,
  p_today date default current_date
) returns text language sql immutable as $$
  select case
    when coalesce(p_open_hazards, 0) > 0 then 'red'
    when p_source = 'citizen' then 'gray'
    when coalesce(p_progress, 0) >= 100 or coalesce(p_dpwh_status, '') ilike 'Completed%' then 'green'
    when p_target_date is null then 'gray'
    when p_today > p_target_date then 'red'
    when p_target_date - p_today <= 30 then 'yellow'
    else 'green'
  end;
$$;

-- 3. View used by the client
create or replace view public.project_status
with (security_invoker = true) as
select
  p.id,
  p.source,
  p.source_as_of,
  p.contract_id,
  p.title,
  p.contractor,
  p.implementing_office,
  p.budget_php,
  p.start_date,
  p.target_date,
  p.progress_pct,
  p.dpwh_status,
  p.lat,
  p.lng,
  p.created_at,
  (p.progress_pct >= 100 or coalesce(p.dpwh_status, '') ilike 'Completed%') as completed,
  (p.target_date - current_date) as days_to_target,
  coalesce(r.open_hazards, 0) as open_hazards,
  coalesce(r.total_reports, 0) as total_reports,
  coalesce(c.confirmations, 0) as confirmations,
  public.project_color(
    p.source, p.progress_pct, p.dpwh_status, p.target_date, coalesce(r.open_hazards, 0)
  ) as status
from public.projects p
left join (
  select
    project_id,
    count(*) filter (where kind = 'hazard' and status <> 'resolved') as open_hazards,
    count(*) as total_reports
  from public.reports
  group by project_id
) r on r.project_id = p.id
left join (
  select project_id, count(*) as confirmations
  from public.confirmations
  group by project_id
) c on c.project_id = p.id;

-- 4. Nearest project helper (Haversine)
-- shortcut: full scan over province rows (<5k), switch to PostGIS GiST index if all 247k national rows are loaded
create or replace function public.nearest_project(
  p_lat double precision,
  p_lng double precision,
  p_max_m double precision default 100
) returns table (id uuid, title text, contract_id text, distance_m double precision)
language sql stable security invoker as $$
  select id, title, contract_id, d as distance_m
  from (
    select
      p.id, p.title, p.contract_id,
      6371000 * 2 * asin(sqrt(
        power(sin(radians(p.lat - p_lat) / 2), 2) +
        cos(radians(p_lat)) * cos(radians(p.lat)) *
        power(sin(radians(p.lng - p_lng) / 2), 2)
      )) as d
    from public.projects p
    where p.lat between p_lat - (p_max_m / 111000.0) and p_lat + (p_max_m / 111000.0)
      and p.lng between p_lng - (p_max_m / 111000.0) and p_lng + (p_max_m / 111000.0)
  ) sub
  where d <= p_max_m
  order by d asc
  limit 20;
$$;

-- 5. RLS & Column-level privacy (hide user UUIDs from clients)
alter table public.projects enable row level security;
alter table public.reports enable row level security;
alter table public.confirmations enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Revoke table-wide select so created_by / user_id cannot be read by clients
revoke select on public.projects, public.reports, public.confirmations from anon, authenticated;

grant select (
  id, source, source_as_of, contract_id, title, contractor, implementing_office,
  budget_php, start_date, target_date, progress_pct, dpwh_status, lat, lng, created_at
) on public.projects to anon, authenticated;

grant select (
  id, project_id, kind, note, photo_path, ai_flags, status, admin_response, created_at
) on public.reports to anon, authenticated;

grant select (project_id, created_at) on public.confirmations to anon, authenticated;
grant select on public.project_status to anon, authenticated;
grant select on public.admins to authenticated;

grant insert (
  source, contract_id, title, contractor, implementing_office,
  budget_php, start_date, target_date, lat, lng
) on public.projects to authenticated;

grant insert (project_id, kind, note, photo_path, ai_flags) on public.reports to authenticated;
grant insert (project_id) on public.confirmations to authenticated;
grant update (status, admin_response), delete on public.reports to authenticated;
grant delete on public.projects to authenticated;

create policy "projects_read" on public.projects for select using (true);
create policy "projects_insert_citizen" on public.projects for insert to authenticated
  with check (source = 'citizen' and created_by = auth.uid());
create policy "projects_delete_admin" on public.projects for delete to authenticated
  using (source = 'citizen' and public.is_admin());

create policy "reports_read" on public.reports for select using (true);
create policy "reports_insert" on public.reports for insert to authenticated
  with check (created_by = auth.uid() and status = 'open' and admin_response is null);
create policy "reports_update_admin" on public.reports for update to authenticated
  using (public.is_admin());
create policy "reports_delete_admin" on public.reports for delete to authenticated
  using (public.is_admin());

create policy "confirmations_read" on public.confirmations for select using (true);
create policy "confirmations_insert" on public.confirmations for insert to authenticated
  with check (user_id = auth.uid());

create policy "admins_read_self" on public.admins for select to authenticated
  using (user_id = auth.uid());

-- 6. Storage policies for `photos` bucket
create policy "photos_public_read" on storage.objects for select
  using (bucket_id = 'photos');
create policy "photos_auth_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and storage.extension(name) = 'jpg');
create policy "photos_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());
```

### 2.2 `supabase/check.sql`
Run after any schema edit and on demo morning.

```sql
do $$
begin
  -- 1. Open hazard overrides everything (even citizen or completed)
  assert public.project_color('citizen', 0, null, null, 1, '2026-11-02') = 'red', 'hazard must be red';
  assert public.project_color('dpwh', 100, 'Completed', '2025-01-01', 1, '2026-11-02') = 'red', 'hazard on completed must be red';
  -- 2. Citizen record without hazard is gray
  assert public.project_color('citizen', 0, null, '2025-01-01', 0, '2026-11-02') = 'gray', 'citizen must be gray';
  -- 3. Completed DPWH project is green even if target_date is in the past
  assert public.project_color('dpwh', 100, 'On-Going', '2025-01-01', 0, '2026-11-02') = 'green', '100% must be green';
  assert public.project_color('dpwh', 80, 'Completed', '2025-01-01', 0, '2026-11-02') = 'green', 'Completed status must be green';
  -- 4. Missing target date is gray
  assert public.project_color('dpwh', 50, 'On-Going', null, 0, '2026-11-02') = 'gray', 'null target_date must be gray';
  -- 5. Past target date is red
  assert public.project_color('dpwh', 50, 'On-Going', '2026-10-01', 0, '2026-11-02') = 'red', 'past target must be red';
  -- 6. Within 30 days is yellow; >30 days is green
  assert public.project_color('dpwh', 50, 'On-Going', '2026-11-20', 0, '2026-11-02') = 'yellow', 'within 30d must be yellow';
  assert public.project_color('dpwh', 50, 'On-Going', '2027-02-01', 0, '2026-11-02') = 'green', '>30d must be green';
end $$;
```

### 2.3 `supabase/reset.sql`
Run before each judging slot to clear test submissions while keeping the DPWH snapshot.

```sql
delete from public.confirmations;
delete from public.reports;
delete from public.projects where source = 'citizen';
```

### 2.4 `supabase/find_demo_area.sql`
Run once after importing DPWH data to pick `NEXT_PUBLIC_DEMO_LAT` and `NEXT_PUBLIC_DEMO_LNG` where 4–10 pins of mixed colors sit within ~400 m.

```sql
select
  round(a.lat::numeric, 4) as center_lat,
  round(a.lng::numeric, 4) as center_lng,
  count(*) as pins_within_400m,
  count(*) filter (where b.status = 'red') as red,
  count(*) filter (where b.status = 'yellow') as yellow,
  count(*) filter (where b.status = 'green') as green,
  array_agg(b.contract_id) as contracts
from public.project_status a
join public.project_status b
  on abs(a.lat - b.lat) < 0.0036 and abs(a.lng - b.lng) < 0.0036
group by a.id, a.lat, a.lng
having count(*) between 4 and 12
   and count(*) filter (where b.status = 'red') >= 1
   and count(*) filter (where b.status = 'green') >= 1
order by count(*) filter (where b.status = 'yellow') desc, count(*) desc
limit 10;
```

---

## 3. DPWH Data Import (`scripts/`)

### 3.1 `scripts/import_dpwh.py`
```bash
pip install pandas pyarrow requests
python scripts/test_import_dpwh.py
python scripts/import_dpwh.py path/to/dpwh_transparency.parquet --province CAVITE --as-of 2026-10-15
```

```python
import argparse, math, os, re, sys
import pandas as pd
import requests


def norm_contract_id(val) -> str | None:
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    cleaned = re.sub(r"[^A-Z0-9]", "", str(val).upper())
    return cleaned or None


def clean_date(val) -> str | None:
    if val is None or pd.isna(val):
        return None
    s = str(val)[:10]
    return s if re.match(r"^\d{4}-\d{2}-\d{2}$", s) else None


def transform_row(row: dict, target_province: str, as_of: str) -> dict | None:
    loc = row.get("location") or {}
    prov = (loc.get("province") if isinstance(loc, dict) else row.get("province")) or ""
    if target_province.upper() not in str(prov).upper():
        return None

    lat, lng = row.get("latitude"), row.get("longitude")
    if lat is None or lng is None or pd.isna(lat) or pd.isna(lng):
        return None
    lat, lng = float(lat), float(lng)
    if not (4.0 <= lat <= 22.0 and 116.0 <= lng <= 128.0):
        return None

    cid = norm_contract_id(row.get("contractId"))
    title = str(row.get("description") or "").strip()
    if not cid or len(title) < 3:
        return None

    prog = row.get("progress")
    prog_val = 0.0 if prog is None or pd.isna(prog) else max(0.0, min(100.0, float(prog)))
    budget = row.get("budget")
    budget_val = None if budget is None or pd.isna(budget) else float(budget)

    return {
        "source": "dpwh",
        "source_as_of": as_of,
        "contract_id": cid,
        "title": title[:300],
        "contractor": (str(row.get("contractor") or "").strip() or None),
        "implementing_office": (str(prov).strip() or None),
        "budget_php": budget_val,
        "start_date": clean_date(row.get("startDate")),
        "target_date": clean_date(row.get("completionDate")),
        "progress_pct": prog_val,
        "dpwh_status": (str(row.get("status") or "").strip() or None),
        "lat": lat,
        "lng": lng,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("parquet_path")
    ap.add_argument("--province", default="CAVITE")
    ap.add_argument("--as-of", required=True, help="YYYY-MM-DD of snapshot")
    args = ap.parse_args()

    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1/projects?on_conflict=contract_id"
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    df = pd.read_parquet(args.parquet_path)
    records = {}
    for raw in df.to_dict(orient="records"):
        rec = transform_row(raw, args.province, args.as_of)
        if rec:
            records[rec["contract_id"]] = rec

    rows = list(records.values())
    print(f"Uploading {len(rows)} rows for {args.province}...")
    for i in range(0, len(rows), 500):
        batch = rows[i : i + 500]
        r = requests.post(url, headers=headers, json=batch, timeout=30)
        if not r.ok:
            sys.exit(f"Batch {i} failed ({r.status_code}): {r.text}")
    print("Done.")


if __name__ == "__main__":
    main()
```

### 3.2 `scripts/test_import_dpwh.py`
```python
from import_dpwh import norm_contract_id, transform_row

assert norm_contract_id("24-DF-0012 ") == "24DF0012"
assert norm_contract_id(None) is None

valid = {
    "contractId": "24-DF-0012",
    "description": "Concreting of Brgy Road, Imus",
    "contractor": "ABC Builders",
    "budget": 14500000.0,
    "progress": 65.5,
    "status": "On-Going",
    "startDate": "2026-01-15",
    "completionDate": "2026-09-30",
    "location": {"province": "Cavite", "region": "Region IV-A"},
    "latitude": 14.4296,
    "longitude": 120.9367,
}
out = transform_row(valid, "CAVITE", "2026-10-15")
assert out is not None and out["contract_id"] == "24DF0012" and out["budget_php"] == 14500000.0
assert transform_row({**valid, "latitude": 0.0}, "CAVITE", "2026-10-15") is None
assert transform_row(valid, "CEBU", "2026-10-15") is None
print("import_dpwh checks passed.")
```

---

## 4. Shared Client Helpers (`lib/` & `public/samples/`)

### 4.1 `lib/supabase.ts`
```ts
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
```

### 4.2 `lib/image.ts`
Resizes to ≤1600 px and re-encodes to JPEG, which strips EXIF GPS/device data and converts iPhone HEIC photos.

```ts
export async function normalizePhoto(file: File | Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image encode failed"))),
      "image/jpeg",
      0.82
    )
  );
}
```

### 4.3 `public/samples/manifest.json`
Replace `contract_id`, `lat`, `lng` and `canned` with the real values from your chosen demo projects after running `find_demo_area.sql`.

```json
[
  {
    "id": "sign-1",
    "mode": "sign",
    "label": "Sample DPWH Billboard #1",
    "image": "/samples/sign-1.jpg",
    "lat": 14.4296,
    "lng": 120.9367,
    "canned": {
      "is_project_sign": true,
      "contract_id": "24DF0012",
      "title": "Asset Preservation - Preventive Maintenance along Aguinaldo Hwy",
      "contractor": "Sample Contractor Inc.",
      "implementing_office": "Cavite 1st DEO",
      "budget_php": 14500000,
      "start_date": "2025-05-01",
      "target_date": "2025-11-30",
      "unreadable_fields": []
    }
  },
  {
    "id": "hazard-1",
    "mode": "hazard",
    "label": "Sample Open Trench Hazard",
    "image": "/samples/hazard-1.jpg",
    "lat": 14.4296,
    "lng": 120.9367,
    "canned": {
      "open_excavation": true,
      "barricade_visible": false,
      "warning_light_visible": false,
      "concerns": ["Open excavation along road shoulder", "No visible barricade or warning light"],
      "summary": "Open trench with no visible barricade or warning light."
    }
  }
]
```

---

## 5. AI Route Handler (`app/api/analyze/route.ts`)

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SIGN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_project_sign: { type: Type.BOOLEAN },
    contract_id: { type: Type.STRING, nullable: true },
    title: { type: Type.STRING, nullable: true },
    contractor: { type: Type.STRING, nullable: true },
    implementing_office: { type: Type.STRING, nullable: true },
    budget_php: { type: Type.NUMBER, nullable: true },
    start_date: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD or null" },
    target_date: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD or null" },
    unreadable_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["is_project_sign", "unreadable_fields"],
};

const HAZARD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    open_excavation: { type: Type.BOOLEAN, nullable: true },
    barricade_visible: { type: Type.BOOLEAN, nullable: true },
    warning_light_visible: { type: Type.BOOLEAN, nullable: true },
    concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
  },
  required: ["concerns", "summary"],
};

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: userRes, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const mode = form.get("mode");
  const file = form.get("image");
  if ((mode !== "sign" && mode !== "hazard") || !(file instanceof File))
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4_000_000)
    return NextResponse.json({ error: "Image must be JPEG/PNG/WebP <= 4MB" }, { status: 400 });

  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const prompt =
    mode === "sign"
      ? "Read this Philippine government construction billboard (DPWH/LGU paskil). Extract only facts visible in the photo. Convert dates to YYYY-MM-DD and budget to a plain PHP number. Put any field you cannot clearly read in unreadable_fields."
      : "Inspect this road-work photo for pedestrian/motorist hazards. Set booleans to null if unclear from the angle/lighting. Use cautious, advisory wording.";

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ inlineData: { mimeType: file.type, data: b64 } }, prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: mode === "sign" ? SIGN_SCHEMA : HAZARD_SCHEMA,
      },
    });
    return NextResponse.json(JSON.parse(res.text || "{}"));
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
```

---

## 6. Frontend Pages (`app/`)

### 6.1 `app/manifest.ts`
```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BantayAsenso",
    short_name: "BantayAsenso",
    description: "Scan road-work signs, see DPWH project status, and report hazards.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
```

### 6.2 `app/page.tsx` (Map home, Project card, +1, Share, Mailto, Nearby list)
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import {
  supabase,
  DEMO_CENTER,
  ensureAnonSession,
  ProjectStatusRow,
  statusCopy,
  buildComplaintMailto,
} from "@/lib/supabase";

const COLOR_HEX: Record<ProjectStatusRow["status"], string> = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  gray: "#9ca3af",
};

export default function HomePage() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [projects, setProjects] = useState<ProjectStatusRow[]>([]);
  const [selected, setSelected] = useState<ProjectStatusRow | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [showNearby, setShowNearby] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>(DEMO_CENTER);

  async function loadProjects() {
    const { data } = await supabase
      .from("project_status")
      .select("*")
      .gte("lat", DEMO_CENTER.lat - 0.15)
      .lte("lat", DEMO_CENTER.lat + 0.15)
      .gte("lng", DEMO_CENTER.lng - 0.15)
      .lte("lng", DEMO_CENTER.lng + 0.15);
    if (data) {
      setProjects(data as ProjectStatusRow[]);
      const pid = new URLSearchParams(window.location.search).get("project");
      if (pid) {
        const hit = (data as ProjectStatusRow[]).find((p) => p.id === pid);
        if (hit) selectProject(hit);
      }
    }
  }

  async function selectProject(p: ProjectStatusRow) {
    setSelected(p);
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 17, pitch: 55 });
    const { data } = await supabase
      .from("reports")
      .select("id, kind, note, photo_path, ai_flags, status, admin_response, created_at")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false });
    setReports(data || []);
  }

  useEffect(() => {
    ensureAnonSession().catch(() => {});
    loadProjects();
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [DEMO_CENTER.lng, DEMO_CENTER.lat],
      zoom: 16,
      pitch: 55,
    });
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const render = () => {
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: projects.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { id: p.id, color: COLOR_HEX[p.status] },
        })),
      };
      const src = map.getSource("projects") as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geojson);
        return;
      }
      map.addSource("projects", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "projects",
        filter: ["has", "point_count"],
        paint: { "circle-color": "#334155", "circle-radius": 18, "circle-stroke-width": 2, "circle-stroke-color": "#fff" },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "projects",
        filter: ["has", "point_count"],
        layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "pins",
        type: "circle",
        source: "projects",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 11,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.on("click", "pins", (e) => {
        const id = e.features?.[0]?.properties?.id;
        const hit = projects.find((x) => x.id === id);
        if (hit) selectProject(hit);
      });
    };
    if (map.isStyleLoaded()) render();
    else map.once("load", render);
  }, [projects]);

  async function confirmProject(p: ProjectStatusRow) {
    await ensureAnonSession();
    const { error } = await supabase.from("confirmations").insert({ project_id: p.id });
    if (!error) {
      const updated = { ...p, confirmations: p.confirmations + 1 };
      setSelected(updated);
      setProjects((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    }
  }

  function shareProject(p: ProjectStatusRow) {
    // Must run synchronously inside onClick for iOS Safari
    const url = `${window.location.origin}/?project=${p.id}`;
    const text = `${p.title} (${statusCopy(p)})`;
    if (navigator.share) navigator.share({ title: p.title, text, url }).catch(() => {});
    else window.location.href = buildComplaintMailto(p, window.location.origin);
  }

  const nearby = [...projects]
    .map((p) => ({
      ...p,
      distKm: Math.hypot(p.lat - userPos.lat, p.lng - userPos.lng) * 111,
    }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 15);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-slate-900 text-white">
      <div ref={mapEl} className="h-full w-full" />

      {/* Top banner + legend */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center justify-between rounded-xl bg-slate-900/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
          <div>
            <span className="font-bold text-sm">BantayAsenso</span>
            <span className="ml-2 text-slate-300">DPWH Transparency Portal snapshot</span>
          </div>
          <button
            onClick={() => setShowNearby((v) => !v)}
            className="rounded-lg bg-slate-700 px-2.5 py-1 font-medium"
          >
            {showNearby ? "Hide Nearby" : "Nearby List"}
          </button>
        </div>
        <div className="flex gap-3 self-start rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px]">
          <span>🟢 On track / Done</span>
          <span>🟡 ≤30d left</span>
          <span>🔴 Past target / Hazard</span>
          <span>⚪ Unverified citizen</span>
        </div>
      </div>

      {/* Nearby drawer (F10) */}
      {showNearby && (
        <div className="absolute inset-x-3 top-24 max-h-72 overflow-y-auto rounded-xl bg-slate-900/95 p-3 text-xs shadow-xl">
          <div className="mb-2 font-semibold">Nearest projects (no billboard needed)</div>
          {nearby.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setShowNearby(false);
                selectProject(p);
              }}
              className="flex w-full items-center justify-between border-b border-slate-800 py-2 text-left"
            >
              <span className="truncate pr-2">{p.title}</span>
              <span className="shrink-0 text-slate-400">{p.distKm.toFixed(2)} km</span>
            </button>
          ))}
        </div>
      )}

      {/* Primary Scan FAB */}
      <div className="  absolute inset-x-0 bottom-6 flex justify-center gap-3">
        <Link
          href="/scan?mode=sign"
          className="rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl"
        >
          📷 Scan Sign
        </Link>
        <Link
          href="/scan?mode=hazard"
          className="rounded-full bg-red-500 px-5 py-3.5 text-sm font-bold text-white shadow-xl"
        >
          ⚠️ Report Hazard
        </Link>
      </div>

      {/* Bottom sheet project card (F2) */}
      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-20 max-h-[75dvh] overflow-y-auto rounded-t-2xl bg-slate-900 p-4 shadow-2xl border-t border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs uppercase text-slate-400">
                {selected.contract_id ?? "No Contract ID"} · {selected.source.toUpperCase()}
              </span>
              <h2 className="text-base font-bold leading-snug">{selected.title}</h2>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 text-lg px-2">✕</button>
          </div>

          <p className="mt-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-amber-300">
            {statusCopy(selected)}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>Contractor: <b>{selected.contractor ?? "Unlisted"}</b></div>
            <div>Budget: <b>{selected.budget_php ? `₱${Number(selected.budget_php).toLocaleString()}` : "Unlisted"}</b></div>
            <div>Target Date: <b>{selected.target_date ?? "Unlisted"}</b></div>
            <div>DPWH Progress: <b>{selected.progress_pct}%</b></div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => confirmProject(selected)}
              className="rounded-lg bg-slate-800 px-3 py-2 font-semibold"
            >
              👍 I see this too ({selected.confirmations})
            </button>
            <Link
              href={`/scan?mode=hazard&project=${selected.id}`}
              className="rounded-lg bg-red-600 px-3 py-2 font-semibold"
            >
              ⚠️ Flag Hazard
            </Link>
            <Link
              href={`/scan?mode=update&project=${selected.id}`}
              className="rounded-lg bg-slate-800 px-3 py-2 font-semibold"
            >
              📝 Post Update
            </Link>
            <a
              href={buildComplaintMailto(selected, typeof window !== "undefined" ? window.location.origin : "")}
              className="rounded-lg bg-amber-500 px-3 py-2 font-semibold text-slate-950"
            >
              ✉️ Email DPWH
            </a>
            <button
              onClick={() => shareProject(selected)}
              className="rounded-lg bg-slate-800 px-3 py-2 font-semibold"
            >
              Share
            </button>
          </div>

          {reports.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-800 pt-3 text-xs">
              <div className="font-semibold text-slate-400">Citizen reports ({reports.length})</div>
              {reports.map((r) => (
                <div key={r.id} className="rounded-lg bg-slate-800/70 p-2.5">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{r.kind.toUpperCase()} · {r.status}</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.note && <p className="mt-1">{r.note}</p>}
                  {r.ai_flags?.summary && (
                    <p className="mt-1 text-amber-300">
                      AI check: {r.ai_flags.summary} <i>(Automated check, please verify.)</i>
                    </p>
                  )}
                  {r.photo_path && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${r.photo_path}`}
                      alt="report"
                      className="mt-2 max-h-40 rounded"
                    />
                  )}
                  {r.admin_response && (
                    <p className="mt-1.5 rounded bg-emerald-950/80 p-1.5 text-emerald-300">
                      <b>Official Response:</b> {r.admin_response}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
```

### 6.3 `app/scan/page.tsx` (Camera, Sample fallback, AI call, Save/Match)
```tsx
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
      setFields(await res.json());
      setStatusMsg("");
    } catch {
      if (cannedFallback) {
        setFields(cannedFallback);
        setStatusMsg("Loaded sample preset (offline/timeout fallback).");
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
        const cid = normContractId(fields.contract_id);
        if (cid) {
          const { data: existing } = await supabase
            .from("projects")
            .select("id")
            .eq("contract_id", cid)
            .maybeSingle();
          if (existing) {
            router.push(`/?project=${existing.id}`);
            return;
          }
        }
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
```

### 6.4 `app/admin/page.tsx` (Admin login, response & moderation)
```tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  async function loadQueue() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: adm } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adm) return;
    setIsAdmin(true);
    const { data } = await supabase
      .from("reports")
      .select("id, project_id, kind, note, photo_path, ai_flags, status, admin_response, created_at")
      .order("created_at", { ascending: false });
    setReports(data || []);
  }

  useEffect(() => { loadQueue(); }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    await supabase.auth.signInWithPassword({ email, password });
    await loadQueue();
  }

  async function updateReport(id: string, status: string, admin_response: string) {
    await supabase.from("reports").update({ status, admin_response }).eq("id", id);
    await loadQueue();
  }

  async function deleteReport(id: string) {
    await supabase.from("reports").delete().eq("id", id);
    await loadQueue();
  }

  if (!isAdmin) {
    return (
      <form onSubmit={login} className="mx-auto max-w-sm space-y-3 p-6 text-white">
        <h1 className="text-lg font-bold">LGU / Admin Sign In</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded bg-slate-800 p-2" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded bg-slate-800 p-2" />
        <button className="w-full rounded bg-emerald-500 py-2 font-bold text-slate-950">Sign In</button>
      </form>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-950 p-4 text-white text-xs space-y-3">
      <h1 className="text-lg font-bold">Moderation & Response Queue ({reports.length})</h1>
      {reports.map((r) => (
        <div key={r.id} className="space-y-2 rounded-xl bg-slate-900 p-3">
          <div className="flex justify-between text-slate-400">
            <span>{r.kind.toUpperCase()} · Status: <b>{r.status}</b></span>
            <button onClick={() => deleteReport(r.id)} className="text-red-400">Delete</button>
          </div>
          {r.note && <p>{r.note}</p>}
          {r.ai_flags?.summary && <p className="text-amber-300">AI: {r.ai_flags.summary}</p>}
          <div className="flex gap-2">
            {["open", "acknowledged", "resolved"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  const reply = prompt("Public response (optional):", r.admin_response || "");
                  if (reply !== null) updateReport(r.id, st, reply);
                }}
                className="rounded bg-slate-800 px-2.5 py-1 capitalize"
              >
                Mark {st}
              </button>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
```

