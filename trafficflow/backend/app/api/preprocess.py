"""Preprocessing endpoints."""
from __future__ import annotations
import pandas as pd
from fastapi import APIRouter, HTTPException
from app.core import state
from app.preprocessing.cleaner import preprocess

router = APIRouter()


@router.post("")
def run_preprocess():
    df: pd.DataFrame = state.get("raw_df")
    col_map: dict = state.get("col_map")
    if df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded yet.")
    if not col_map:
        raise HTTPException(status_code=400, detail="Column mapping not configured.")

    cleaned, report = preprocess(df, col_map)
    state.update({
        "preprocessed_df": cleaned,
        "preprocess_report": report,
        "features_df": None,          # invalidate downstream
    })
    state.clear_model()
    return {"message": "Preprocessing complete.", "report": report}


@router.get("/report")
def preprocess_report():
    report = state.get("preprocess_report")
    if not report:
        raise HTTPException(status_code=400, detail="Preprocessing has not been run yet.")
    return report


@router.get("/preview")
def preprocessed_preview():
    df: pd.DataFrame = state.get("preprocessed_df")
    if df is None:
        raise HTTPException(status_code=400, detail="Preprocessing has not been run yet.")
    sample = df.head(20).fillna("").astype(str).to_dict(orient="records")
    return {
        "row_count": len(df),
        "col_count": len(df.columns),
        "columns": list(df.columns),
        "preview_rows": sample,
        "unique_vehicles": int(df["vehicle_id"].nunique()),
    }
