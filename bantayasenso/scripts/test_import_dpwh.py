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
top_level_valid = {**valid, "location": None, "province": "Cavite"}
assert transform_row(top_level_valid, "CAVITE", "2026-10-15") is not None
assert transform_row({**valid, "region": "Region IV-A"}, "LUZON", "2025-11-03")["source_as_of"] == "2025-11-03"
assert transform_row({**valid, "location": None, "region": "National Capital Region"}, "LUZON", "2025-11-03") is None
assert transform_row({**valid, "location": None, "region": "Region VII"}, "LUZON", "2025-11-03") is None
print("import_dpwh checks passed.")