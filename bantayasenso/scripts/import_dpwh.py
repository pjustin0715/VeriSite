import argparse, math, os, re, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import requests

LUZON_REGIONS = {
    "NATIONAL CAPITAL REGION",
    "CORDILLERA ADMINISTRATIVE REGION",
    "REGION I",
    "REGION II",
    "REGION III",
    "REGION IV-A",
    "REGION IV-B",
    "REGION V",
}


def clean_str(val) -> str:
    if val is None or (isinstance(val, float) and math.isnan(val)) or pd.isna(val):
        return ""
    return str(val).strip()


def norm_contract_id(val) -> str | None:
    s = clean_str(val)
    if not s:
        return None
    cleaned = re.sub(r"[^A-Z0-9]", "", s.upper())
    return cleaned or None


def clean_date(val) -> str | None:
    s = clean_str(val)[:10]
    return s if re.match(r"^\d{4}-\d{2}-\d{2}$", s) else None


def transform_row(row: dict, target_province: str, as_of: str) -> dict | None:
    loc = row.get("location")
    prov = clean_str(row.get("province")) or (clean_str(loc.get("province")) if isinstance(loc, dict) else clean_str(loc))
    reg = clean_str(row.get("region")) or (clean_str(loc.get("region")) if isinstance(loc, dict) else "")
    target = target_province.upper()

    if target == "LUZON":
        if reg.upper() not in LUZON_REGIONS:
            return None
    elif target != "ALL" and target not in prov.upper() and target not in reg.upper():
        return None

    lat = row.get("latitude") if row.get("latitude") is not None else row.get("lat")
    lng = row.get("longitude") if row.get("longitude") is not None else row.get("lng")
    if lat is None or lng is None or pd.isna(lat) or pd.isna(lng):
        return None
    lat, lng = float(lat), float(lng)
    if not (4.0 <= lat <= 22.0 and 116.0 <= lng <= 128.0):
        return None

    cid = norm_contract_id(row.get("contractId") or row.get("contract_id"))
    title = clean_str(row.get("description") or row.get("title"))
    if not cid or len(title) < 3:
        return None

    prog = row.get("progress")
    prog_val = 0.0 if prog is None or pd.isna(prog) else max(0.0, min(100.0, float(prog)))
    budget = row.get("budget")
    budget_val = None if budget is None or pd.isna(budget) or float(budget) < 0 else float(budget)

    return {
        "source": "dpwh",
        "source_as_of": as_of,
        "contract_id": cid,
        "title": title[:300],
        "contractor": clean_str(row.get("contractor")) or None,
        "implementing_office": (prov or reg or None),
        "budget_php": budget_val,
        "start_date": clean_date(row.get("startDate")),
        "target_date": clean_date(row.get("completionDate")),
        "progress_pct": prog_val,
        "dpwh_status": clean_str(row.get("status")) or None,
        "lat": lat,
        "lng": lng,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("parquet_path")
    ap.add_argument("--province", default="LUZON", help="Province name, LUZON, or ALL")
    ap.add_argument("--as-of", default="2025-11-03", help="YYYY-MM-DD of snapshot")
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
    print(f"Uploading {len(rows)} rows for {args.province} (as of {args.as_of})...")
    batches = [(i, rows[i : i + 1000]) for i in range(0, len(rows), 1000)]

    session = requests.Session()
    session.headers.update(headers)

    def upload_batch(item):
        idx, batch = item
        for attempt in range(3):
            try:
                r = session.post(url, json=batch, timeout=60)
                if r.ok:
                    return idx, len(batch)
                if attempt == 2:
                    raise RuntimeError(f"Batch {idx} failed ({r.status_code}): {r.text}")
            except Exception as e:
                if attempt == 2:
                    raise

    done = 0
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(upload_batch, b) for b in batches]
        for fut in as_completed(futures):
            _, count = fut.result()
            done += count
            if done % 10000 < 1000 or done == len(rows):
                print(f"  Uploaded {done}/{len(rows)} rows...")
    print("Done.")


if __name__ == "__main__":
    main()
