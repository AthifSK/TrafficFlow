"""Feature extraction endpoints."""
from __future__ import annotations
import pandas as pd
from fastapi import APIRouter, HTTPException
from app.core import state
from app.feature_engineering.extractor import extract_features, get_model_feature_cols

router = APIRouter()


@router.post("/extract")
def run_feature_extraction():
    df: pd.DataFrame = state.get("preprocessed_df")
    if df is None:
        raise HTTPException(status_code=400, detail="Run preprocessing first.")

    features_df = extract_features(df)
    feat_cols = get_model_feature_cols(features_df)

    state.update({
        "features_df": features_df,
        "feature_cols": feat_cols,
    })
    state.clear_model()

    return {
        "message": "Feature extraction complete.",
        "n_trajectories": len(features_df),
        "feature_columns": feat_cols,
        "preview": features_df.head(5).fillna("").to_dict(orient="records"),
    }


@router.get("/preview")
def features_preview():
    df: pd.DataFrame = state.get("features_df")
    if df is None:
        raise HTTPException(status_code=400, detail="Feature extraction has not been run yet.")
    return {
        "n_trajectories": len(df),
        "feature_columns": state.get("feature_cols"),
        "preview": df.head(10).fillna("").to_dict(orient="records"),
    }
