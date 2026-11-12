"""Data validation helpers for uploaded CSVs."""
from __future__ import annotations
import pandas as pd
from typing import Dict, Any, List


REQUIRED_COLS = {"vehicle_id", "timestamp_utc", "latitude", "longitude"}
OPTIONAL_COLS = {"speed_kmh", "heading_deg", "camera_id", "camera_name", "vehicle_type"}

LAT_MIN, LAT_MAX = -90.0, 90.0
LON_MIN, LON_MAX = -180.0, 180.0
SPEED_MAX = 300.0  # km/h – hard upper bound


def validate(df: pd.DataFrame, col_map: Dict[str, str]) -> Dict[str, Any]:
    """
    Validate a raw dataframe using the provided column mapping.
    col_map maps canonical names → actual column names in df.
    Returns a validation report dict.
    """
    report: Dict[str, Any] = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "row_count": len(df),
        "col_count": len(df.columns),
        "missing_values": {},
        "duplicate_rows": 0,
        "invalid_lat": 0,
        "invalid_lon": 0,
        "invalid_speed": 0,
        "detected_columns": list(df.columns),
    }

    # --- Required column check ---
    missing_required: List[str] = []
    for canon in REQUIRED_COLS:
        actual = col_map.get(canon)
        if actual is None or actual not in df.columns:
            missing_required.append(canon)

    if missing_required:
        report["valid"] = False
        report["errors"].append(
            f"Missing required columns: {', '.join(missing_required)}. "
            f"Please map them in the column mapping settings."
        )
        return report

    # --- Rename to canonical for analysis ---
    rev_map = {v: k for k, v in col_map.items() if v in df.columns}
    df = df.rename(columns=rev_map)

    # --- Duplicates ---
    dup_count = int(df.duplicated().sum())
    report["duplicate_rows"] = dup_count
    if dup_count > 0:
        report["warnings"].append(f"{dup_count} duplicate rows detected – they will be removed during preprocessing.")

    # --- Missing values ---
    for col in df.columns:
        n_miss = int(df[col].isna().sum())
        if n_miss:
            report["missing_values"][col] = n_miss

    if report["missing_values"]:
        report["warnings"].append(
            f"Missing values found in columns: {list(report['missing_values'].keys())}"
        )

    # --- Latitude / Longitude validation ---
    lat_col = "latitude"
    lon_col = "longitude"
    try:
        lat = pd.to_numeric(df[lat_col], errors="coerce")
        lon = pd.to_numeric(df[lon_col], errors="coerce")
        invalid_lat = int(((lat < LAT_MIN) | (lat > LAT_MAX) | lat.isna()).sum())
        invalid_lon = int(((lon < LON_MIN) | (lon > LON_MAX) | lon.isna()).sum())
        report["invalid_lat"] = invalid_lat
        report["invalid_lon"] = invalid_lon
        if invalid_lat:
            report["warnings"].append(f"{invalid_lat} rows have invalid latitude values.")
        if invalid_lon:
            report["warnings"].append(f"{invalid_lon} rows have invalid longitude values.")
    except Exception as exc:
        report["warnings"].append(f"Could not validate coordinates: {exc}")

    # --- Speed validation ---
    if "speed_kmh" in df.columns:
        spd = pd.to_numeric(df["speed_kmh"], errors="coerce")
        invalid_spd = int(((spd < 0) | (spd > SPEED_MAX) | spd.isna()).sum())
        report["invalid_speed"] = invalid_spd
        if invalid_spd:
            report["warnings"].append(f"{invalid_spd} rows have invalid speed values (< 0 or > {SPEED_MAX} km/h).")

    # --- Timestamp check ---
    try:
        pd.to_datetime(df["timestamp_utc"])
    except Exception:
        report["errors"].append("Column 'timestamp_utc' could not be parsed as datetime.")
        report["valid"] = False

    if report["errors"]:
        report["valid"] = False

    return report
