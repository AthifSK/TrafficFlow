"""Data preprocessing pipeline: clean, sort, and structure observations."""
from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple


LAT_MIN, LAT_MAX = -90.0, 90.0
LON_MIN, LON_MAX = -180.0, 180.0
SPEED_MAX = 300.0


def preprocess(raw_df: pd.DataFrame, col_map: Dict[str, str]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Clean and sort the raw observations dataframe.
    Returns (cleaned_df, report).
    cleaned_df has canonical column names.
    """
    report: Dict[str, Any] = {
        "initial_rows": len(raw_df),
        "steps": [],
    }
    removed: Dict[str, int] = {}

    # --- Rename to canonical names ---
    rev_map = {v: k for k, v in col_map.items() if v in raw_df.columns}
    df = raw_df.rename(columns=rev_map).copy()

    # --- Remove duplicates ---
    before = len(df)
    df = df.drop_duplicates()
    removed["duplicates"] = before - len(df)
    report["steps"].append({
        "step": "Remove duplicates",
        "removed": removed["duplicates"],
        "reason": "Identical rows"
    })

    # --- Parse timestamp ---
    before = len(df)
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True, errors="coerce")
    bad_ts = df["timestamp_utc"].isna().sum()
    df = df.dropna(subset=["timestamp_utc"])
    removed["bad_timestamp"] = int(bad_ts)
    report["steps"].append({
        "step": "Parse timestamps",
        "removed": removed["bad_timestamp"],
        "reason": "Unparseable timestamp"
    })

    # --- Parse / validate latitude ---
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    bad_lat = ((df["latitude"] < LAT_MIN) | (df["latitude"] > LAT_MAX) | df["latitude"].isna()).sum()
    df = df[df["latitude"].between(LAT_MIN, LAT_MAX)]
    removed["bad_lat"] = int(bad_lat)
    report["steps"].append({
        "step": "Validate latitude",
        "removed": removed["bad_lat"],
        "reason": f"Outside [{LAT_MIN}, {LAT_MAX}] or null"
    })

    # --- Parse / validate longitude ---
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    bad_lon = ((df["longitude"] < LON_MIN) | (df["longitude"] > LON_MAX) | df["longitude"].isna()).sum()
    df = df[df["longitude"].between(LON_MIN, LON_MAX)]
    removed["bad_lon"] = int(bad_lon)
    report["steps"].append({
        "step": "Validate longitude",
        "removed": removed["bad_lon"],
        "reason": f"Outside [{LON_MIN}, {LON_MAX}] or null"
    })

    # --- Validate speed ---
    if "speed_kmh" in df.columns:
        df["speed_kmh"] = pd.to_numeric(df["speed_kmh"], errors="coerce")
        bad_spd = ((df["speed_kmh"] < 0) | (df["speed_kmh"] > SPEED_MAX)).sum()
        df.loc[(df["speed_kmh"] < 0) | (df["speed_kmh"] > SPEED_MAX), "speed_kmh"] = np.nan
        removed["bad_speed"] = int(bad_spd)
        report["steps"].append({
            "step": "Validate speed",
            "removed": 0,
            "nullified": removed["bad_speed"],
            "reason": f"Set to null if outside [0, {SPEED_MAX}] km/h"
        })

    if "heading_deg" in df.columns:
        df["heading_deg"] = pd.to_numeric(df["heading_deg"], errors="coerce")

    # --- Remove vehicles with fewer than 2 observations ---
    counts = df.groupby("vehicle_id")["vehicle_id"].transform("count")
    before = len(df)
    df = df[counts >= 2]
    removed["short_traj"] = before - len(df)
    report["steps"].append({
        "step": "Remove short trajectories",
        "removed": removed["short_traj"],
        "reason": "Vehicle has < 2 observations (cannot form a trajectory)"
    })

    # --- Sort ---
    df = df.sort_values(["vehicle_id", "timestamp_utc"]).reset_index(drop=True)

    report["final_rows"] = len(df)
    report["total_removed"] = report["initial_rows"] - report["final_rows"]
    report["unique_vehicles"] = int(df["vehicle_id"].nunique())
    report["removed_breakdown"] = removed

    return df, report
