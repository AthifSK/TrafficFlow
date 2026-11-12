"""Upload endpoint – accepts CSV files."""
from __future__ import annotations
import io
import pandas as pd
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.core import state
from app.preprocessing.validator import validate

router = APIRouter()

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 100 MB size limit.")

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")

    # Reset state for new upload
    state.update({
        "raw_df": df,
        "upload_meta": {
            "filename": file.filename,
            "size_bytes": len(contents),
            "row_count": len(df),
            "col_count": len(df.columns),
            "columns": list(df.columns),
        },
        "col_map": {},
        "preprocessed_df": None,
        "preprocess_report": {},
        "features_df": None,
    })
    state.clear_model()

    # Auto-detect column mapping from common names
    auto_map = _auto_detect(list(df.columns))
    state.set("col_map", auto_map)

    return {
        "message": "File uploaded successfully.",
        "filename": file.filename,
        "size_bytes": len(contents),
        "row_count": len(df),
        "col_count": len(df.columns),
        "columns": list(df.columns),
        "auto_col_map": auto_map,
    }


def _auto_detect(cols: list) -> dict:
    """Heuristic: map canonical names to actual column names."""
    canonical = {
        "vehicle_id": ["vehicle_id", "vid", "vehicle", "car_id", "plate", "id"],
        "timestamp_utc": ["timestamp_utc", "timestamp", "time", "datetime", "ts", "observed_at"],
        "latitude": ["latitude", "lat", "y"],
        "longitude": ["longitude", "lon", "lng", "long", "x"],
        "speed_kmh": ["speed_kmh", "speed", "spd", "velocity"],
        "heading_deg": ["heading_deg", "heading", "direction", "angle", "bearing"],
        "camera_id": ["camera_id", "cam_id", "camera", "sensor_id"],
        "camera_name": ["camera_name", "cam_name", "location_name"],
        "vehicle_type": ["vehicle_type", "type", "class", "category"],
    }
    lower_cols = {c.lower(): c for c in cols}
    mapping = {}
    for canon, candidates in canonical.items():
        for cand in candidates:
            if cand.lower() in lower_cols:
                mapping[canon] = lower_cols[cand.lower()]
                break
    return mapping
