"""Dataset preview and column mapping endpoints."""
from __future__ import annotations
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
from app.core import state
from app.preprocessing.validator import validate

router = APIRouter()


class ColMapUpdate(BaseModel):
    col_map: Dict[str, str]


@router.get("/preview")
def dataset_preview():
    df: pd.DataFrame = state.get("raw_df")
    if df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded yet.")
    meta = state.get("upload_meta") or {}
    sample = df.head(10).fillna("").to_dict(orient="records")
    return {
        **meta,
        "preview_rows": sample,
        "col_map": state.get("col_map"),
    }


@router.post("/validate")
def validate_dataset(body: ColMapUpdate):
    df: pd.DataFrame = state.get("raw_df")
    if df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded yet.")
    state.set("col_map", body.col_map)
    report = validate(df, body.col_map)
    return report


@router.post("/colmap")
def update_col_map(body: ColMapUpdate):
    if state.get("raw_df") is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded yet.")
    state.set("col_map", body.col_map)
    return {"message": "Column mapping updated.", "col_map": body.col_map}
