"""Trajectory feature extraction using Haversine geometry."""
from __future__ import annotations
import numpy as np
import pandas as pd
from typing import List


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in km."""
    R = 6371.0
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlam = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlam / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def initial_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return initial bearing in degrees [0, 360)."""
    lat1r, lat2r = np.radians(lat1), np.radians(lat2)
    dlon = np.radians(lon2 - lon1)
    x = np.sin(dlon) * np.cos(lat2r)
    y = np.cos(lat1r) * np.sin(lat2r) - np.sin(lat1r) * np.cos(lat2r) * np.cos(dlon)
    brng = np.degrees(np.arctan2(x, y)) % 360
    return brng


def extract_features(obs_df: pd.DataFrame) -> pd.DataFrame:
    """
    Given a preprocessed observations dataframe (canonical columns),
    compute one feature row per vehicle_id.
    """
    records = []
    for vid, grp in obs_df.groupby("vehicle_id"):
        grp = grp.sort_values("timestamp_utc").reset_index(drop=True)
        n = len(grp)

        lats = grp["latitude"].values
        lons = grp["longitude"].values
        ts = grp["timestamp_utc"]

        # Duration
        duration_s = (ts.iloc[-1] - ts.iloc[0]).total_seconds()

        # Path length
        path_km = sum(
            haversine_km(lats[i], lons[i], lats[i + 1], lons[i + 1])
            for i in range(n - 1)
        )

        # Displacement (straight-line start→end)
        displacement_km = haversine_km(lats[0], lons[0], lats[-1], lons[-1])

        # Speed
        if "speed_kmh" in grp.columns:
            spd = pd.to_numeric(grp["speed_kmh"], errors="coerce")
            mean_spd = float(spd.mean()) if spd.notna().any() else np.nan
            max_spd = float(spd.max()) if spd.notna().any() else np.nan
        else:
            mean_spd = max_spd = np.nan

        # Heading / bearing
        if "heading_deg" in grp.columns:
            hdg = pd.to_numeric(grp["heading_deg"], errors="coerce")
            diffs = hdg.diff().abs().dropna()
            diffs = diffs.apply(lambda d: 360 - d if d > 180 else d)
            mean_hc = float(diffs.mean()) if len(diffs) else np.nan
        else:
            mean_hc = np.nan

        bearing = initial_bearing(lats[0], lons[0], lats[-1], lons[-1])
        bear_sin = np.sin(np.radians(bearing))
        bear_cos = np.cos(np.radians(bearing))

        row = {
            "vehicle_id": vid,
            "point_count": n,
            "duration_seconds": duration_s,
            "path_length_km": round(path_km, 4),
            "displacement_km": round(displacement_km, 4),
            "mean_speed_kmh": round(mean_spd, 4) if not np.isnan(mean_spd) else None,
            "max_speed_kmh": round(max_spd, 4) if not np.isnan(max_spd) else None,
            "start_latitude": round(float(lats[0]), 6),
            "start_longitude": round(float(lons[0]), 6),
            "end_latitude": round(float(lats[-1]), 6),
            "end_longitude": round(float(lons[-1]), 6),
            "mean_latitude": round(float(np.mean(lats)), 6),
            "mean_longitude": round(float(np.mean(lons)), 6),
            "initial_bearing_sin": round(bear_sin, 6),
            "initial_bearing_cos": round(bear_cos, 6),
            "mean_heading_change_deg": round(mean_hc, 4) if mean_hc and not np.isnan(mean_hc) else None,
        }

        # Optional camera columns
        for opt in ["camera_id", "camera_name", "vehicle_type"]:
            if opt in grp.columns:
                vals = grp[opt].dropna().unique().tolist()
                row[opt + "_seq"] = "|".join(str(v) for v in vals)

        records.append(row)

    return pd.DataFrame(records)


def get_model_feature_cols(features_df: pd.DataFrame) -> List[str]:
    """
    Return numeric feature column names suitable for ML (excludes vehicle_id
    and string/sequence columns).
    """
    exclude = {"vehicle_id"}
    cols = []
    for c in features_df.columns:
        if c in exclude:
            continue
        if features_df[c].dtype in [np.float64, np.int64, float, int]:
            cols.append(c)
        elif pd.api.types.is_numeric_dtype(features_df[c]):
            cols.append(c)
    return cols
