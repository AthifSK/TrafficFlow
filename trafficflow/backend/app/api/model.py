"""Model training, comparison, and cluster assignment endpoints."""
from __future__ import annotations
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.core import state
from app.models.clustering import (
    train_kmeans, predict_kmeans,
    train_dbscan, assign_dbscan,
    compare_algorithms,
    load_kmeans_artifacts, load_dbscan_artifacts,
)

router = APIRouter()


class KMeansParams(BaseModel):
    n_clusters: int = Field(4, ge=2, le=50)
    random_state: int = Field(42, ge=0)


class DBSCANParams(BaseModel):
    eps: float = Field(0.5, gt=0)
    min_samples: int = Field(3, ge=1)


class TrainRequest(BaseModel):
    algorithm: str = "kmeans"   # "kmeans" | "dbscan" | "both"
    kmeans: Optional[KMeansParams] = None
    dbscan: Optional[DBSCANParams] = None


def _get_features():
    df: pd.DataFrame = state.get("features_df")
    cols = state.get("feature_cols")
    if df is None or not cols:
        raise HTTPException(status_code=400, detail="Run feature extraction first.")
    return df, cols


def _build_trajectories_with_clusters(features_df, obs_df, labels, label_col):
    """Merge cluster labels into trajectories for map display."""
    vid_label = dict(zip(features_df["vehicle_id"].tolist(), labels.tolist()))
    grouped = obs_df.groupby("vehicle_id").apply(
        lambda g: {
            "vehicle_id": g["vehicle_id"].iloc[0],
            "points": g[["latitude", "longitude"]].values.tolist(),
            "timestamps": g["timestamp_utc"].astype(str).tolist(),
            "speeds": g["speed_kmh"].tolist() if "speed_kmh" in g.columns else [],
        }
    )
    result = []
    for vid, traj in grouped.items():
        feat_row = features_df[features_df["vehicle_id"] == vid].iloc[0].to_dict()
        result.append({
            **traj,
            label_col: int(vid_label.get(vid, -1)),
            "path_length_km": feat_row.get("path_length_km"),
            "displacement_km": feat_row.get("displacement_km"),
            "duration_seconds": feat_row.get("duration_seconds"),
            "mean_speed_kmh": feat_row.get("mean_speed_kmh"),
            "point_count": feat_row.get("point_count"),
        })
    return result


@router.post("/train")
def train_model(params: TrainRequest):
    features_df, feat_cols = _get_features()
    obs_df: pd.DataFrame = state.get("preprocessed_df")
    algo = params.algorithm.lower()
    response = {}

    if algo in ("kmeans", "both"):
        kp = params.kmeans or KMeansParams()
        km, scaler_km, labels_km, metrics_km = train_kmeans(
            features_df, feat_cols, kp.n_clusters, kp.random_state
        )
        state.update({
            "model_kmeans": km,
            "scaler": scaler_km,
            "kmeans_labels": labels_km,
            "kmeans_metrics": metrics_km,
        })
        trajs_km = _build_trajectories_with_clusters(features_df, obs_df, labels_km, "kmeans_cluster")
        state.set("trajectories_kmeans", trajs_km)
        response["kmeans"] = {"metrics": metrics_km}

    if algo in ("dbscan", "both"):
        dp = params.dbscan or DBSCANParams()
        db, scaler_db, labels_db, metrics_db = train_dbscan(
            features_df, feat_cols, dp.eps, dp.min_samples
        )
        state.update({
            "model_dbscan": db,
            "dbscan_scaler": scaler_db,
            "dbscan_labels": labels_db,
            "dbscan_metrics": metrics_db,
        })
        trajs_db = _build_trajectories_with_clusters(features_df, obs_df, labels_db, "dbscan_cluster")
        state.set("trajectories_dbscan", trajs_db)
        response["dbscan"] = {"metrics": metrics_db}

    if algo == "both":
        comparison = compare_algorithms(
            state.get("kmeans_metrics"), state.get("dbscan_metrics")
        )
        state.set("comparison_metrics", comparison)
        response["comparison"] = comparison

    return {"message": "Training complete.", **response}


@router.post("/compare")
def compare_models():
    km_m = state.get("kmeans_metrics")
    db_m = state.get("dbscan_metrics")
    if not km_m or not db_m:
        raise HTTPException(status_code=400, detail="Train both K-Means and DBSCAN first.")
    comparison = compare_algorithms(km_m, db_m)
    state.set("comparison_metrics", comparison)
    return comparison


@router.post("/cluster")
def cluster_new(file_or_stored: str = "stored"):
    """Assign clusters to the already-extracted features (re-use stored or bundled models)."""
    features_df, feat_cols = _get_features()
    obs_df = state.get("preprocessed_df")
    result = {}

    km = state.get("model_kmeans")
    scaler_km = state.get("scaler")
    if km is None or scaler_km is None:
        km, scaler_km = load_kmeans_artifacts()
        if km and scaler_km:
            state.set("model_kmeans", km)
            state.set("scaler", scaler_km)

    if km and scaler_km:
        labels = predict_kmeans(features_df, feat_cols, km, scaler_km)
        state.set("kmeans_labels", labels)
        trajs = _build_trajectories_with_clusters(features_df, obs_df, labels, "kmeans_cluster")
        state.set("trajectories_kmeans", trajs)
        result["kmeans_labels"] = labels.tolist()

    db = state.get("model_dbscan")
    scaler_db = state.get("dbscan_scaler")
    if db is None or scaler_db is None:
        db, scaler_db = load_dbscan_artifacts()
        if db and scaler_db:
            state.set("model_dbscan", db)
            state.set("dbscan_scaler", scaler_db)

    if db and scaler_db:
        labels = assign_dbscan(features_df, feat_cols, db, scaler_db)
        state.set("dbscan_labels", labels)
        trajs = _build_trajectories_with_clusters(features_df, obs_df, labels, "dbscan_cluster")
        state.set("trajectories_dbscan", trajs)
        result["dbscan_labels"] = labels.tolist()

    return {"message": "Cluster assignment complete.", **result}
