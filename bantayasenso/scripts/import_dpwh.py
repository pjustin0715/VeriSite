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
    loc = row.get("location")
    prov = row.get("province") or (loc.get("province") if isinstance(loc, dict) else loc) or ""
    if target_province.upper() not in str(prov).upper():
        return None

    lat = row.get("latitude") if row.get("latitude") is not None else row.get("lat")
    lng = row.get("longitude") if row.get("longitude") is not None else row.get("lng")
    if lat is None or lng is None or pd.isna(lat) or pd.isna(lng):
        return None
    lat, lng = float(lat), float(lng)
    if not (4.0 <= lat <= 22.0 and 116.0 <= lng <= 128.0):
        return None

    cid = norm_contract_id(row.get("contractId") or row.get("contract_id"))
    title = str(row.get("description") or row.get("title") or "").strip()
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

    env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_file):
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k.strip()] = v.strip()

    raw_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    base_url = re.sub(r"/rest/v1/?$", "", raw_url)
    url = f"{base_url}/rest/v1/projects?on_conflict=contract_id"
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