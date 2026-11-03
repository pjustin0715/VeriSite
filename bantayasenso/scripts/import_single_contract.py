import argparse, json, os, re, sys
import pandas as pd
import requests

from import_dpwh import clean_date, norm_contract_id

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("parquet_path")
    ap.add_argument("--contract-id", required=True, help="Contract ID from the billboard photo")
    ap.add_argument("--as-of", default="2026-10-15")
    ap.add_argument("--lat", type=float, help="Override latitude if missing or to place near demo center")
    ap.add_argument("--lng", type=float, help="Override longitude if missing or to place near demo center")
    args = ap.parse_args()

    target_cid = norm_contract_id(args.contract_id)
    print(f"Searching for contract ID: '{target_cid}' (input: '{args.contract_id}') in {args.parquet_path}...")

    df = pd.read_parquet(args.parquet_path)
    cid_col = "contractId" if "contractId" in df.columns else "contract_id"
    
    matches = df[df[cid_col].astype(str).apply(norm_contract_id) == target_cid]
    if matches.empty:
        # Partial / fallback search
        cleaned_input = re.sub(r"[^A-Z0-9]", "", args.contract_id.upper())
        matches = df[df[cid_col].astype(str).str.upper().str.contains(cleaned_input, na=False)]

    if matches.empty:
        sys.exit(f"Error: Contract ID '{args.contract_id}' not found in {args.parquet_path}.")

    row = matches.iloc[0].to_dict()
    print("Found entry in parquet:")
    for k, v in row.items():
        if v is not None and not (isinstance(v, float) and pd.isna(v)):
            print(f"  {k}: {str(v)[:100]}")

    lat = args.lat if args.lat is not None else row.get("latitude")
    lng = args.lng if args.lng is not None else row.get("longitude")

    if lat is None or lng is None or pd.isna(lat) or pd.isna(lng):
        sys.exit(
            "Error: This parquet entry has no coordinates. "
            "Please pass --lat <lat> --lng <lng> to place it on the demo map."
        )

    lat, lng = float(lat), float(lng)
    prog = row.get("progress")
    prog_val = 0.0 if prog is None or pd.isna(prog) else max(0.0, min(100.0, float(prog)))
    budget = row.get("budget")
    budget_val = None if budget is None or pd.isna(budget) else float(budget)
    prov = row.get("province") or (row.get("location") or {}).get("province") if isinstance(row.get("location"), dict) else ""

    rec = {
        "source": "dpwh",
        "source_as_of": args.as_of,
        "contract_id": target_cid,
        "title": str(row.get("description") or row.get("title") or "").strip()[:300],
        "contractor": (str(row.get("contractor") or "").strip() or None),
        "implementing_office": (str(row.get("implementing_office") or row.get("region") or prov).strip() or None),
        "budget_php": budget_val,
        "start_date": clean_date(row.get("startDate")),
        "target_date": clean_date(row.get("completionDate")),
        "progress_pct": prog_val,
        "dpwh_status": (str(row.get("status") or "").strip() or None),
        "lat": lat,
        "lng": lng,
    }

    env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_file):
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k.strip()] = v.strip()

    base_url = re.sub(r"/rest/v1/?$", "", os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"))
    url = f"{base_url}/rest/v1/projects?on_conflict=contract_id"
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    r = requests.post(url, headers=headers, json=[rec], timeout=30)
    if not r.ok:
        sys.exit(f"Upload failed ({r.status_code}): {r.text}")

    print("\nSuccessfully uploaded to Supabase:")
    print(json.dumps(r.json(), indent=2))

if __name__ == "__main__":
    main()

